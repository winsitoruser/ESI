import type { HrisDataSource } from '@/lib/hris/data-source';

const STYLES: Record<HrisDataSource, string> = {
  live: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  demo: 'border-amber-200 bg-amber-50 text-amber-800',
  empty: 'border-slate-200 bg-slate-50 text-slate-600',
};

const LABELS: Record<HrisDataSource, string> = {
  live: 'Data Live',
  demo: 'Data Demo',
  empty: 'Belum Ada Data',
};

export default function DataSourceBadge({ source, className = '' }: { source: HrisDataSource; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STYLES[source]} ${className}`}>
      {LABELS[source]}
    </span>
  );
}
