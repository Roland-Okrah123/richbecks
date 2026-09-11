const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const STATS_DOC = 'dashboard_stats/summary';

function isToday(date) {
  const now = new Date();
  return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}
function isThisMonth(date) {
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

// Incrementally bump stats whenever a sale completes
const onSaleCreated = onDocumentCreated('sales/{saleId}', async (event) => {
  const db = getFirestore();
  const sale = event.data.data();
  const created = sale.created_at?.toDate ? sale.created_at.toDate() : new Date();

  const updates = {
    monthly_revenue: FieldValue.increment(isThisMonth(created) ? sale.total : 0),
    last_updated: FieldValue.serverTimestamp(),
  };
  if (isToday(created)) {
    updates.today_sales = FieldValue.increment(sale.total);
  }
  await db.doc(STATS_DOC).set(updates, { merge: true });
});

// Bump expenses this month
const onExpenseCreated = onDocumentCreated('expenses/{expenseId}', async (event) => {
  const db = getFirestore();
  const expense = event.data.data();
  const created = expense.created_at?.toDate ? expense.created_at.toDate() : new Date();
  if (isThisMonth(created)) {
    await db.doc(STATS_DOC).set(
      { expenses_this_month: FieldValue.increment(expense.amount), last_updated: FieldValue.serverTimestamp() },
      { merge: true }
    );
  }
});

/**
 * Full recompute — runs nightly to correct any drift from the incremental
 * triggers above (e.g. resets today_sales at midnight, recalculates
 * inventory value, low-stock count, and outstanding balances from source data).
 */
const recomputeDashboardStats = onSchedule('every day 00:05', async () => {
  const db = getFirestore();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [salesToday, salesMonth, expensesMonth, fabricsSnap, customersSnap, suppliersSnap] = await Promise.all([
    db.collection('sales').where('created_at', '>=', startOfDay).get(),
    db.collection('sales').where('created_at', '>=', startOfMonth).get(),
    db.collection('expenses').where('created_at', '>=', startOfMonth).get(),
    db.collection('fabrics').where('is_active', '==', true).get(),
    db.collection('customers').get(),
    db.collection('suppliers').get(),
  ]);

  const todaySales = salesToday.docs.reduce((sum, d) => sum + (d.data().total || 0), 0);
  const monthlyRevenue = salesMonth.docs.reduce((sum, d) => sum + (d.data().total || 0), 0);
  const expensesThisMonth = expensesMonth.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);

  let inventoryValue = 0;
  let lowStockCount = 0;
  fabricsSnap.docs.forEach((d) => {
    const f = d.data();
    inventoryValue += (f.remaining_yards || 0) * (f.selling_price_yard || 0);
    if ((f.remaining_yards || 0) <= (f.minimum_stock_level || 0)) lowStockCount += 1;
  });

  const customerCreditTotal = customersSnap.docs.reduce((sum, d) => sum + (d.data().credit_balance || 0), 0);
  const supplierBalanceTotal = suppliersSnap.docs.reduce((sum, d) => sum + (d.data().amount_owed || 0), 0);

  // Rough cost-of-goods estimate from sale items would require a full scan;
  // net profit here approximates revenue minus expenses minus estimated COGS
  // margin (~55% of revenue) — refine later with a proper COGS ledger if needed.
  const estimatedCOGS = monthlyRevenue * 0.55;
  const netProfit = monthlyRevenue - estimatedCOGS - expensesThisMonth;

  await db.doc(STATS_DOC).set({
    today_sales: todaySales,
    monthly_revenue: monthlyRevenue,
    expenses_this_month: expensesThisMonth,
    net_profit: netProfit,
    inventory_value: inventoryValue,
    customer_credit_total: customerCreditTotal,
    supplier_balance_total: supplierBalanceTotal,
    low_stock_count: lowStockCount,
    total_fabrics_count: fabricsSnap.size,
    last_updated: FieldValue.serverTimestamp(),
  });
});

module.exports = { onSaleCreated, onExpenseCreated, recomputeDashboardStats };
