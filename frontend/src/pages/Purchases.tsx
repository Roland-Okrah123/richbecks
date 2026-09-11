import { useEffect, useState } from 'react';
import { listSuppliers, listFabrics, recordPurchaseFn, getAll } from '../api/firestore';
import { Plus, X, Trash2 } from 'lucide-react';

const fmt = (n: number) => `GH₵ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Line {
  fabric_id: string;
  fabric_name: string;
  yards: number | '';
  cost_per_yard: number | '';
}

export default function Purchases() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
 const [transportCost, setTransportCost] = useState<number | ''>('');
const [otherCosts, setOtherCosts] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function refresh() { getAll('purchases').then((r) => setPurchases(r.sort((a: any, b: any) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0)))).catch(() => setError('Could not load purchases.')); }
  useEffect(() => {
    listSuppliers().then(setSuppliers).catch(() => {});
    listFabrics().then(setFabrics).catch(() => {});
    refresh();
  }, []);

  function addLine() {
    if (fabrics.length === 0) return;
    const f = fabrics[0];
    setLines((l) => [...l, { fabric_id: f.id, fabric_name: f.name, yards: 1, cost_per_yard: f.purchase_price_yard }]);
  }
  function updateLine(idx: number, patch: Partial<Line>) {
    setLines((l) => l.map((line, i) => (i === idx ? { ...line, ...patch } : line)));
  }
  function removeLine(idx: number) { setLines((l) => l.filter((_, i) => i !== idx)); }

  const transportValue = transportCost === '' ? 0 : transportCost;
const otherValue = otherCosts === '' ? 0 : otherCosts;

const total =
  lines.reduce(
    (s, l) =>
      s +
      (l.yards === '' ? 0 : l.yards) *
      (l.cost_per_yard === '' ? 0 : l.cost_per_yard),
    0
  ) +
  transportValue +
  otherValue;

  async function submit() {
    if (!supplierId || lines.length === 0) return;
    const invalidLine = lines.some(
  (l) =>
    l.yards === '' ||
    l.yards <= 0 ||
    l.cost_per_yard === '' ||
    l.cost_per_yard < 0
);

if (invalidLine) {
  setError('Enter valid yards and cost for every purchase item.');
  return;
}
    setSaving(true); setError('');
    try {
      await recordPurchaseFn({
        supplier_id: supplierId,
        items: lines.map((l) => ({
  fabric_id: l.fabric_id,
  yards: l.yards === '' ? 0 : l.yards,
  cost_per_yard: l.cost_per_yard === '' ? 0 : l.cost_per_yard,
})),
        transport_cost: transportValue,
other_costs: otherValue,
      });
      setShowForm(false);
      setLines([]);
      setSupplierId('');
      setTransportCost('');
      setOtherCosts('');
      refresh();
      listFabrics().then(setFabrics).catch(() => {});
    } catch (err: any) {
      setError(err.message || 'Could not record purchase');
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg px-4 py-2.5 text-sm">
          <Plus size={16} /> Record Purchase
        </button>
      </div>

      <div className="rb-card overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-gray-400 text-xs uppercase border-b">
              <th className="pb-3">Purchase No.</th>
              <th className="pb-3">Supplier</th>
              <th className="pb-3">Transport</th>
              <th className="pb-3">Other Costs</th>
              <th className="pb-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-3 font-medium text-charcoal">{p.purchase_no}</td>
                <td className="py-3 text-gray-500">{p.supplier_name}</td>
                <td className="py-3">{fmt(p.transport_cost || 0)}</td>
                <td className="py-3">{fmt(p.other_costs || 0)}</td>
                <td className="py-3 font-semibold">{fmt(p.total_cost || 0)}</td>
              </tr>
            ))}
            {purchases.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-8">No purchases recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl p-6 w-full sm:max-w-lg max-h-[92vh] overflow-y-auto relative">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-gray-400"><X size={18} /></button>
            <h3 className="font-display font-bold text-charcoal mb-4">Record New Purchase</h3>

            <label className="text-xs font-medium text-gray-500">Supplier</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1 mb-4">
              <option value="">Select supplier...</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Items</span>
              <button onClick={addLine} className="text-xs text-gold-dark flex items-center gap-1"><Plus size={12} /> Add item</button>
            </div>
            <div className="space-y-2 mb-4">
              {lines.map((l, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 border rounded-lg p-2 sm:border-0 sm:p-0">
                  <select value={l.fabric_id} onChange={(e) => {
                    const f = fabrics.find((x) => x.id === e.target.value);
                    updateLine(idx, { fabric_id: e.target.value, fabric_name: f?.name });
                  }} className="w-full sm:flex-1 sm:w-auto border rounded-lg px-2 py-1.5 text-xs">
                    {fabrics.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <input
  type="number"
  min={0.01}
  step={0.01}
  value={l.yards}
  onChange={(e) =>
    updateLine(idx, {
      yards: e.target.value === '' ? '' : Number(e.target.value),
    })
  }
  className="w-20 sm:w-16 border rounded-lg px-2 py-1.5 text-xs"
  placeholder="Yards"
/>
                  <input
  type="number"
  min={0}
  step={0.01}
  value={l.cost_per_yard}
  onChange={(e) =>
    updateLine(idx, {
      cost_per_yard: e.target.value === '' ? '' : Number(e.target.value),
    })
  }
  className="w-24 sm:w-20 border rounded-lg px-2 py-1.5 text-xs"
  placeholder="Cost/yd"
/>
                  <button onClick={() => removeLine(idx)} className="text-gray-300 hover:text-red-500 ml-auto sm:ml-0 p-1"><Trash2 size={14} /></button>
                </div>
              ))}
              {lines.length === 0 && <p className="text-xs text-gray-400">No items added yet.</p>}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-500">Transport cost</label>
                <input
  type="number"
  min={0}
  step={0.01}
  value={transportCost}
  onChange={(e) =>
    setTransportCost(e.target.value === '' ? '' : Number(e.target.value))
  }
  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Other costs</label>
                <input
  type="number"
  min={0}
  step={0.01}
  value={otherCosts}
  onChange={(e) =>
    setOtherCosts(e.target.value === '' ? '' : Number(e.target.value))
  }
  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
/>
              </div>
            </div>

            <div className="flex justify-between font-bold text-charcoal border-t pt-3 mb-4">
              <span>Total Cost</span><span>{fmt(total)}</span>
            </div>

            {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
            <button onClick={submit} disabled={saving || !supplierId || lines.length === 0} className="w-full bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg py-2.5 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Purchase & Update Stock'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
