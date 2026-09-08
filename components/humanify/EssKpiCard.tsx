/**
 * EssKpiCard — metric card khusus halaman ESS.
 * Lebih kaya dari HRStatCard: progress bar opsional, sub-label dua baris,
 * severity tint (normal / warning / danger), arrow action, dan micro-trend.
 */
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';

export type EssKpiSeverity = 'normal' | 'warning' | 'danger' | 'success';

export interface EssKpiCardProps {
  label: string;
  value: number | string;
  subLabel?: string;
  helpText?: string;
  icon: LucideIcon;
  severity?: EssKpiSeverity;
  /** 0–100; renders a thin progress bar below the value if provided */
  progress?: number;
  progressMax?: number;
  /** Micro-trend label e.g. "+3 minggu ini" */
  trend?: string;
  trendDir?: 'up' | 'down' | 'neutral';
  /** When truthy, renders a clickable card */
  onClick?: () => void;
  actionLabel?: string;
}

const SEVERITY_MAP: Record<
  EssKpiSeverity,
  { iconBg: string; iconText: string; valueTint: string; bar: string; border: string; tint: string }
> = {
  normal: {
    iconBg: 'bg-[var(--hf-brand-50)]',
    iconText: 'text-[color:var(--hf-brand-600)]',
    valueTint: 'text-[color:var(--hf-ink)]',
    bar: 'bg-[var(--hf-brand-500)]',
    border: 'border-[var(--hf-border)] hover:border-[var(--hf-brand-100)]',
    tint: '',
  },
  success: {
    iconBg: 'bg-emerald-50',
    iconText: 'text-emerald-700',
    valueTint: 'text-emerald-700',
    bar: 'bg-emerald-500',
    border: 'border-[var(--hf-border)] hover:border-emerald-200',
    tint: '',
  },
  warning: {
    iconBg: 'bg-amber-50',
    iconText: 'text-amber-700',
    valueTint: 'text-amber-700',
    bar: 'bg-amber-500',
    border: 'border-amber-200 hover:border-amber-300',
    tint: 'bg-amber-50/40',
  },
  danger: {
    iconBg: 'bg-rose-50',
    iconText: 'text-rose-700',
    valueTint: 'text-rose-700',
    bar: 'bg-rose-500',
    border: 'border-rose-200 hover:border-rose-300',
    tint: 'bg-rose-50/40',
  },
};

export default function EssKpiCard({
  label,
  value,
  subLabel,
  helpText,
  icon: Icon,
  severity = 'normal',
  progress,
  progressMax,
  trend,
  trendDir = 'neutral',
  onClick,
  actionLabel,
}: EssKpiCardProps) {
  const s = SEVERITY_MAP[severity];
  const pct =
    progress != null
      ? Math.min(100, Math.round((progress / (progressMax ?? Math.max(Number(value), 1))) * 100))
      : null;

  const Wrap = onClick ? 'button' : 'div';

  return (
    <Wrap
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`hf-tile group relative flex h-full min-h-[148px] w-full flex-col overflow-hidden text-left ${onClick ? 'hf-tile-interactive cursor-pointer' : ''}`}
    >
      {/* Severity accent stripe */}
      <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${s.bar}`} aria-hidden />

      <div className="flex flex-1 flex-col gap-3 px-5 py-4 pl-6">
        {/* Header row: icon + label */}
        <div className="flex items-start justify-between gap-2">
          <div className={`rounded-[var(--hf-radius)] p-2 ${s.iconBg}`}>
            <Icon className={`h-[18px] w-[18px] ${s.iconText}`} />
          </div>
          {trend && (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                trendDir === 'up'
                  ? 'bg-emerald-50 text-emerald-700'
                  : trendDir === 'down'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)]'
              }`}
            >
              {trendDir === 'up' && <TrendingUp className="h-3 w-3" />}
              {trendDir === 'down' && <TrendingDown className="h-3 w-3" />}
              {trend}
            </span>
          )}
        </div>

        {/* Value */}
        <div>
          <p className={`text-3xl font-semibold tabular-nums tracking-tight ${s.valueTint}`}>
            {value}
          </p>
          <p className="mt-0.5 text-sm font-medium text-[color:var(--hf-ink)]">{label}</p>
          {subLabel && (
            <p className="mt-0.5 text-xs text-[color:var(--hf-ink-muted)]">{subLabel}</p>
          )}
        </div>

        {/* Progress bar */}
        {pct != null && (
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--hf-surface-muted)]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${s.bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] text-[color:var(--hf-ink-faint)]">{pct}% dari total</p>
          </div>
        )}

        {/* Help text */}
        {helpText && (
          <p className="text-[11px] leading-relaxed text-[color:var(--hf-ink-faint)]">{helpText}</p>
        )}
      </div>

      {/* Footer action */}
      {onClick && (
        <div className={`flex items-center justify-between border-t border-[var(--hf-border-subtle)] px-5 py-2 pl-6 text-xs font-medium transition-colors ${
          severity === 'normal' ? 'text-[color:var(--hf-brand-600)]' :
          severity === 'success' ? 'text-emerald-700' :
          severity === 'warning' ? 'text-amber-700' : 'text-rose-700'
        } group-hover:opacity-80`}>
          <span>{actionLabel || 'Lihat detail'}</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      )}
    </Wrap>
  );
}
