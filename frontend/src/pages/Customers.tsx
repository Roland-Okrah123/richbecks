import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listCustomers, createCustomer } from '../api/firestore';
import { Customer } from '../types';
import { Plus, X, Search } from 'lucide-react';

const fmt = (n: number) => `GH₵ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Customers() {
  const [params] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState(params.get('q') || '');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function refresh() {
    setLoading(true);
    listCustomers()
      .then((r) => setCustomers(r as Customer[]))
      .catch(() => setError('Could not load customers. Check your connection and try again.'))
      .finally(() => setLoading(false));
  }
  useEffect(refresh, []);

  const filtered = customers.filter(
    (c) => c.name?.toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search)
  );

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createCustomer(form);
      setShowForm(false);
      setForm({ name: '', phone: '', address: '' });
      refresh();
    } catch (err: any) {
      setError(err.message || 'Could not add customer');
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2.5 border w-full sm:w-80">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer..." className="outline-none text-sm flex-1 min-w-0" />
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg px-4 py-2.5 text-sm active:scale-95 transition-transform shrink-0">
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {loading && <p className="text-gray-400 text-sm">Loading customers…</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <div key={c.id} className="rb-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full bg-charcoal text-gold flex items-center justify-center font-semibold shrink-0">
                {c.name?.[0] || '?'}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-charcoal truncate">{c.name}</div>
                <div className="text-xs text-gray-400">{c.phone || 'No phone'}</div>
              </div>
            </div>
            <div className="flex justify-between text-sm border-t pt-3">
              <div>
                <div className="text-xs text-gray-400">Total Spent</div>
                <div className="font-semibold text-charcoal">{fmt(c.total_spent)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Credit Balance</div>
                <div className={`font-semibold ${c.credit_balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{fmt(c.credit_balance)}</div>
              </div>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && <p className="text-gray-400 text-sm col-span-full text-center py-10">No customers yet.</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl p-6 w-full sm:max-w-sm relative">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-gray-400 p-1"><X size={18} /></button>
            <h3 className="font-display font-bold text-charcoal mb-4">Add Customer</h3>
            <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-sm mb-3" />
            <input placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-sm mb-3" />
            <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-sm mb-4" />
            {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
            <button onClick={save} disabled={saving || !form.name} className="w-full bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg py-3 sm:py-2.5 disabled:opacity-50 active:scale-95 transition-transform">
              {saving ? 'Saving…' : 'Add Customer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
