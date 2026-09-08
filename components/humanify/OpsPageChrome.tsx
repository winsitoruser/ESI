import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { BarChart3 } from 'lucide-react';

export type OpsChip = {
  icon?: LucideIcon;
  label: string;
  tone?: string;
};

export function OpsPageHero({
  title,
  subtitle,
  badge = 'Humanify Ops',
  liveLabel = 'Live',
  icon: Icon = BarChart3,
  chips,
  score,
  scoreLabel = 'Health',
  actions,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  liveLabel?: string;
  icon?: LucideIcon;
  chips?: OpsChip[];
  score?: number | null;
  scoreLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="hf-analytics-hero px-5 py-5 md:px-6 md:py-6">
      <div className="hf-analytics-hero__orb hf-analytics-hero__orb--a" aria-hidden />
      <div className="hf-analytics-hero__orb hf-analytics-hero__orb--b" aria-hidden />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <span className="hf-analytics-live">
              <span className="hf-analytics-live__dot" aria-hidden />
              {liveLabel}
            </span>
            <span className="hf-analytics-chip">
              <Icon className="h-3.5 w-3.5 text-[color:var(--hf-brand-600)]" />
              {badge}
            </span>
          </div>
          <h1 className="hf-page-title text-[1.5rem] md:text-[1.7rem]">{title}</h1>
          {subtitle && <p className="hf-page-subtitle max-w-2xl">{subtitle}</p>}
          {chips && chips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span key={chip.label} className="hf-analytics-chip">
                  {chip.icon && <chip.icon className={`h-3.5 w-3.5 ${chip.tone || 'text-[color:var(--hf-brand-600)]'}`} />}
                  {chip.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {score != null && <OpsHealthRing score={score} label={scoreLabel} />}
          {actions}
        </div>
      </div>
    </header>
  );
}

export function OpsHealthRing({ score, label = 'Health' }: { score: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score || 0)));
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const tone = clamped >= 80 ? 'var(--hf-success)' : clamped >= 60 ? 'var(--hf-warning)' : 'var(--hf-danger)';
  return (
    <div className="hf-analytics-ring" title={`${label} ${clamped}`}>
      <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden>
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--hf-brand-100)" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="hf-analytics-ring__label">
        <span className="text-lg font-semibold tabular-nums tracking-tight text-[color:var(--hf-ink)]">{clamped}</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[color:var(--hf-ink-faint)]">{label}</span>
      </div>
    </div>
  );
}

export function OpsPanel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`hf-card hf-analytics-panel overflow-hidden ${className}`}>
      <div className="hf-analytics-panel__rail" aria-hidden />
      <div className="flex items-start justify-between gap-3 border-b border-[var(--hf-border-subtle)] px-4 py-3 pl-5 md:px-5 md:pl-6">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-[color:var(--hf-ink)]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[color:var(--hf-ink-muted)]">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-4 pl-5 md:p-5 md:pl-6">{children}</div>
    </section>
  );
}

export function OpsKpiShell({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function OpsToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 hf-card px-4 py-3">
      {children}
    </div>
  );
}

export function OpsStage({ children }: { children: ReactNode }) {
  return <div className="hf-analytics-stage space-y-4">{children}</div>;
}
