import { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  accent?: 'gold' | 'red' | 'green';
}

export default function StatCard({ label, value, icon: Icon, trend, trendUp = true, accent = 'gold' }: Props) {
  const iconBg = accent === 'red' ? 'bg-red-50 text-red-500' : accent === 'green' ? 'bg-emerald-50 text-emerald-600' : 'bg-gold/10 text-gold-dark';

  return (
    <div className="rb-card flex flex-col gap-2 min-w-[180px]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-xl font-bold text-charcoal font-display">{value}</div>
      {trend && (
        <span className={`text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>{trend}</span>
      )}
    </div>
  );
}
