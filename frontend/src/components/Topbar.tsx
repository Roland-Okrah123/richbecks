import { useState } from 'react';
import { Bell, Search, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlobalSearch from './GlobalSearch';

export default function Topbar({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  const { user } = useAuth();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <>
      <header className="h-16 bg-white border-b flex items-center justify-between gap-3 px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onMenuClick} className="lg:hidden w-10 h-10 -ml-2 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-charcoal active:bg-gray-200 shrink-0" aria-label="Open menu">
            <Menu size={22} />
          </button>
          <h1 className="text-base sm:text-lg font-display font-bold text-charcoal truncate">{title}</h1>
        </div>

        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          <div className="hidden md:block w-72">
            <GlobalSearch />
          </div>
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-charcoal active:bg-gray-200"
            aria-label="Search"
          >
            <Search size={20} />
          </button>

          <span className="hidden sm:inline text-sm text-gray-500">{today}</span>

          <button className="relative text-gray-500 hover:text-charcoal">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-gold rounded-full" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-charcoal text-gold flex items-center justify-center font-semibold text-sm shrink-0">
              {user?.full_name?.[0] || 'R'}
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-sm font-semibold text-charcoal">{user?.full_name}</div>
              <div className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <GlobalSearch autoFocus onNavigate={() => setMobileSearchOpen(false)} />
            </div>
            <button onClick={() => setMobileSearchOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 shrink-0" aria-label="Close search">
              <X size={22} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

