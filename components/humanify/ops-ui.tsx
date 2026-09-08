/**
 * Shared UI primitives for Admin Total / ops control plane.
 * Quiet SaaS chrome — Humanify tokens, no tenant sidebar aesthetics.
 */
import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowRight, X, type LucideIcon } from 'lucide-react';

export function OpsPageIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
            {eyebrow}
          </p>
        )}
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function OpsStat({
  label,
  value,
  hint,
  tone = 'default',
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'brand';
  icon?: LucideIcon;
}) {
  const valueTone =
    tone === 'success'
      ? 'text-emerald-700'
      : tone === 'warning'
        ? 'text-amber-700'
        : tone === 'danger'
          ? 'text-red-700'
          : tone === 'brand'
            ? 'text-[color:var(--hf-brand-700,#5b21b6)]'
            : 'text-slate-900';
  return (
    <div className="hf-card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
      </div>
      <p className={`text-2xl font-semibold tabular-nums tracking-tight ${valueTone}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] leading-snug text-slate-400">{hint}</p>}
    </div>
  );
}

export function OpsPanel({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`hf-card ${className}`}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function OpsBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand';
}) {
  const cls =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-900 ring-amber-100'
        : tone === 'danger'
          ? 'bg-red-50 text-red-800 ring-red-100'
          : tone === 'brand'
            ? 'bg-[var(--hf-brand-50,#f5f3ff)] text-[color:var(--hf-brand-700,#5b21b6)] ring-[var(--hf-brand-100,#ede9fe)]'
            : 'bg-slate-50 text-slate-700 ring-slate-100';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${cls}`}>
      {children}
    </span>
  );
}

export function OpsQuickLink({
  href,
  title,
  description,
  icon: Icon,
  accent = 'brand',
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: 'brand' | 'emerald' | 'amber' | 'slate';
}) {
  const iconCls =
    accent === 'emerald'
      ? 'text-emerald-600 bg-emerald-50'
      : accent === 'amber'
        ? 'text-amber-600 bg-amber-50'
        : accent === 'slate'
          ? 'text-slate-600 bg-slate-100'
          : 'text-[color:var(--hf-brand-600)] bg-[var(--hf-brand-50,#f5f3ff)]';
  return (
    <Link
      href={href}
      className="hf-tile hf-tile-interactive group flex items-start gap-3 p-4"
    >
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-900">{title}</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{description}</span>
      </span>
    </Link>
  );
}

export function OpsToast({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  useEffect(() => {
    if (!message || !onDismiss) return undefined;
    const t = window.setTimeout(onDismiss, 4500);
    return () => window.clearTimeout(t);
  }, [message, onDismiss]);
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg"
    >
      <p className="flex-1 leading-snug">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md p-0.5 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Tutup notifikasi"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function OpsEmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function Shimmer({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />;
}

export function OpsPageSkeleton({ variant = 'dashboard' }: { variant?: 'dashboard' | 'table' | 'detail' }) {
  if (variant === 'detail') {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Memuat">
        <Shimmer className="h-5 w-40" />
        <Shimmer className="h-8 w-72" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-24" />)}
        </div>
        <Shimmer className="h-64" />
      </div>
    );
  }
  if (variant === 'table') {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Memuat">
        <Shimmer className="h-8 w-56" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-24" />)}
        </div>
        <Shimmer className="h-80" />
      </div>
    );
  }
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Memuat">
      <div>
        <Shimmer className="mb-2 h-3 w-28" />
        <Shimmer className="h-8 w-64" />
        <Shimmer className="mt-2 h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Shimmer className="h-56" />
        <Shimmer className="h-56" />
      </div>
    </div>
  );
}

export type OpsConfirmProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function OpsConfirm({
  open,
  title,
  message,
  confirmLabel = 'Lanjutkan',
  cancelLabel = 'Batal',
  danger = false,
  busy = false,
  onCancel,
  onConfirm,
}: OpsConfirmProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const t = window.setTimeout(() => cancelRef.current?.focus(), 20);
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, busy, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="ops-confirm-title">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Tutup"
        disabled={busy}
        onClick={onCancel}
      />
      <div className="relative mx-auto mt-[20vh] w-full max-w-md px-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
          <h2 id="ops-confirm-title" className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{message}</p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              ref={cancelRef}
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className={`rounded-xl px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                danger ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {busy ? 'Memproses…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
