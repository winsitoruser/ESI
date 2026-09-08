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
  blue: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]',
  emerald: 'bg-emerald-50 text-[color:var(--hf-success)]',
  amber: 'bg-amber-50 text-[color:var(--hf-warning)]',
  violet: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]',
  cyan: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]',
  rose: 'bg-rose-50 text-[color:var(--hf-danger)]',
  orange: 'bg-amber-50 text-[color:var(--hf-warning)]',
  indigo: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]',
};

export default function HRStatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'violet',
  trend,
  onClick,
}: HRStatCardProps) {
  const Wrapper = onClick ? 'button' : 'div';
  const iconClass = ACCENT[accent] || ACCENT.violet;

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`hf-tile relative flex h-full min-h-[148px] w-full flex-col overflow-hidden p-4 pl-5 text-left ${onClick ? 'hf-tile-interactive cursor-pointer' : ''}`}
    >
      <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-[var(--hf-brand-500)]" aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--hf-radius)] ${iconClass}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        {trend ? (
          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${trend.positive ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
            {trend.value}
          </span>
        ) : (
          <span className="h-5 w-5" aria-hidden />
        )}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--hf-ink)] tabular-nums">{value}</p>
      <p className="mt-1 text-xs font-medium text-[color:var(--hf-ink-secondary)]">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-[color:var(--hf-ink-faint)]">{sub}</p>}
    </Wrapper>
  );
}
