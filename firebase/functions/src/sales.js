const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');

const PAYMENT_METHODS = ['cash', 'mtn_momo', 'vodafone_cash', 'airteltigo_money', 'bank'];

function requireRole(auth, roles) {
  if (!auth) throw new HttpsError('unauthenticated', 'You must be signed in.');
  if (!roles.includes(auth.token.role)) {
    throw new HttpsError('permission-denied', 'You do not have permission for this action.');
  }
}

function positiveNumber(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new HttpsError('invalid-argument', `${label} must be greater than zero.`);
  }
  return n;
}

function nonNegativeNumber(value, label) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) {
    throw new HttpsError('invalid-argument', `${label} must be a valid non-negative number.`);
  }
  return n;
}

async function generateInvoiceNo(db) {
  const year = new Date().getFullYear();
  const counterRef = db.collection('counters').doc(`invoices_${year}`);
  return db.runTransaction(async (t) => {
    const counter = await t.get(counterRef);
    const next = (counter.exists ? counter.data().count : 0) + 1;
    t.set(counterRef, { count: next }, { merge: true });
    return `INV-${year}-${String(next).padStart(5, '0')}`;
  });
}

/**
 * createSale — atomic POS checkout.
 * The database is authoritative for selling prices and material metadata.
 * data: { customer_id?, items: [{fabric_id, yards}], discount, amount_paid,
 *         payment_method, due_date? }
 */
const createSale = onCall(async (request) => {
  requireRole(request.auth, ['owner', 'manager', 'cashier']);
  const { customer_id, items, discount = 0, amount_paid, payment_method, due_date } = request.data || {};
  const uid = request.auth.uid;

  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpsError('invalid-argument', 'Sale must contain at least one item.');
  }
  if (items.length > 100) {
    throw new HttpsError('invalid-argument', 'A sale cannot contain more than 100 line items.');
  }
  if (!PAYMENT_METHODS.includes(payment_method)) {
    throw new HttpsError('invalid-argument', 'Invalid payment method.');
  }

  const normalizedItems = items.map((item, index) => ({
    fabric_id: typeof item?.fabric_id === 'string' ? item.fabric_id.trim() : '',
    yards: positiveNumber(item?.yards, `Item ${index + 1} quantity in yards`),
  }));
  if (normalizedItems.some((item) => !item.fabric_id)) {
    throw new HttpsError('invalid-argument', 'Every sale item must have a valid material.');
  }

  const discountAmount = nonNegativeNumber(discount, 'Discount');
  const db = getFirestore();
  const invoiceNo = await generateInvoiceNo(db);

  const result = await db.runTransaction(async (t) => {
    const fabricRefs = normalizedItems.map((i) => db.collection('fabrics').doc(i.fabric_id));
    const fabricSnaps = await Promise.all(fabricRefs.map((ref) => t.get(ref)));

    let customerSnap = null;
    const customerRef = customer_id ? db.collection('customers').doc(customer_id) : null;
    if (customerRef) {
      customerSnap = await t.get(customerRef);
      if (!customerSnap.exists) throw new HttpsError('not-found', 'Customer not found.');
    }

    let subtotal = 0;
    const saleItems = [];

    fabricSnaps.forEach((snap, idx) => {
      if (!snap.exists) throw new HttpsError('not-found', `Material ${normalizedItems[idx].fabric_id} not found.`);
      const data = snap.data();
      const yards = normalizedItems[idx].yards;
      const remainingYards = Number(data.remaining_yards || 0);
      const pricePerYard = nonNegativeNumber(data.selling_price_yard, `Selling price for ${data.name}`);

      if (remainingYards < yards) {
        throw new HttpsError('failed-precondition', `Insufficient stock for ${data.name}. Available: ${remainingYards} yards.`);
      }
      if (pricePerYard <= 0) {
        throw new HttpsError('failed-precondition', `${data.name} does not have a valid selling price per yard.`);
      }

      const amount = yards * pricePerYard;
      subtotal += amount;
      saleItems.push({
        fabric_id: normalizedItems[idx].fabric_id,
        fabric_name: data.name,
        material_type: data.material_type || null,
        color_number: data.color_number || null,
        color: data.color || null,
        yards,
        price_per_yard: pricePerYard,
        amount,
      });
    });

    if (discountAmount > subtotal) {
      throw new HttpsError('invalid-argument', 'Discount cannot be greater than the subtotal.');
    }

    const total = subtotal - discountAmount;
    const paid = amount_paid == null ? total : nonNegativeNumber(amount_paid, 'Amount paid');
    const balanceDue = Math.max(0, total - paid);
    const change = Math.max(0, paid - total);
    const paymentStatus = balanceDue <= 0 ? 'paid' : paid > 0 ? 'partial' : 'credit';

    if (balanceDue > 0 && !customerRef) {
      throw new HttpsError('failed-precondition', 'A customer is required when a sale has an outstanding balance.');
    }

    const saleRef = db.collection('sales').doc();
    t.set(saleRef, {
      invoice_no: invoiceNo,
      customer_id: customer_id || null,
      customer_name: customerSnap?.exists ? customerSnap.data().name : null,
      cashier_id: uid,
      cashier_name: request.auth.token.name || null,
      branch_id: 1,
      subtotal,
      discount: discountAmount,
      total,
      amount_paid: paid,
      balance_due: balanceDue,
      change_amount: change,
      payment_method,
      payment_status: paymentStatus,
      sale_status: 'completed',
      created_at: FieldValue.serverTimestamp(),
    });

    saleItems.forEach((item, idx) => {
      t.set(saleRef.collection('items').doc(), item);
      t.update(fabricRefs[idx], {
        remaining_yards: FieldValue.increment(-item.yards),
        updated_at: FieldValue.serverTimestamp(),
      });
      t.set(fabricRefs[idx].collection('stock_movements').doc(), {
        movement_type: 'sale_out',
        yards: item.yards,
        reference_id: saleRef.id,
        note: 'Sold via POS',
        created_by: uid,
        created_at: FieldValue.serverTimestamp(),
      });
    });

    if (balanceDue > 0 && customer_id) {
      const creditRef = db.collection('credits').doc();
      t.set(creditRef, {
        customer_id,
        customer_name: customerSnap?.exists ? customerSnap.data().name : null,
        sale_id: saleRef.id,
        amount_owed: balanceDue,
        date_borrowed: Timestamp.now(),
        due_date: due_date ? Timestamp.fromDate(new Date(due_date)) : null,
        status: 'on_track',
        created_at: FieldValue.serverTimestamp(),
      });
    }

    if (customerRef) {
      t.update(customerRef, {
        total_spent: FieldValue.increment(total),
        credit_balance: FieldValue.increment(balanceDue),
      });
    }

    t.set(db.collection('audit_logs').doc(), {
      user_id: uid,
      action: 'created sale',
      table_name: 'sales',
      record_id: saleRef.id,
      details: { invoiceNo, total, yards: saleItems.reduce((sum, item) => sum + item.yards, 0) },
      created_at: FieldValue.serverTimestamp(),
    });

    return {
      sale_id: saleRef.id,
      invoice_no: invoiceNo,
      subtotal,
      discount: discountAmount,
      total,
      amount_paid: paid,
      balance_due: balanceDue,
      change,
      payment_method,
      payment_status: paymentStatus,
      items: saleItems,
      created_at: new Date().toISOString(),
    };
  });

  return result;
});

module.exports = { createSale };
