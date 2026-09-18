import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StatCard from '../components/StatCard';
import { subscribeDashboardStats, listSales, listFabrics } from '../api/firestore';
import { DashboardStats, Sale, Fabric } from '../types';
import {
  DollarSign, TrendingUp, Wallet, Receipt, Boxes, Users, Truck, AlertTriangle, Sparkles,
} from 'lucide-react';

const COLORS = ['#d4a537', '#8b6f2f', '#4a4e57', '#c9963e', '#6b6f78', '#e8c565'];
const fmt = (n: number) => `GH₵ ${n?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? 0}`;

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);

  useEffect(() => {
    const unsub = subscribeDashboardStats((row) => setStats(row));
    listSales().then((rows) => setSales(rows as Sale[])).catch(() => {});
    listFabrics().then((rows) => setFabrics(rows as Fabric[])).catch(() => {});
    return unsub;
  }, []);

  // Build a simple last-30-day trend from sales
  const trend = (() => {
    const days: Record<string, number> = {};
    sales.forEach((s) => {
      const d = s.created_at?.toDate ? s.created_at.toDate() : new Date();
      const key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      days[key] = (days[key] || 0) + s.total;
    });
    return Object.entries(days).slice(-14).map(([date, total]) => ({ date, total }));
  })();

  const lowStock = fabrics.filter((f) => f.remaining_yards <= f.minimum_stock_level);
  const topFabrics = [...fabrics].sort((a, b) => (b.total_yards_purchased - b.remaining_yards) - (a.total_yards_purchased - a.remaining_yards)).slice(0, 5);
  const categoryTotals = fabrics.reduce<Record<string, number>>((acc, f) => {
    const key = f.category_name || 'Other';
    acc[key] = (acc[key] || 0) + f.remaining_yards * f.selling_price_yard;
    return acc;
  }, {});
  const categoryData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));

  const bestCategory = categoryData.sort((a, b) => b.value - a.value)[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        <StatCard label="Today's Sales" value={fmt(stats?.today_sales || 0)} icon={DollarSign} />
        <StatCard label="Monthly Revenue" value={fmt(stats?.monthly_revenue || 0)} icon={TrendingUp} />
        <StatCard label="Net Profit" value={fmt(stats?.net_profit || 0)} icon={Wallet} accent="green" />
        <StatCard label="Expenses (Month)" value={fmt(stats?.expenses_this_month || 0)} icon={Receipt} accent="red" />
        <StatCard label="Inventory Value" value={fmt(stats?.inventory_value || 0)} icon={Boxes} />
        <StatCard label="Low Stock Items" value={String(lowStock.length)} icon={AlertTriangle} accent="red" />
        <StatCard label="Customer Credit" value={fmt(stats?.customer_credit_total || 0)} icon={Users} accent="red" />
        <StatCard label="Supplier Balances" value={fmt(stats?.supplier_balance_total || 0)} icon={Truck} accent="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rb-card lg:col-span-2">
          <h3 className="font-display font-bold text-charcoal mb-4">Sales Overview</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#999" />
              <YAxis tick={{ fontSize: 11 }} stroke="#999" />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Line type="monotone" dataKey="total" stroke="#d4a537" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rb-card">
          <h3 className="font-display font-bold text-charcoal mb-4">Inventory Value by Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {categoryData.slice(0, 4).map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {c.name}
                </span>
                <span className="font-medium text-charcoal">{fmt(c.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {bestCategory && (
        <div className="rb-card flex items-center gap-4 border border-gold/30">
          <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-gold-dark" />
          </div>
          <p className="text-sm text-charcoal">
            <strong>AI Business Insight:</strong> {bestCategory.name} fabrics hold the highest stock value
            right now ({fmt(bestCategory.value)}).
            {lowStock.length > 0 && ` ${lowStock.length} fabric${lowStock.length > 1 ? 's are' : ' is'} running low and may need restocking soon.`}
          </p>
        </div>
      )}

      <div className="rb-card overflow-x-auto">
        <h3 className="font-display font-bold text-charcoal mb-4">Fabrics by Stock Turnover</h3>
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="text-left text-gray-400 text-xs uppercase border-b">
              <th className="pb-2">Fabric</th>
              <th className="pb-2">Remaining Yards</th>
              <th className="pb-2">Selling Price/Yard</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {topFabrics.map((f) => (
              <tr key={f.id} className="border-b last:border-0">
                <td className="py-2.5 font-medium text-charcoal">{f.name}</td>
                <td className="py-2.5">{f.remaining_yards} yds</td>
                <td className="py-2.5">{fmt(f.selling_price_yard)}</td>
                <td className="py-2.5">
                  <span className={`text-xs px-2 py-1 rounded-full ${f.remaining_yards <= f.minimum_stock_level ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                    {f.remaining_yards <= f.minimum_stock_level ? 'Low Stock' : 'In Stock'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


