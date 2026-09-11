import { useEffect, useState } from 'react';
import { listFabrics, listReturns, processReturnFn } from '../api/firestore';
import { Plus, X } from 'lucide-react';

const fmt = (n: number) => `GH₵ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateOf = (v: any) => (v?.toDate ? v.toDate().toLocaleDateString('en-GB') : '—');

export default function Returns() {
  const [returns, setReturns] = useState<any[]>([]);
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ sale_id: '', fabric_id: '', yards: '', reason: '', refund_amount: '', return_type: 'refund' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function refresh() {
    setLoading(true);
    listReturns()
      .then(setReturns)
      .catch(() => setError('Could not load returns. Check your connection and try again.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
    listFabrics().then(setFabrics).catch(() => setFabrics([]));
  }, []);

  async function submit() {
    if (!form.fabric_id || !form.yards) return;
    setSaving(true);
    setError('');
    try {
      await processReturnFn({
        sale_id: form.sale_id || null,
        fabric_id: form.fabric_id,
        yards: parseFloat(form.yards),
        reason: form.reason,
        refund_amount: parseFloat(form.refund_amount) || 0,
        return_type: form.return_type,
      });
      setShowForm(false);
      setForm({ sale_id: '', fabric_id: '', yards: '', reason: '', refund_amount: '', return_type: 'refund' });
      refresh();
      listFabrics().then(setFabrics).catch(() => {});
    } catch (err: any) {
      setError(err.message || 'Could not process return');
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg px-4 py-2.5 text-sm active:scale-95 transition-transform">
          <Plus size={16} /> Process Return
        </button>
      </div>

      {error && !showForm && <p className="text-red-500 text-sm">{error}</p>}

      <div className="rb-card overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-gray-400 text-xs uppercase border-b">
              <th className="pb-3">Fabric</th>
              <th className="pb-3">Yards</th>
              <th className="pb-3">Type</th>
              <th className="pb-3">Refund</th>
              <th className="pb-3">Reason</th>
              <th className="pb-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-3 font-medium text-charcoal">{r.fabric_name}</td>
                <td className="py-3">{r.yards} yds</td>
                <td className="py-3 capitalize">{r.return_type}</td>
                <td className="py-3">{fmt(r.refund_amount || 0)}</td>
                <td className="py-3 text-gray-500">{r.reason || '—'}</td>
                <td className="py-3 text-gray-500">{dateOf(r.created_at)}</td>
              </tr>
            ))}
            {!loading && returns.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-400 py-8">No returns recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl p-6 w-full sm:max-w-sm relative">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-gray-400 p-1"><X size={18} /></button>
            <h3 className="font-display font-bold text-charcoal mb-4">Process Return / Exchange</h3>

            <label className="text-xs font-medium text-gray-500">Fabric</label>
            <select value={form.fabric_id} onChange={(e) => setForm({ ...form, fabric_id: e.target.value })} className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-sm mt-1 mb-3">
              <option value="">Select fabric...</option>
              {fabrics.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>

            <label className="text-xs font-medium text-gray-500">Yards returned</label>
            <input type="number" value={form.yards} onChange={(e) => setForm({ ...form, yards: e.target.value })} className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-sm mt-1 mb-3" />

            <label className="text-xs font-medium text-gray-500">Type</label>
            <select value={form.return_type} onChange={(e) => setForm({ ...form, return_type: e.target.value })} className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-sm mt-1 mb-3">
              <option value="refund">Refund</option>
              <option value="exchange">Exchange</option>
            </select>

            {form.return_type === 'refund' && (
              <>
                <label className="text-xs font-medium text-gray-500">Refund amount (GH₵)</label>
                <input type="number" value={form.refund_amount} onChange={(e) => setForm({ ...form, refund_amount: e.target.value })} className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-sm mt-1 mb-3" />
              </>
            )}

            <label className="text-xs font-medium text-gray-500">Reason</label>
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-sm mt-1 mb-4" />

            {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
            <button onClick={submit} disabled={saving || !form.fabric_id || !form.yards} className="w-full bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg py-3 sm:py-2.5 disabled:opacity-50 active:scale-95 transition-transform">
              {saving ? 'Saving…' : 'Save Return & Restock'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
