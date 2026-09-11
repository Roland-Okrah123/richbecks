const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

function requireRole(auth, roles) {
  if (!auth) throw new HttpsError('unauthenticated', 'You must be signed in.');
  if (!roles.includes(auth.token.role)) {
    throw new HttpsError('permission-denied', 'You do not have permission for this action.');
  }
}

/**
 * processReturn — customer returns fabric; restocks inventory and optionally refunds.
 * data: { sale_id, fabric_id, yards, reason, refund_amount, return_type }
 */
const processReturn = onCall(async (request) => {
  requireRole(request.auth, ['owner', 'manager', 'cashier']);
  const { sale_id, fabric_id, yards, reason, refund_amount = 0, return_type = 'refund' } = request.data;
  const uid = request.auth.uid;
  const yardsNumber = Number(yards);
  if (!Number.isFinite(yardsNumber) || yardsNumber <= 0) throw new HttpsError('invalid-argument', 'Returned yards must be greater than zero.');
  const refundNumber = Number(refund_amount || 0);
  if (!Number.isFinite(refundNumber) || refundNumber < 0) throw new HttpsError('invalid-argument', 'Refund amount must be non-negative.');
  const db = getFirestore();

  const result = await db.runTransaction(async (t) => {
    const fabricRef = db.collection('fabrics').doc(fabric_id);
    const fabricSnap = await t.get(fabricRef);
    if (!fabricSnap.exists) throw new HttpsError('not-found', 'Fabric not found');

    const returnRef = db.collection('returns').doc();
    t.set(returnRef, {
      sale_id,
      fabric_id,
      fabric_name: fabricSnap.data().name,
      material_type: fabricSnap.data().material_type || null,
      color_number: fabricSnap.data().color_number || null,
      color: fabricSnap.data().color || null,
      yards: yardsNumber,
      reason,
      refund_amount: refundNumber,
      return_type,
      processed_by: uid,
      created_at: FieldValue.serverTimestamp(),
    });

    t.update(fabricRef, {
      remaining_yards: FieldValue.increment(yardsNumber),
      updated_at: FieldValue.serverTimestamp(),
    });

    t.set(fabricRef.collection('stock_movements').doc(), {
      movement_type: 'return_in',
      yards: yardsNumber,
      reference_id: returnRef.id,
      note: reason || 'Customer return',
      created_by: uid,
      created_at: FieldValue.serverTimestamp(),
    });

    t.set(db.collection('audit_logs').doc(), {
      user_id: uid,
      action: 'processed return',
      table_name: 'returns',
      record_id: returnRef.id,
      details: { fabric_id, yards: yardsNumber, return_type },
      created_at: FieldValue.serverTimestamp(),
    });

    return { return_id: returnRef.id };
  });

  return result;
});

module.exports = { processReturn };
