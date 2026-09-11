const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const ALLOWED_ROLES = ['owner', 'manager', 'cashier', 'store_keeper', 'accountant'];

function requireRole(auth, roles) {
  if (!auth) throw new HttpsError('unauthenticated', 'You must be signed in.');
  if (!roles.includes(auth.token.role)) {
    throw new HttpsError('permission-denied', 'You do not have permission for this action.');
  }
}

/**
 * Called by an Owner to create a staff account. Creates the Firebase Auth
 * user, sets their role as a custom claim, and writes the users/{uid} doc.
 */
const createStaffUser = onCall(async (request) => {
  requireRole(request.auth, ['owner']);
  const { full_name, username, email, phone, password, role } = request.data;

  if (!ALLOWED_ROLES.includes(role)) {
    throw new HttpsError('invalid-argument', 'Invalid role');
  }

  const auth = getAuth();
  const db = getFirestore();

  const userRecord = await auth.createUser({
    email,
    password,
    displayName: full_name,
  });

  await auth.setCustomUserClaims(userRecord.uid, { role });

  await db.collection('users').doc(userRecord.uid).set({
    full_name,
    username,
    email,
    phone: phone || null,
    role,
    is_active: true,
    branch_id: 1,
    created_at: FieldValue.serverTimestamp(),
    last_login: null,
  });

  await db.collection('audit_logs').add({
    user_id: request.auth.uid,
    action: 'created staff user',
    table_name: 'users',
    record_id: userRecord.uid,
    details: { username, role },
    created_at: FieldValue.serverTimestamp(),
  });

  return { uid: userRecord.uid };
});

/**
 * Owner can activate/deactivate a staff account.
 */
const setUserStatus = onCall(async (request) => {
  requireRole(request.auth, ['owner']);
  const { uid, is_active } = request.data;
  const db = getFirestore();

  await getAuth().updateUser(uid, { disabled: !is_active });
  await db.collection('users').doc(uid).update({ is_active });
  await db.collection('audit_logs').add({
    user_id: request.auth.uid,
    action: 'updated user status',
    table_name: 'users',
    record_id: uid,
    details: { is_active },
    created_at: FieldValue.serverTimestamp(),
  });

  return { message: 'User status updated' };
});

/**
 * Stamps last_login whenever a user doc is first created (bootstrap),
 * and keeps custom claims resilient if a users/{uid} doc is edited manually
 * in the console (owner only, since a client can't reach this without rules).
 */
const onUserDocWritten = onDocumentCreated('users/{uid}', async (event) => {
  const data = event.data.data();
  if (data?.role && ALLOWED_ROLES.includes(data.role)) {
    await getAuth().setCustomUserClaims(event.params.uid, { role: data.role });
  }
});

module.exports = { createStaffUser, setUserStatus, onUserDocWritten };
