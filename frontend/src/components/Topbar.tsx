import { useEffect, useState } from 'react';
import {
  Bell,
  Search,
  Menu,
  X,
  AlertTriangle,
  Package,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlobalSearch from './GlobalSearch';
import { listFabrics } from '../api/firestore';
import { Fabric } from '../types';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success';
}

export default function Topbar({
  title,
  onMenuClick,
}: {
  title: string;
  onMenuClick: () => void;
}) {
  const { user } = useAuth();

  const [mobileSearchOpen, setMobileSearchOpen] =
    useState(false);

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [fabrics, setFabrics] =
    useState<Fabric[]>([]);

  const today = new Date().toLocaleDateString(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );

  useEffect(() => {
    listFabrics()
      .then((rows) =>
        setFabrics(rows as Fabric[])
      )
      .catch(() => setFabrics([]));
  }, []);

  const notifications: NotificationItem[] = [];

  const lowStock = fabrics.filter(
    (f) =>
      Number(f.remaining_yards || 0) <=
      Number(f.minimum_stock_level || 0)
  );

  lowStock.slice(0, 10).forEach((fabric) => {
    notifications.push({
      id: `low-${fabric.id}`,
      title: 'Low Stock',
      message: `${fabric.name} has only ${fabric.remaining_yards} yards remaining.`,
      type: 'warning',
    });
  });

  const emptyStock = fabrics.filter(
    (f) => Number(f.remaining_yards || 0) <= 0
  );

  emptyStock.slice(0, 10).forEach((fabric) => {
    const exists = notifications.some(
      (n) => n.id === `low-${fabric.id}`
    );

    if (!exists) {
      notifications.push({
        id: `empty-${fabric.id}`,
        title: 'Out of Stock',
        message: `${fabric.name} has no remaining stock.`,
        type: 'warning',
      });
    }
  });

  const notificationCount =
    notifications.length;

  return (
    <>
      <header className="h-16 bg-white border-b flex items-center justify-between gap-3 px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden w-10 h-10 -ml-2 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-charcoal active:bg-gray-200 shrink-0"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <h1 className="text-base sm:text-lg font-display font-bold text-charcoal truncate">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          <div className="hidden md:block w-72">
            <GlobalSearch />
          </div>

          <button
            onClick={() =>
              setMobileSearchOpen(true)
            }
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-charcoal active:bg-gray-200"
            aria-label="Search"
          >
            <Search size={20} />
          </button>

          <span className="hidden sm:inline text-sm text-gray-500">
            {today}
          </span>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() =>
                setNotificationsOpen(
                  (open) => !open
                )
              }
              className="relative w-10 h-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-charcoal"
              aria-label="Notifications"
              aria-expanded={
                notificationsOpen
              }
            >
              <Bell size={20} />

              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {notificationCount > 9
                    ? '9+'
                    : notificationCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-charcoal">
                      Notifications
                    </h3>

                    <p className="text-xs text-gray-400">
                      {notificationCount === 0
                        ? 'Everything looks good'
                        : `${notificationCount} alert${
                            notificationCount === 1
                              ? ''
                              : 's'
                          }`}
                    </p>
                  </div>

                  <Bell
                    size={17}
                    className="text-gold-dark"
                  />
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length ===
                  0 ? (
                    <div className="px-5 py-8 text-center">
                      <CheckCircle2
                        size={30}
                        className="mx-auto text-emerald-500 mb-2"
                      />

                      <p className="text-sm font-medium text-charcoal">
                        No notifications
                      </p>

                      <p className="text-xs text-gray-400 mt-1">
                        Your inventory currently
                        has no active alerts.
                      </p>
                    </div>
                  ) : (
                    notifications.map(
                      (notification) => (
                        <div
                          key={
                            notification.id
                          }
                          className="px-4 py-3 border-b last:border-0 hover:bg-gray-50"
                        >
                          <div className="flex gap-3">
                            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                              {notification.type ===
                              'warning' ? (
                                <AlertTriangle
                                  size={17}
                                  className="text-red-500"
                                />
                              ) : (
                                <Package
                                  size={17}
                                  className="text-gold-dark"
                                />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-charcoal">
                                {
                                  notification.title
                                }
                              </p>

                              <p className="text-xs text-gray-500 mt-0.5">
                                {
                                  notification.message
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    )
                  )}
                </div>

                <div className="px-4 py-2.5 bg-gray-50 text-[11px] text-gray-400 flex items-center gap-1">
                  <Clock size={12} />
                  Based on current inventory
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-charcoal text-gold flex items-center justify-center font-semibold text-sm shrink-0">
              {user?.full_name?.[0] || 'R'}
            </div>

            <div className="hidden sm:block leading-tight">
              <div className="text-sm font-semibold text-charcoal">
                {user?.full_name}
              </div>

              <div className="text-xs text-gray-400 capitalize">
                {user?.role?.replace(
                  '_',
                  ' '
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <GlobalSearch
                autoFocus
                onNavigate={() =>
                  setMobileSearchOpen(false)
                }
              />
            </div>

            <button
              onClick={() =>
                setMobileSearchOpen(false)
              }
              className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 shrink-0"
              aria-label="Close search"
            >
              <X size={22} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}