import { useEffect, useState } from 'react';
import { listCredits, recordCreditPaymentFn } from '../api/firestore';
import { Credit } from '../types';
import { X } from 'lucide-react';

const fmt = (n: number) => `GH₵ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function statusBadge(status: string) {
  const map: Record<string, string> = {
    on_track: 'bg-emerald-50 text-emerald-600',
    due_soon: 'bg-amber-50 text-amber-600',
    overdue: 'bg-red-50 text-red-500',
    cleared: 'bg-gray-100 text-gray-500',
  };
  return map[status] || 'bg-gray-100 text-gray-500';
}

export default function CreditManagement() {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [paying, setPaying] = useState<Credit | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [payError, setPayError] = useState('');

  function refresh() {
    setLoading(true);
    listCredits()
      .then((r) => setCredits(r as Credit[]))
      .catch(() => setLoadError('Could not load credit records. Check your connection and try again.'))
      .finally(() => setLoading(false));
  }
  useEffect(refresh, []);

  const totalOwed = credits.filter((c) => c.status !== 'cleared').reduce((s, c) => s + c.amount_owed, 0);
  const parsedAmount = parseFloat(amount);
  const amountValid = !isNaN(parsedAmount) && parsedAmount > 0;

  async function submitPayment() {
    if (!paying || !amountValid) return;
    setBusy(true);
    setPayError('');
    try {
      await recordCreditPaymentFn({ credit_id: paying.id, amount: parsedAmount, payment_method: method });
      setPaying(null);
      setAmount('');
      refresh();
    } catch (err: any) {
      setPayError(err.message || 'Could not record payment');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rb-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="text-xs text-gray-400">Total Outstanding Credit</div>
          <div className="text-2xl font-display font-bold text-red-500">{fmt(totalOwed)}</div>
        </div>
      </div>

      {loadError && <p className="text-red-500 text-sm">{loadError}</p>}
      {loading && <p className="text-gray-400 text-sm">Loading credit records…</p>}

      <div className="rb-card overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="text-left text-gray-400 text-xs uppercase border-b">
              <th className="pb-3">Customer</th>
              <th className="pb-3">Amount Owed</th>
              <th className="pb-3">Due Date</th>
              <th className="pb-3">Status</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody>
            {credits.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="py-3 font-medium text-charcoal">{c.customer_name || '—'}</td>
                <td className="py-3">{fmt(c.amount_owed)}</td>
                <td className="py-3 text-gray-500">
                  {c.due_date?.toDate ? c.due_date.toDate().toLocaleDateString('en-GB') : '—'}
                </td>
                <td className="py-3"><span className={`text-xs px-2 py-1 rounded-full capitalize ${statusBadge(c.status)}`}>{c.status.replace('_', ' ')}</span></td>
                <td className="py-3 text-right">
                  {c.status !== 'cleared' && (
                    <button onClick={() => { setPaying(c); setPayError(''); setAmount(''); }} className="text-xs text-gold-dark font-medium p-1">Record Payment</button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && credits.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-8">No credit records yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {paying && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl p-6 w-full sm:max-w-sm relative">
            <button onClick={() => setPaying(null)} className="absolute top-4 right-4 text-gray-400 p-1"><X size={18} /></button>
            <h3 className="font-display font-bold text-charcoal mb-1">Record Payment</h3>
            <p className="text-xs text-gray-400 mb-4">{paying.customer_name} owes {fmt(paying.amount_owed)}</p>
            <label className="text-xs font-medium text-gray-500">Amount</label>
            <input type="number" min={0.01} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-sm mt-1 mb-3" />
            <label className="text-xs font-medium text-gray-500">Payment method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full border rounded-lg px-3 py-2.5 sm:py-2 text-sm mt-1 mb-4">
              <option value="cash">Cash</option>
              <option value="mtn_momo">MTN Mobile Money</option>
              <option value="vodafone_cash">Vodafone Cash</option>
              <option value="airteltigo_money">AirtelTigo Money</option>
              <option value="bank">Bank Payment</option>
            </select>
            {payError && <p className="text-red-500 text-xs mb-2">{payError}</p>}
            <button onClick={submitPayment} disabled={busy || !amountValid} className="w-full bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg py-3 sm:py-2.5 disabled:opacity-50 active:scale-95 transition-transform">
              {busy ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
