const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

function requireRole(auth, roles) {
  if (!auth) throw new HttpsError('unauthenticated', 'You must be signed in.');
  if (!roles.includes(auth.token.role)) throw new HttpsError('permission-denied', 'You do not have permission for this action.');
}

function positiveNumber(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new HttpsError('invalid-argument', `${label} must be greater than zero.`);
  return n;
}
function nonNegativeNumber(value, label) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) throw new HttpsError('invalid-argument', `${label} must be a valid non-negative number.`);
  return n;
}

async function generatePurchaseNo(db) {
  const year = new Date().getFullYear();
  const counterRef = db.collection('counters').doc(`purchases_${year}`);
  return db.runTransaction(async (t) => {
    const snap = await t.get(counterRef);
    const next = (snap.exists ? snap.data().count : 0) + 1;
    t.set(counterRef, { count: next }, { merge: true });
    return `PUR-${year}-${String(next).padStart(5, '0')}`;
  });
}

/** data: { supplier_id, items: [{fabric_id, yards, cost_per_yard}], transport_cost, other_costs } */
const recordPurchase = onCall(async (request) => {
  requireRole(request.auth, ['owner', 'manager', 'store_keeper']);
  const { supplier_id, items, transport_cost = 0, other_costs = 0 } = request.data || {};
  const uid = request.auth.uid;

  if (typeof supplier_id !== 'string' || !supplier_id.trim()) throw new HttpsError('invalid-argument', 'Supplier is required.');
  if (!Array.isArray(items) || items.length === 0) throw new HttpsError('invalid-argument', 'Purchase must contain at least one item.');

  const normalizedItems = items.map((item, index) => ({
    fabric_id: typeof item?.fabric_id === 'string' ? item.fabric_id.trim() : '',
    yards: positiveNumber(item?.yards, `Item ${index + 1} yards`),
    cost_per_yard: nonNegativeNumber(item?.cost_per_yard, `Item ${index + 1} cost per yard`),
  }));
  if (normalizedItems.some((item) => !item.fabric_id)) throw new HttpsError('invalid-argument', 'Every purchase item must have a valid material.');
  const transportCost = nonNegativeNumber(transport_cost, 'Transport cost');
  const otherCosts = nonNegativeNumber(other_costs, 'Other costs');

  const db = getFirestore();
  const purchaseNo = await generatePurchaseNo(db);

  return db.runTransaction(async (t) => {
    const supplierRef = db.collection('suppliers').doc(supplier_id);
    const supplierSnap = await t.get(supplierRef);
    if (!supplierSnap.exists) throw new HttpsError('not-found', 'Supplier not found.');

    const fabricRefs = normalizedItems.map((i) => db.collection('fabrics').doc(i.fabric_id));
    const fabricSnaps = await Promise.all(fabricRefs.map((ref) => t.get(ref)));
    let itemsTotal = 0;
    const purchaseItems = [];

    fabricSnaps.forEach((snap, idx) => {
      if (!snap.exists) throw new HttpsError('not-found', `Material ${normalizedItems[idx].fabric_id} not found.`);
      const data = snap.data();
      const item = normalizedItems[idx];
      const amount = item.yards * item.cost_per_yard;
      itemsTotal += amount;
      purchaseItems.push({
        fabric_id: item.fabric_id,
        fabric_name: data.name,
        material_type: data.material_type || null,
        color_number: data.color_number || null,
        color: data.color || null,
        yards: item.yards,
        cost_per_yard: item.cost_per_yard,
        amount,
      });
    });

    const totalCost = itemsTotal + transportCost + otherCosts;
    const purchaseRef = db.collection('purchases').doc();
    t.set(purchaseRef, {
      purchase_no: purchaseNo,
      supplier_id,
      supplier_name: supplierSnap.data().name,
      transport_cost: transportCost,
      other_costs: otherCosts,
      total_cost: totalCost,
      received_by: uid,
      created_at: FieldValue.serverTimestamp(),
    });

    purchaseItems.forEach((item, idx) => {
      t.set(purchaseRef.collection('items').doc(), item);
      t.update(fabricRefs[idx], {
        remaining_yards: FieldValue.increment(item.yards),
        total_yards_purchased: FieldValue.increment(item.yards),
        purchase_price_yard: item.cost_per_yard,
        updated_at: FieldValue.serverTimestamp(),
      });
      t.set(fabricRefs[idx].collection('stock_movements').doc(), {
        movement_type: 'purchase_in',
        yards: item.yards,
        reference_id: purchaseRef.id,
        note: `Received from ${supplierSnap.data().name}`,
        created_by: uid,
        created_at: FieldValue.serverTimestamp(),
      });
    });

    t.set(db.collection('audit_logs').doc(), {
      user_id: uid,
      action: 'recorded purchase',
      table_name: 'purchases',
      record_id: purchaseRef.id,
      details: { purchaseNo, totalCost },
      created_at: FieldValue.serverTimestamp(),
    });

    return { purchase_id: purchaseRef.id, purchase_no: purchaseNo, total_cost: totalCost };
  });
});

module.exports = { recordPurchase };
