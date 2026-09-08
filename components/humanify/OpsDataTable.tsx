/**
 * Shared data table for ops.humanify.id —
 * search · filter · pagination · CSV/Excel export
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Search, ChevronLeft, ChevronRight, Download, FileSpreadsheet,
} from 'lucide-react';
import { OpsEmpty } from '@/components/humanify/ops-ui';
import {
  exportOpsCsv,
  exportOpsExcel,
  type OpsExportColumn,
} from '@/lib/humanify/ops-export';

export type OpsTableColumn<T> = {
  id: string;
  header: string;
  /** Cell renderer */
  cell: (row: T) => ReactNode;
  /** Align */
  align?: 'left' | 'center' | 'right';
  className?: string;
  /** Include in free-text search (uses exportValue or stringified cell fallback) */
  searchable?: boolean;
  /** Value used for search + export */
  exportValue?: (row: T) => string | number | boolean | null | undefined;
  /** Exclude from CSV/Excel */
  exportOmit?: boolean;
  exportWidth?: number;
};

export type OpsTableFilter = {
  id: string;
  label: string;
  /** all-value sentinel, default 'all' */
  allValue?: string;
  options: Array<{ value: string; label: string }>;
  /** Extract filter value from row */
  getValue: (row: any) => string;
};

type Props<T> = {
  rows: T[];
  columns: OpsTableColumn<T>[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  searchPlaceholder?: string;
  filters?: OpsTableFilter[];
  /** Export file basename (without extension) */
  exportFileName?: string;
  exportSheetName?: string;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  /** Extra toolbar (right side) */
  toolbarExtra?: ReactNode;
  /** Hide export buttons */
  hideExport?: boolean;
  className?: string;
};

function normalize(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

export default function OpsDataTable<T>({
  rows,
  columns,
  rowKey,
  loading = false,
  emptyTitle = 'Tidak ada data',
  emptyHint,
  searchPlaceholder = 'Cari…',
  filters = [],
  exportFileName = 'ops-export',
  exportSheetName = 'Data',
  pageSizeOptions = [10, 25, 50, 100],
  defaultPageSize = 10,
  toolbarExtra,
  hideExport = false,
  className = '',
}: Props<T>) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [filterState, setFilterState] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of filters) init[f.id] = f.allValue || 'all';
    return init;
  });

  const filtered = useMemo(() => {
    let list = rows || [];
    for (const f of filters) {
      const sel = filterState[f.id] ?? f.allValue ?? 'all';
      const all = f.allValue || 'all';
      if (sel && sel !== all) {
        list = list.filter((row) => normalize(f.getValue(row)) === normalize(sel));
      }
    }
    const needle = normalize(q.trim());
    if (needle) {
      const searchable = columns.filter((c) => c.searchable !== false && !c.exportOmit);
      list = list.filter((row) =>
        searchable.some((c) => {
          const v = c.exportValue ? c.exportValue(row) : (row as any)?.[c.id];
          return normalize(v).includes(needle);
        }),
      );
    }
    return list;
  }, [rows, filters, filterState, q, columns]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [q, pageSize, filterState, rows]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const exportCols: OpsExportColumn<T>[] = useMemo(
    () =>
      columns
        .filter((c) => !c.exportOmit)
        .map((c) => ({
          key: c.id,
          header: c.header,
          width: c.exportWidth,
          value: c.exportValue
            ? (row) => c.exportValue!(row)
            : (row) => (row as any)?.[c.id],
        })),
    [columns],
  );

  function doExport(kind: 'csv' | 'xlsx') {
    if (!filtered.length) return;
    if (kind === 'csv') exportOpsCsv(filtered, exportCols, exportFileName);
    else exportOpsExcel(filtered, exportCols, exportFileName, exportSheetName);
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-[180px] max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400"
            />
          </div>
          {filters.map((f) => (
            <select
              key={f.id}
              value={filterState[f.id] ?? f.allValue ?? 'all'}
              onChange={(e) => setFilterState((s) => ({ ...s, [f.id]: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              aria-label={f.label}
            >
              <option value={f.allValue || 'all'}>{f.label}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {toolbarExtra}
          {!hideExport && (
            <>
              <button
                type="button"
                disabled={!filtered.length}
                onClick={() => doExport('csv')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                title="Export hasil filter (CSV)"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
              <button
                type="button"
                disabled={!filtered.length}
                onClick={() => doExport('xlsx')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-40"
                title="Export hasil filter (Excel)"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="hf-table-wrap w-full overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.id}
                  className={`px-3 py-2.5 font-semibold sm:px-4 ${
                    c.align === 'center' ? 'text-center' : c.align === 'right' ? 'text-right' : ''
                  } ${c.className || ''}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading &&
              [0, 1, 2, 3, 4].map((i) => (
                <tr key={`sk-${i}`}>
                  {columns.map((c) => (
                    <td key={c.id} className="px-3 py-2.5 sm:px-4">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6">
                  <OpsEmpty title={emptyTitle} hint={emptyHint} />
                </td>
              </tr>
            )}
            {!loading &&
              pageRows.map((row) => (
                <tr key={rowKey(row)} className="hover:bg-slate-50/80">
                  {columns.map((c) => (
                    <td
                      key={c.id}
                      className={`px-3 py-2.5 sm:px-4 ${
                        c.align === 'center' ? 'text-center' : c.align === 'right' ? 'text-right' : ''
                      } ${c.className || ''}`}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
        <p>
          Menampilkan <span className="font-semibold text-slate-700">{from}–{to}</span> dari{' '}
          <span className="font-semibold text-slate-700">{total}</span>
          {rows.length !== total ? ` (difilter dari ${rows.length})` : ''}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5">
            Per halaman
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[4.5rem] text-center tabular-nums text-slate-700">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
