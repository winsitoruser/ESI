import type { LucideIcon } from 'lucide-react';

interface HRStatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  gradient?: string;
  trend?: { value: string; positive?: boolean };
  onClick?: () => void;
}

export default function HRStatCard({
  label,
  value,
  sub,
  icon: Icon,
  gradient = 'from-indigo-500 to-indigo-700',
  trend,
  onClick,
}: HRStatCardProps) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-left text-white shadow-lg shadow-black/5 transition hover:scale-[1.02] hover:shadow-xl ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
      <div className="relative flex items-start justify-between">
        <div className="rounded-xl bg-white/15 p-2.5 backdrop-blur-sm">
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${trend.positive ? 'bg-emerald-400/30' : 'bg-rose-400/30'}`}>
            {trend.value}
          </span>
        )}
      </div>
      <p className="relative mt-4 text-3xl font-bold tracking-tight">{value}</p>
      <p className="relative mt-1 text-sm font-medium text-white/85">{label}</p>
      {sub && <p className="relative mt-0.5 text-xs text-white/65">{sub}</p>}
    </Wrapper>
  );
}
