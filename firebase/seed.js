/**
 * One-time setup script — run locally with:
 *   node seed.js
 *
 * Requires a service account key. In Firebase Console:
 *   Project Settings > Service Accounts > Generate new private key
 * Save it as serviceAccountKey.json in this folder (DO NOT commit it).
 *
 * Creates: reference data (categories, branch, settings) and the first
 * Owner account.
 */
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const auth = admin.auth();

async function seed() {
  // ---- reference data ----
  const categories = ['Ankara', 'Lace', 'Kente', 'Cotton', 'Silk', 'Chiffon', 'Linen', 'Velvet'];
  for (const name of categories) {
    await db.collection('categories').doc(name.toLowerCase()).set({ name });
  }

  await db.collection('branches').doc('main').set({
    name: 'Richbecks Enterprise - Main',
    location: 'Poly/Stu Roundabout to VRA Road, Opp. Social Welfare School Main Gate',
    phone: '0243262888',
    is_main: true,
  });

  await db.collection('settings').doc('general').set({
    company_name: 'RICHBECKS Enterprise',
    tagline: 'Managing Fabrics. Growing Business.',
    phone_1: '0243262888',
    phone_2: '0202442373',
    address: 'Poly/Stu Roundabout to VRA Road, Opp. Social Welfare School Main Gate',
    primary_color: '#1a1d24',
    accent_color: '#d4a537',
    currency: 'GHC',
    owner_whatsapp: '', // e.g. 233243262888 — set here or later via the app's Settings page
  });

  // ---- first owner account ----
  const ownerEmail = 'rolandokrah15@gmail.com'; // change before running
  const ownerPassword = 'ChangeMe123!'; // change immediately after first login

  let userRecord;
  try {
    userRecord = await auth.createUser({
      email: ownerEmail,
      password: ownerPassword,
      displayName: 'Richbeck Owner',
    });
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      userRecord = await auth.getUserByEmail(ownerEmail);
    } else {
      throw err;
    }
  }

  await auth.setCustomUserClaims(userRecord.uid, { role: 'owner' });
  await db.collection('users').doc(userRecord.uid).set({
    full_name: 'Richbeck Owner',
    username: 'richbeck',
    email: ownerEmail,
    phone: '0243262888',
    role: 'owner',
    is_active: true,
    branch_id: 1,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    last_login: null,
  });

  console.log('Seed complete.');
  console.log(`Owner login: ${ownerEmail} / ${ownerPassword}`);
  console.log('Log in and change this password immediately.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
