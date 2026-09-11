import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listSuppliers, createSupplier } from '../api/firestore';
import { Supplier } from '../types';
import { Plus, X, Search, Phone, MapPin } from 'lucide-react';

const fmt = (n: number) => `GH₵ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Suppliers() {
  const [params] = useSearchParams();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState(params.get('q') || '');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', location: '', materials_supplied: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function refresh() {
    setLoading(true);
    listSuppliers()
      .then((r) => setSuppliers(r as Supplier[]))
      .catch(() => setError('Could not load suppliers. Check your connection and try again.'))
      .finally(() => setLoading(false));
  }
  useEffect(refresh, []);

  const filtered = suppliers.filter((s) => s.name?.toLowerCase().includes(search.toLowerCase()));

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createSupplier(form);
      setShowForm(false);
      setForm({ name: '', phone: '', location: '', materials_supplied: '' });
      refresh();
    } catch (err: any) {
      setError(err.message || 'Could not add supplier');
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2.5 border w-full sm:w-80">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search supplier..." className="outline-none text-sm flex-1 min-w-0" />
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg px-4 py-2.5 text-sm active:scale-95 transition-transform shrink-0">
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {loading && <p className="text-gray-400 text-sm">Loading suppliers…</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <div key={s.id} className="rb-card">
            <div className="font-semibold text-charcoal mb-1 truncate">{s.name}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Phone size={12} className="shrink-0" /> {s.phone || '—'}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1 mb-3"><MapPin size={12} className="shrink-0" /> <span className="truncate">{s.location || '—'}</span></div>
            <div className="text-xs text-gray-400 mb-2">{s.materials_supplied || 'Materials not specified'}</div>
            <div className="border-t pt-2 flex justify-between text-sm">
              <span className="text-gray-400 text-xs">Amount Owed</span>
              <span className={`font-semibold ${s.amount_owed > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{fmt(s.amount_owed)}</span>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && <p className="text-gray-400 text-sm col-span-full text-center py-10">No suppliers yet.</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl p-6 w-full sm:max-w-sm relative">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-gray-400 p-1"><X size={18} /></button>
            <h3 className="font-display font-bold text-charcoal mb-4">Add Supplier</h3>
            <input placeholder="Supplier name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-sm mb-3" />
            <input placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-sm mb-3" />
            <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-sm mb-3" />
            <input placeholder="Materials supplied" value={form.materials_supplied} onChange={(e) => setForm({ ...form, materials_supplied: e.target.value })} className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-sm mb-4" />
            {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
            <button onClick={save} disabled={saving || !form.name} className="w-full bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg py-3 sm:py-2.5 disabled:opacity-50 active:scale-95 transition-transform">
              {saving ? 'Saving…' : 'Add Supplier'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
