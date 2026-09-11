import { NavLink } from 'react-router-dom';
import RBLogo from './RBLogo';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  ClipboardList,
  CreditCard,
  Receipt,
  BarChart3,
  Sparkles,
  UserCog,
  Settings,
  LogOut,
  X,
  RotateCcw,
} from 'lucide-react';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'manager', 'cashier', 'store_keeper', 'accountant'] },
  { to: '/pos', label: 'Sales (POS)', icon: ShoppingCart, roles: ['owner', 'manager', 'cashier'] },
  { to: '/inventory', label: 'Inventory', icon: Package, roles: ['owner', 'manager', 'store_keeper'] },
  { to: '/customers', label: 'Customers', icon: Users, roles: ['owner', 'manager', 'cashier'] },
  { to: '/suppliers', label: 'Suppliers', icon: Truck, roles: ['owner', 'manager', 'store_keeper'] },
  { to: '/purchases', label: 'Purchases', icon: ClipboardList, roles: ['owner', 'manager', 'store_keeper'] },
  { to: '/returns', label: 'Returns', icon: RotateCcw, roles: ['owner', 'manager', 'cashier'] },
  { to: '/credit', label: 'Credit Management', icon: CreditCard, roles: ['owner', 'manager', 'cashier', 'accountant'] },
  { to: '/expenses', label: 'Expenses', icon: Receipt, roles: ['owner', 'accountant', 'manager'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['owner', 'manager', 'accountant'] },
  { to: '/assistant', label: 'AI Assistant', icon: Sparkles, roles: ['owner', 'manager', 'accountant'] },
  { to: '/users', label: 'Users', icon: UserCog, roles: ['owner'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['owner'] },
];

interface Props {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: Props) {
  const { user, logout } = useAuth();
  const { company_name } = useSettings();
  const role = user?.role || 'cashier';

  const content = (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      {/* Brand */}
      <div className="flex items-center justify-between gap-3 px-5 py-5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <RBLogo size={40} />

          <div className="min-w-0">
            <div className="font-display font-bold text-white leading-tight truncate">
              {company_name.split(' ')[0]}
            </div>

            <div className="text-gold text-xs tracking-[0.18em] truncate">
              {company_name.split(' ').slice(1).join(' ') || 'ENTERPRISE'}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 active:bg-white/15 shrink-0"
          aria-label="Close menu"
        >
          <X size={22} />
        </button>
      </div>

      {/* Navigation — ONLY THIS AREA SCROLLS */}
      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y py-4 px-3 space-y-1 [scrollbar-gutter:stable]">
        {NAV.filter((item) => item.roles.includes(role)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gold text-charcoal font-semibold'
                  : 'text-white/70 hover:bg-white/5 active:bg-white/10 hover:text-white'
              }`
            }
          >
            <item.icon size={18} className="shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout — stays fixed at bottom */}
      <div className="p-3 border-t border-white/10 shrink-0 bg-charcoal">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 min-h-[44px] px-3 py-2.5 rounded-lg text-sm text-white/60 hover:bg-white/5 active:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut size={18} className="shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-64 h-screen bg-charcoal flex-col shrink-0 overflow-hidden">
        {content}
      </aside>

      {/* Mobile / tablet drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer */}
          <aside className="absolute left-0 top-0 bottom-0 w-[min(18rem,85vw)] h-full bg-charcoal flex flex-col shadow-2xl overflow-hidden">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}


