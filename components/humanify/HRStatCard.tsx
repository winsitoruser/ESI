import type { LucideIcon } from 'lucide-react';

interface HRStatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  gradient?: string;
  accent?: 'blue' | 'emerald' | 'amber' | 'violet' | 'cyan' | 'rose' | 'orange' | 'indigo';
  variant?: 'bold' | 'soft';
  trend?: { value: string; positive?: boolean };
  onClick?: () => void;
}

const ACCENT = {
  blue: { icon: 'bg-blue-50 text-blue-600', border: 'hover:border-blue-200' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', border: 'hover:border-emerald-200' },
  amber: { icon: 'bg-amber-50 text-amber-600', border: 'hover:border-amber-200' },
  violet: { icon: 'bg-violet-50 text-violet-600', border: 'hover:border-violet-200' },
  cyan: { icon: 'bg-cyan-50 text-cyan-600', border: 'hover:border-cyan-200' },
  rose: { icon: 'bg-rose-50 text-rose-600', border: 'hover:border-rose-200' },
  orange: { icon: 'bg-orange-50 text-orange-600', border: 'hover:border-orange-200' },
  indigo: { icon: 'bg-indigo-50 text-indigo-600', border: 'hover:border-indigo-200' },
};

export default function HRStatCard({
  label,
  value,
  sub,
  icon: Icon,
  gradient = 'from-indigo-500 to-indigo-700',
  accent = 'blue',
  variant = 'bold',
  trend,
  onClick,
}: HRStatCardProps) {
  const Wrapper = onClick ? 'button' : 'div';
  const a = ACCENT[accent];

  if (variant === 'soft') {
    return (
      <Wrapper
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={`rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-sm transition hover:shadow-md ${a.border} ${onClick ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className={`rounded-xl p-2.5 ${a.icon}`}>
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${trend.positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {trend.value}
            </span>
          )}
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-800">{value}</p>
        <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
        {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
      </Wrapper>
    );
  }

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
