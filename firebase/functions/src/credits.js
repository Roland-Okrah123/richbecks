const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

function requireRole(auth, roles) {
  if (!auth) throw new HttpsError('unauthenticated', 'You must be signed in.');
  if (!roles.includes(auth.token.role)) {
    throw new HttpsError('permission-denied', 'You do not have permission for this action.');
  }
}

/**
 * recordCreditPayment — customer pays down an outstanding credit balance.
 * data: { credit_id, amount, payment_method }
 */
const recordCreditPayment = onCall(async (request) => {
  requireRole(request.auth, ['owner', 'manager', 'cashier', 'accountant']);
  const { credit_id, amount, payment_method } = request.data;
  const uid = request.auth.uid;
  const db = getFirestore();

  if (!amount || amount <= 0) {
    throw new HttpsError('invalid-argument', 'Payment amount must be greater than zero.');
  }

  const result = await db.runTransaction(async (t) => {
    const creditRef = db.collection('credits').doc(credit_id);
    const creditSnap = await t.get(creditRef);
    if (!creditSnap.exists) throw new HttpsError('not-found', 'Credit record not found');
    const credit = creditSnap.data();

    const customerRef = db.collection('customers').doc(credit.customer_id);
    const customerSnap = await t.get(customerRef);

    const newOwed = Math.max(0, credit.amount_owed - amount);
    const newStatus = newOwed === 0 ? 'cleared' : credit.status;

    t.update(creditRef, { amount_owed: newOwed, status: newStatus });

    t.set(creditRef.collection('payments').doc(), {
      amount,
      payment_method,
      received_by: uid,
      created_at: FieldValue.serverTimestamp(),
    });

    if (customerSnap.exists) {
      t.update(customerRef, { credit_balance: FieldValue.increment(-amount) });
    }

    t.set(db.collection('audit_logs').doc(), {
      user_id: uid,
      action: 'recorded credit payment',
      table_name: 'credits',
      record_id: credit_id,
      details: { amount },
      created_at: FieldValue.serverTimestamp(),
    });

    return { new_balance: newOwed, status: newStatus };
  });

  return result;
});

module.exports = { recordCreditPayment };
