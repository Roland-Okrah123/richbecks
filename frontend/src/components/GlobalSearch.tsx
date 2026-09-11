import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listFabrics, listCustomers, listSuppliers } from '../api/firestore';
import { Search, Package, Users, Truck, Loader2 } from 'lucide-react';

interface Props {
  onNavigate?: () => void; // called after a result is picked (used to close mobile modal)
  autoFocus?: boolean;
}

export default function GlobalSearch({ onNavigate, autoFocus }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const dataRef = useRef<{ fabrics: any[]; customers: any[]; suppliers: any[] }>({
    fabrics: [], customers: [], suppliers: [],
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazily load a searchable index the first time the user focuses/types —
  // avoids an unnecessary read on every page load.
  async function ensureLoaded() {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const [fabrics, customers, suppliers] = await Promise.all([
        listFabrics().catch(() => []),
        listCustomers().catch(() => []),
        listSuppliers().catch(() => []),
      ]);
      dataRef.current = { fabrics, customers, suppliers };
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const q = query.trim().toLowerCase();
  const results = q.length >= 1
    ? {
        fabrics: dataRef.current.fabrics.filter((f) => [f.name, f.material_type, f.color_number, f.color, f.category_name].some((value) => String(value || '').toLowerCase().includes(q))).slice(0, 5),
        customers: dataRef.current.customers.filter((c) => c.name?.toLowerCase().includes(q) || c.phone?.includes(q)).slice(0, 5),
        suppliers: dataRef.current.suppliers.filter((s) => s.name?.toLowerCase().includes(q)).slice(0, 5),
      }
    : { fabrics: [], customers: [], suppliers: [] };

  const hasResults = results.fabrics.length + results.customers.length + results.suppliers.length > 0;

  function goTo(path: string) {
    navigate(path);
    setOpen(false);
    setQuery('');
    onNavigate?.();
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2.5 sm:py-2 text-sm text-gray-500 w-full">
        <Search size={16} />
        <input
          autoFocus={autoFocus}
          value={query}
          onFocus={() => { setOpen(true); ensureLoaded(); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); ensureLoaded(); }}
          placeholder="Search fabrics, customers, suppliers..."
          className="bg-transparent outline-none flex-1 min-w-0 text-charcoal placeholder:text-gray-400"
        />
        {loading && <Loader2 size={14} className="animate-spin text-gray-400" />}
      </div>

      {open && q.length >= 1 && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-lg border max-h-80 overflow-y-auto">
          {!hasResults && !loading && (
            <div className="p-4 text-sm text-gray-400 text-center">No matches for "{query}"</div>
          )}

          {results.fabrics.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-400 px-2 py-1">Fabrics</div>
              {results.fabrics.map((f) => (
                <button key={f.id} onClick={() => goTo(`/inventory?q=${encodeURIComponent(f.name)}`)} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 text-left">
                  <Package size={15} className="text-gold-dark shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm text-charcoal truncate">{f.name}</div>
                    <div className="text-xs text-gray-400">{f.material_type || f.category_name || 'Material'} · {f.color || 'No color'}{f.color_number ? ` · #${f.color_number}` : ''} · {f.remaining_yards} yds left</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.customers.length > 0 && (
            <div className="p-2 border-t">
              <div className="text-xs font-semibold text-gray-400 px-2 py-1">Customers</div>
              {results.customers.map((c) => (
                <button key={c.id} onClick={() => goTo(`/customers?q=${encodeURIComponent(c.name)}`)} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 text-left">
                  <Users size={15} className="text-gold-dark shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm text-charcoal truncate">{c.name}</div>
                    <div className="text-xs text-gray-400">{c.phone || 'No phone'}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.suppliers.length > 0 && (
            <div className="p-2 border-t">
              <div className="text-xs font-semibold text-gray-400 px-2 py-1">Suppliers</div>
              {results.suppliers.map((s) => (
                <button key={s.id} onClick={() => goTo(`/suppliers?q=${encodeURIComponent(s.name)}`)} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 text-left">
                  <Truck size={15} className="text-gold-dark shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm text-charcoal truncate">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.location || '—'}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
