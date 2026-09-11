import { useEffect, useMemo, useState } from 'react';
import { listExpenses, createExpense } from '../api/firestore';
import { Expense } from '../types';
import { Plus, X } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const CATEGORIES = ['Rent', 'Salaries', 'Transport', 'Electricity', 'Maintenance', 'Packaging', 'Other'];
const COLORS = ['#d4a537', '#8b6f2f', '#4a4e57', '#c9963e', '#6b6f78', '#e8c565', '#2e3340'];
const fmt = (n: number) => `GH₵ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: 'Rent', description: '', amount: '' });
  const [saving, setSaving] = useState(false);

  function refresh() { listExpenses().then((r) => setExpenses(r as Expense[])).catch(() => {}); }
  useEffect(refresh, []);

  const thisMonth = expenses.filter((e) => {
    const d = e.created_at?.toDate ? e.created_at.toDate() : new Date();
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const total = thisMonth.reduce((s, e) => s + e.amount, 0);
  const byCategory = CATEGORIES.map((cat) => ({
    name: cat,
    value: thisMonth.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.value > 0);

  async function save() {
    setSaving(true);
    try {
      await createExpense({ ...form, amount: parseFloat(form.amount) || 0, expense_date: new Date() });
      setShowForm(false);
      setForm({ category: 'Rent', description: '', amount: '' });
      refresh();
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg px-4 py-2.5 text-sm">
          <Plus size={16} /> Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rb-card">
          <div className="text-xs text-gray-400 mb-1">Total Expenses (This Month)</div>
          <div className="text-2xl font-display font-bold text-charcoal">{fmt(total)}</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65}>
                {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rb-card lg:col-span-2 overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-gray-400 text-xs uppercase border-b">
                <th className="pb-3">Category</th>
                <th className="pb-3">Description</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="py-3 font-medium text-charcoal">{e.category}</td>
                  <td className="py-3 text-gray-500">{e.description || '—'}</td>
                  <td className="py-3">{fmt(e.amount)}</td>
                  <td className="py-3 text-gray-500">
                    {e.created_at?.toDate ? e.created_at.toDate().toLocaleDateString('en-GB') : '—'}
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={4} className="text-center text-gray-400 py-8">No expenses recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl p-6 w-full sm:max-w-sm relative">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-gray-400"><X size={18} /></button>
            <h3 className="font-display font-bold text-charcoal mb-4">Add Expense</h3>
            <label className="text-xs font-medium text-gray-500">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mt-1 mb-3">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="text-xs font-medium text-gray-500">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mt-1 mb-3" />
            <label className="text-xs font-medium text-gray-500">Amount (GH₵)</label>
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm mt-1 mb-4" />
            <button onClick={save} disabled={saving || !form.amount} className="w-full bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg py-2.5 disabled:opacity-50">
              {saving ? 'Saving…' : 'Add Expense'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
