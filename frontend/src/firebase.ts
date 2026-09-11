import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Firebase project config — from Firebase Console > Project settings > General > Your apps
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// Set VITE_USE_EMULATORS=true in .env to develop against local Firebase
// emulators instead of your live project (see DEPLOYMENT_GUIDE.md).
let emulatorsConnected = false;
if (import.meta.env.VITE_USE_EMULATORS === 'true' && !emulatorsConnected) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  if (import.meta.env.DEV) {
  connectFunctionsEmulator(
    functions,
    'localhost',
    5001
  );
}
  connectStorageEmulator(storage, 'localhost', 9199);
  emulatorsConnected = true;
  // eslint-disable-next-line no-console
  console.info('[Richbecks] Connected to local Firebase emulators.');
}
