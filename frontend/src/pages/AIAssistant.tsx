import { useEffect, useMemo, useState } from 'react';
import { listFabrics, listCustomers, listSales, listSuppliers, listExpenses } from '../api/firestore';
import { Sparkles, Send } from 'lucide-react';

const fmt = (n: number) => `GH₵ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface ChatMsg { role: 'user' | 'assistant'; text: string; }

export default function AIAssistant() {
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', text: "Hello! I'm your Richbecks AI Assistant. Ask me about profit, stock, or debts." },
  ]);
  const [input, setInput] = useState('');

  useEffect(() => {
    listFabrics().then(setFabrics).catch(() => {});
    listCustomers().then(setCustomers).catch(() => {});
    listSales().then(setSales).catch(() => {});
    listSuppliers().then(setSuppliers).catch(() => {});
    listExpenses().then(setExpenses).catch(() => {});
  }, []);

  const insights = useMemo(() => {
    const lowStock = fabrics.filter((f) => f.remaining_yards <= f.minimum_stock_level);
    const totalDebt = customers.reduce((s, c) => s + c.credit_balance, 0);
    const overdueCustomers = customers.filter((c) => c.credit_balance > 0).length;
    const totalSalesValue = sales.reduce((s, x) => s + x.total, 0);
    const bestFabric = [...fabrics].sort((a, b) => (b.total_yards_purchased - b.remaining_yards) - (a.total_yards_purchased - a.remaining_yards))[0];

    const list: string[] = [];
    if (lowStock.length > 0) {
      list.push(`Stock of ${lowStock.map((f) => f.name).slice(0, 2).join(', ')} is running low.`);
    }
    if (overdueCustomers > 0) {
      list.push(`${overdueCustomers} customer${overdueCustomers > 1 ? 's have' : ' has'} an outstanding balance totaling ${fmt(totalDebt)}.`);
    }
    if (bestFabric) {
      list.push(`${bestFabric.name} is your best-moving fabric so far.`);
    }
    if (totalSalesValue > 0) {
      list.push(`Total recorded sales: ${fmt(totalSalesValue)}.`);
    }
    return list;
  }, [fabrics, customers, sales]);

  function answer(question: string): string {
    const q = question.toLowerCase();
    if (q.includes('profit') || q.includes('highest')) {
      const sorted = [...fabrics].sort((a, b) => (b.selling_price_yard - b.purchase_price_yard) - (a.selling_price_yard - a.purchase_price_yard));
      const top = sorted[0];
      return top
        ? `${top.name} has the highest margin per yard, at ${fmt(top.selling_price_yard - top.purchase_price_yard)}/yd.`
        : "I don't have enough sales data yet to determine that.";
    }
    if (q.includes('restock') || q.includes('low stock') || q.includes('need')) {
      const low = fabrics.filter((f) => f.remaining_yards <= f.minimum_stock_level);
      return low.length > 0
        ? `These fabrics need restocking: ${low.map((f) => f.name).join(', ')}.`
        : 'All fabrics are currently above their minimum stock level.';
    }
    if (q.includes('debt') || q.includes('owe')) {
      const total = customers.reduce((s, c) => s + c.credit_balance, 0);
      return `Total customer debt outstanding is ${fmt(total)} across ${customers.filter((c) => c.credit_balance > 0).length} customers.`;
    }
    if (q.includes('supplier')) {
      const total = suppliers.reduce((s, x) => s + x.amount_owed, 0);
      return `You currently owe suppliers a combined total of ${fmt(total)}.`;
    }
    if (q.includes('expense')) {
      const total = expenses.reduce((s, x) => s + x.amount, 0);
      return `Total recorded expenses so far: ${fmt(total)}.`;
    }
    if (q.includes('sales') || q.includes('revenue')) {
      const total = sales.reduce((s, x) => s + x.total, 0);
      return `Total recorded sales revenue: ${fmt(total)} across ${sales.length} transactions.`;
    }
    return "I can answer questions about profit, restocking, customer debts, supplier balances, expenses, and sales. Try asking one of those!";
  }

  function send(text?: string) {
    const q = text ?? input;
    if (!q.trim()) return;
    setMessages((m) => [...m, { role: 'user', text: q }, { role: 'assistant', text: answer(q) }]);
    setInput('');
  }

  const suggestions = [
    'Which fabric made the highest profit?',
    'Which fabrics need restocking?',
    'What are my total debts?',
    'What are my total expenses?',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="rb-card lg:col-span-1">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-gold-dark" />
          <h3 className="font-display font-bold text-charcoal">AI Suggestions</h3>
        </div>
        <div className="space-y-3">
          {insights.length === 0 && <p className="text-sm text-gray-400">Add fabrics, sales, and customers to see insights here.</p>}
          {insights.map((line, i) => (
            <div key={i} className="text-sm bg-gold/5 border border-gold/20 rounded-lg p-3 text-charcoal">{line}</div>
          ))}
        </div>
      </div>

      <div className="rb-card lg:col-span-2 flex flex-col h-[70vh] max-h-[560px] min-h-[400px]">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-gold-dark" />
          <h3 className="font-display font-bold text-charcoal">Ask Richbecks AI</h3>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'ml-auto bg-charcoal text-white' : 'bg-gray-100 text-charcoal'}`}>
              {m.text}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((s) => (
            <button key={s} onClick={() => send(s)} className="text-xs bg-gray-100 hover:bg-gold/10 hover:text-gold-dark px-3 py-1.5 rounded-full text-gray-600">
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ask anything about your business..."
            className="flex-1 outline-none text-sm"
          />
          <button onClick={() => send()} className="text-gold-dark"><Send size={18} /></button>
        </div>
      </div>
    </div>
  );
}
