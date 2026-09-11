import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, query, orderBy, where, limit, onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { callRichBecksApi } from './richbecksApi';

// ---------- Generic helpers ----------
export function subscribeCollection(path: string, cb: (rows: any[]) => void, constraints: any[] = []) {
  const q = query(collection(db, path), ...constraints);
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error(`Subscription error on ${path}:`, err.message)
  );
}

export async function getAll(path: string, constraints: any[] = []) {
  const q = query(collection(db, path), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getOne(path: string, id: string) {
  const snap = await getDoc(doc(db, path, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ---------- Fabrics ----------
export const listFabrics = () => getAll('fabrics', [where('is_active', '==', true), orderBy('created_at', 'desc')]);
export const subscribeFabrics = (cb: (rows: any[]) => void) =>
  subscribeCollection('fabrics', cb, [where('is_active', '==', true), orderBy('created_at', 'desc')]);
export const createFabric = (data: any) =>
  addDoc(collection(db, 'fabrics'), {
    ...data,
    remaining_yards: data.total_yards_purchased,
    is_active: true,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
export const updateFabric = (id: string, data: any) =>
  updateDoc(doc(db, 'fabrics', id), { ...data, updated_at: serverTimestamp() });
export const listCategories = () => getAll('categories', [orderBy('name')]);

// ---------- Customers ----------
export const listCustomers = () => getAll('customers', [orderBy('created_at', 'desc')]);
export const subscribeCustomers = (cb: (rows: any[]) => void) =>
  subscribeCollection('customers', cb, [orderBy('created_at', 'desc')]);
export const createCustomer = (data: any) =>
  addDoc(collection(db, 'customers'), {
    ...data,
    total_spent: 0,
    credit_balance: 0,
    is_frequent: false,
    created_at: serverTimestamp(),
  });
export const updateCustomer = (id: string, data: any) => updateDoc(doc(db, 'customers', id), data);

// ---------- Suppliers ----------
export const listSuppliers = () => getAll('suppliers', [orderBy('created_at', 'desc')]);
export const createSupplier = (data: any) =>
  addDoc(collection(db, 'suppliers'), { ...data, amount_owed: 0, created_at: serverTimestamp() });
export const updateSupplier = (id: string, data: any) => updateDoc(doc(db, 'suppliers', id), data);

// ---------- Sales ----------
export const listSales = () => getAll('sales', [orderBy('created_at', 'desc'), limit(200)]);
export const subscribeSales = (cb: (rows: any[]) => void) =>
  subscribeCollection('sales', cb, [orderBy('created_at', 'desc'), limit(200)]);
export const getSaleWithItems = async (saleId: string) => {
  const sale = await getOne('sales', saleId);
  const items = await getAll(`sales/${saleId}/items`);
  return { ...sale, items };
};

// ---------- Expenses ----------
export const listExpenses = () => getAll('expenses', [orderBy('created_at', 'desc')]);
export const subscribeExpenses = (cb: (rows: any[]) => void) =>
  subscribeCollection('expenses', cb, [orderBy('created_at', 'desc')]);
export const createExpense = (data: any) =>
  addDoc(collection(db, 'expenses'), { ...data, created_at: serverTimestamp() });

// ---------- Credits ----------
export const listCredits = () => getAll('credits', [orderBy('created_at', 'desc')]);
export const subscribeCredits = (cb: (rows: any[]) => void) =>
  subscribeCollection('credits', cb, [orderBy('created_at', 'desc')]);

// ---------- Returns ----------
export const listReturns = () => getAll('returns', [orderBy('created_at', 'desc')]);

// ---------- Dashboard ----------
export const subscribeDashboardStats = (cb: (row: any) => void) =>
  onSnapshot(
    doc(db, 'dashboard_stats', 'summary'),
    (snap) => cb(snap.exists() ? snap.data() : null),
    (err) => { console.error('Dashboard stats subscription error:', err.message); cb(null); }
  );

// ---------- RichBecks API ----------
export const createSaleFn = (data: any) =>
  callRichBecksApi('/api/create-sale', data);

export const recordPurchaseFn = (data: any) =>
  callRichBecksApi('/api/record-purchase', data);

export const recordCreditPaymentFn = (data: any) =>
  callRichBecksApi('/api/record-credit-payment', data);

export const processReturnFn = (data: any) =>
  callRichBecksApi('/api/process-return', data);

export const createStaffUserFn = (data: any) =>
  callRichBecksApi('/api/create-staff-user', data);

export const setUserStatusFn = (data: any) =>
  callRichBecksApi('/api/set-user-status', data);

