/**
 * Seeds the LOCAL Firebase emulators with reference data, a sample owner
 * account, and a few sample fabrics/customers/suppliers — so you can click
 * around the whole app before touching your real Firebase project.
 *
 * Run this only while `firebase emulators:start` is already running
 * (see README: "Local development with emulators").
 *
 *   node seed-emulator.js
 */
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'richbecks-enterprise' });
const db = admin.firestore();
const auth = admin.auth();

async function seed() {
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

  // Owner account
  const ownerEmail = 'owner@richbecks.test';
  const ownerPassword = 'password123';
  let owner;
  try {
    owner = await auth.createUser({ email: ownerEmail, password: ownerPassword, displayName: 'Richbeck Owner' });
  } catch {
    owner = await auth.getUserByEmail(ownerEmail);
  }
  await auth.setCustomUserClaims(owner.uid, { role: 'owner' });
  await db.collection('users').doc(owner.uid).set({
    full_name: 'Richbeck Owner', username: 'richbeck', email: ownerEmail, phone: '0243262888',
    role: 'owner', is_active: true, branch_id: 1,
    created_at: admin.firestore.FieldValue.serverTimestamp(), last_login: null,
  });

  // Sample supplier
  const supplierRef = await db.collection('suppliers').add({
    name: 'Accra Textiles Ltd', phone: '0501234567', location: 'Accra',
    materials_supplied: 'Ankara, Lace', amount_owed: 0, created_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Sample fabrics
  const catSnap = await db.collection('categories').doc('ankara').get();
  const fabricSamples = [
    { name: 'Ankara Premium (Gold)', color: 'Gold', purchase_price_yard: 12, selling_price_yard: 18, total_yards_purchased: 500, minimum_stock_level: 30 },
    { name: 'Lace Flower (White)', color: 'White', purchase_price_yard: 22, selling_price_yard: 35, total_yards_purchased: 200, minimum_stock_level: 40 },
    { name: 'Kente Royal (Multi)', color: 'Multi', purchase_price_yard: 28, selling_price_yard: 42, total_yards_purchased: 150, minimum_stock_level: 20 },
  ];
  for (const f of fabricSamples) {
    await db.collection('fabrics').add({
      ...f, category_id: 'ankara', category_name: catSnap.data()?.name || 'Ankara',
      supplier_id: supplierRef.id, remaining_yards: f.total_yards_purchased,
      is_active: true, created_at: admin.firestore.FieldValue.serverTimestamp(), updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Sample customer
  await db.collection('customers').add({
    name: 'Ama Johnson', phone: '0551234567', address: 'Sunyani', total_spent: 0, credit_balance: 0,
    is_frequent: false, created_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('Emulator seed complete.');
  console.log(`Log in with: ${ownerEmail} / ${ownerPassword}`);
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
