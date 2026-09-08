import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';

export type HeroMetricTone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE: Record<
  HeroMetricTone,
  { icon: string; bar: string; rail: string; value: string }
> = {
  brand: {
    icon: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]',
    bar: 'bg-[var(--hf-brand-500)]',
    rail: 'bg-[var(--hf-brand-500)]',
    value: 'text-[color:var(--hf-ink)]',
  },
  success: {
    icon: 'bg-emerald-50 text-[color:var(--hf-success)]',
    bar: 'bg-[color:var(--hf-success)]',
    rail: 'bg-[color:var(--hf-success)]',
    value: 'text-[color:var(--hf-ink)]',
  },
  warning: {
    icon: 'bg-amber-50 text-[color:var(--hf-warning)]',
    bar: 'bg-[color:var(--hf-warning)]',
    rail: 'bg-[color:var(--hf-warning)]',
    value: 'text-[color:var(--hf-ink)]',
  },
  danger: {
    icon: 'bg-rose-50 text-[color:var(--hf-danger)]',
    bar: 'bg-[color:var(--hf-danger)]',
    rail: 'bg-[color:var(--hf-danger)]',
    value: 'text-[color:var(--hf-ink)]',
  },
  neutral: {
    icon: 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)]',
    bar: 'bg-slate-300',
    rail: 'bg-slate-300',
    value: 'text-[color:var(--hf-ink)]',
  },
};

export function HrisHeroMetricCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
  tone = 'brand',
  progress,
  featured = false,
  actionLabel = 'Buka',
}: {
  label: string;
  value: string | number;
  hint?: string;
  href: string;
  icon: LucideIcon;
  tone?: HeroMetricTone;
  progress?: number | null;
  featured?: boolean;
  actionLabel?: string;
}) {
  const t = TONE[tone];
  const pct = progress == null ? null : Math.max(0, Math.min(100, Math.round(progress)));

  if (!featured) {
    return (
      <Link
        href={href}
        aria-label={`${label}: ${value}. ${actionLabel}`}
        className="hf-tile hf-tile-interactive group relative flex min-h-0 w-full flex-col gap-2 overflow-hidden px-3.5 py-3 pl-4 text-left"
      >
        <span className={`absolute inset-y-2.5 left-0 w-[2px] rounded-r-full ${t.rail}`} aria-hidden />
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[11px] font-medium leading-none text-[color:var(--hf-ink-secondary)]">{label}</p>
          <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${t.icon}`}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className={`text-xl font-semibold leading-none tabular-nums tracking-tight ${t.value}`}>{value}</p>
            {hint ? (
              <p className="mt-1 truncate text-[11px] tabular-nums text-[color:var(--hf-ink-muted)]">{hint}</p>
            ) : null}
          </div>
          <ArrowRight className="mb-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--hf-ink-faint)] transition group-hover:translate-x-0.5 group-hover:text-[color:var(--hf-brand-600)]" />
        </div>
        {pct != null ? (
          <div className="h-1 overflow-hidden rounded-full bg-[var(--hf-surface-muted)]">
            <div className={`h-full rounded-full transition-[width] ${t.bar}`} style={{ width: `${pct}%` }} />
          </div>
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-label={`${label}: ${value}. ${actionLabel}`}
      className="hf-tile hf-tile-interactive group relative flex min-h-0 w-full flex-col overflow-hidden px-4 py-3.5 text-left"
    >
      <span className={`absolute inset-y-2.5 left-0 w-[2.5px] rounded-r-full ${t.rail}`} aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--hf-radius)] ${t.icon}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[color:var(--hf-ink-secondary)]">{label}</p>
            {hint ? (
              <p className="mt-0.5 truncate text-[11px] tabular-nums text-[color:var(--hf-ink-muted)]">{hint}</p>
            ) : (
              <p className="mt-0.5 text-[11px] text-transparent select-none" aria-hidden>
                —
              </p>
            )}
          </div>
        </div>
        <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-[color:var(--hf-ink-faint)] transition group-hover:translate-x-0.5 group-hover:text-[color:var(--hf-brand-600)]" />
      </div>
      <p className={`mt-2.5 text-[1.5rem] font-semibold leading-none tabular-nums tracking-tight ${t.value}`}>{value}</p>
      {pct != null ? (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--hf-surface-muted)]">
          <div className={`h-full rounded-full transition-[width] ${t.bar}`} style={{ width: `${pct}%` }} />
        </div>
      ) : (
        <div className="mt-3 h-1" aria-hidden />
      )}
    </Link>
  );
}

export function HrisHeroNavCard({
  label,
  desc,
  meta,
  href,
  icon: Icon,
}: {
  label: string;
  desc: string;
  meta: string;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Link href={href} className="hf-tile hf-tile-interactive group flex h-full min-h-[96px] items-start gap-3 p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--hf-radius)] bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold text-[color:var(--hf-ink)]">{label}</span>
          <span className="shrink-0 rounded-md bg-[var(--hf-surface-muted)] px-2 py-0.5 text-[11px] font-medium tabular-nums text-[color:var(--hf-ink-muted)]">
            {meta}
          </span>
        </span>
        <span className="mt-0.5 block line-clamp-2 text-xs leading-snug text-[color:var(--hf-ink-muted)]">{desc}</span>
        <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-[color:var(--hf-brand-600)]">
          Buka <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </Link>
  );
}

export function HrisHeroQueueCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="hf-tile hf-tile-interactive group flex min-h-[68px] items-center justify-between gap-3 px-3.5 py-2.5">
      <span>
        <span className="block text-[11px] font-medium text-[color:var(--hf-ink-muted)]">{label}</span>
        <span className="mt-0.5 block text-lg font-semibold tabular-nums tracking-tight text-[color:var(--hf-ink)]">{value}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-[color:var(--hf-brand-600)] opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
    </Link>
  );
}
