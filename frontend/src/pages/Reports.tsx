import { useEffect, useState } from 'react';
import { listSales, listExpenses, listFabrics, listCustomers, listSuppliers } from '../api/firestore';
import { tableReportPDF } from '../utils/pdf';
import { FileDown, TrendingUp, Boxes, Users, Truck, Receipt } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const fmt = (n: number) => `GH₵ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPlain = (n: number) => `GHC ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateOf = (v: any) => (v?.toDate ? v.toDate().toLocaleDateString('en-GB') : '—');

export default function Reports() {
  const settings = useSettings();
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    listSales().then(setSales).catch(() => {});
    listExpenses().then(setExpenses).catch(() => {});
    listFabrics().then(setFabrics).catch(() => {});
    listCustomers().then(setCustomers).catch(() => {});
    listSuppliers().then(setSuppliers).catch(() => {});
  }, []);

  const totalSales = sales.reduce((s, x) => s + x.total, 0);
  const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);
  const inventoryValue = fabrics.reduce((s, f) => s + f.remaining_yards * f.selling_price_yard, 0);
  const customerDebt = customers.reduce((s, c) => s + c.credit_balance, 0);
  const supplierDebt = suppliers.reduce((s, x) => s + x.amount_owed, 0);

  function exportSales() {
    tableReportPDF({
      title: 'Sales Report',
      subtitle: `${sales.length} transactions`,
      columns: ['Invoice', 'Customer', 'Total', 'Paid', 'Status', 'Date'],
      rows: sales.map((s) => [s.invoice_no, s.customer_name || 'Walk-in', fmtPlain(s.total), fmtPlain(s.amount_paid), s.payment_status, dateOf(s.created_at)]),
      summary: [{ label: 'Total Sales', value: fmtPlain(totalSales) }, { label: 'Transactions', value: String(sales.length) }],
      filename: 'sales-report',
      company: settings,
    });
  }
  function exportExpenses() {
    tableReportPDF({
      title: 'Expense Report',
      subtitle: `${expenses.length} entries`,
      columns: ['Category', 'Description', 'Amount', 'Date'],
      rows: expenses.map((e) => [e.category, e.description || '—', fmtPlain(e.amount), dateOf(e.created_at)]),
      summary: [{ label: 'Total Expenses', value: fmtPlain(totalExpenses) }],
      filename: 'expense-report',
      company: settings,
    });
  }
  function exportInventory() {
    tableReportPDF({
      title: 'Inventory Report',
      subtitle: `${fabrics.length} fabrics`,
      columns: ['Material', 'Type', 'Color / No.', 'Remaining (yds)', 'Cost/yd', 'Sell/yd', 'Stock Value'],
      rows: fabrics.map((f) => [f.name, f.material_type || f.category_name || '—', `${f.color || '—'}${f.color_number ? ` / #${f.color_number}` : ''}`, f.remaining_yards, fmtPlain(f.purchase_price_yard), fmtPlain(f.selling_price_yard), fmtPlain(f.remaining_yards * f.selling_price_yard)]),
      summary: [{ label: 'Total Stock Value', value: fmtPlain(inventoryValue) }],
      filename: 'inventory-report',
      company: settings,
    });
  }
  function exportCustomerDebt() {
    const indebted = customers.filter((c) => c.credit_balance > 0);
    tableReportPDF({
      title: 'Customer Debt Report',
      subtitle: `${indebted.length} customers with outstanding balance`,
      columns: ['Customer', 'Phone', 'Total Spent', 'Credit Balance'],
      rows: indebted.map((c) => [c.name, c.phone || '—', fmtPlain(c.total_spent), fmtPlain(c.credit_balance)]),
      summary: [{ label: 'Total Owed to You', value: fmtPlain(customerDebt) }],
      filename: 'customer-debt-report',
      company: settings,
    });
  }
  function exportSupplierReport() {
    tableReportPDF({
      title: 'Supplier Report',
      subtitle: `${suppliers.length} suppliers`,
      columns: ['Supplier', 'Phone', 'Location', 'Amount Owed'],
      rows: suppliers.map((s) => [s.name, s.phone || '—', s.location || '—', fmtPlain(s.amount_owed)]),
      summary: [{ label: 'Total You Owe', value: fmtPlain(supplierDebt) }],
      filename: 'supplier-report',
      company: settings,
    });
  }

  const cards = [
    { title: 'Sales Report', icon: TrendingUp, value: fmt(totalSales), sub: `${sales.length} transactions`, onExport: exportSales },
    { title: 'Expense Report', icon: Receipt, value: fmt(totalExpenses), sub: `${expenses.length} entries`, onExport: exportExpenses },
    { title: 'Inventory Report', icon: Boxes, value: fmt(inventoryValue), sub: `${fabrics.length} fabrics`, onExport: exportInventory },
    { title: 'Customer Debt Report', icon: Users, value: fmt(customerDebt), sub: `${customers.length} customers`, onExport: exportCustomerDebt },
    { title: 'Supplier Report', icon: Truck, value: fmt(supplierDebt), sub: `${suppliers.length} suppliers`, onExport: exportSupplierReport },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.title} className="rb-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-gold/10 text-gold-dark flex items-center justify-center">
                <c.icon size={17} />
              </div>
              <button onClick={c.onExport} className="text-gray-400 hover:text-gold-dark" title="Export as PDF">
                <FileDown size={16} />
              </button>
            </div>
            <div className="font-semibold text-charcoal">{c.title}</div>
            <div className="text-xl font-display font-bold text-charcoal mt-1">{c.value}</div>
            <div className="text-xs text-gray-400">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="rb-card overflow-x-auto">
        <div className="flex items-center justify-between mb-4 min-w-[480px]">
          <h3 className="font-display font-bold text-charcoal">Recent Sales</h3>
          <button onClick={exportSales} className="flex items-center gap-1.5 text-xs text-gold-dark font-medium">
            <FileDown size={14} /> Export PDF
          </button>
        </div>
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="text-left text-gray-400 text-xs uppercase border-b">
              <th className="pb-3">Invoice</th>
              <th className="pb-3">Customer</th>
              <th className="pb-3">Total</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {sales.slice(0, 15).map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="py-2.5 font-medium text-charcoal">{s.invoice_no}</td>
                <td className="py-2.5 text-gray-500">{s.customer_name || 'Walk-in'}</td>
                <td className="py-2.5">{fmt(s.total)}</td>
                <td className="py-2.5 capitalize">{s.payment_status}</td>
                <td className="py-2.5 text-gray-500">{dateOf(s.created_at)}</td>
              </tr>
            ))}
            {sales.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-8">No sales recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
