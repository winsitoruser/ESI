/**
 * Clean CSV / Excel export for ops.humanify.id tables.
 * Headers human-readable; values flattened & locale-friendly.
 */
import * as XLSX from 'xlsx';

export type OpsExportColumn<T = any> = {
  key: string;
  header: string;
  /** Value for export (defaults to row[key]) */
  value?: (row: T) => string | number | boolean | null | undefined;
  width?: number;
};

function cellText(v: unknown): string | number {
  if (v == null || v === '') return '';
  if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak';
  if (typeof v === 'number') return Number.isFinite(v) ? v : '';
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? '' : v.toLocaleString('id-ID');
  }
  if (Array.isArray(v)) return v.map((x) => cellText(x)).join('; ');
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v).replace(/\r?\n/g, ' ').trim();
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

function buildMatrix<T>(rows: T[], columns: OpsExportColumn<T>[]): (string | number)[][] {
  const header = columns.map((c) => c.header);
  const body = rows.map((row) =>
    columns.map((c) => {
      const raw = c.value ? c.value(row) : (row as any)?.[c.key];
      return cellText(raw);
    }),
  );
  return [header, ...body];
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** RFC4180-ish CSV with BOM for Excel ID locale */
export function exportOpsCsv<T>(
  rows: T[],
  columns: OpsExportColumn<T>[],
  fileBase: string,
): void {
  const matrix = buildMatrix(rows, columns);
  const lines = matrix.map((row) =>
    row
      .map((cell) => {
        const s = String(cell ?? '');
        if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      })
      .join(','),
  );
  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${fileBase}_${stamp()}.csv`);
}

export function exportOpsExcel<T>(
  rows: T[],
  columns: OpsExportColumn<T>[],
  fileBase: string,
  sheetName = 'Data',
): void {
  const matrix = buildMatrix(rows, columns);
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  ws['!cols'] = columns.map((c) => ({ wch: Math.min(48, Math.max(10, c.width || c.header.length + 4)) }));

  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: fileBase,
    Subject: 'Humanify Platform Ops export',
    Author: 'Humanify Ops',
    Company: 'Naincode',
    CreatedDate: new Date(),
  };
  const safeSheet = sheetName.replace(/[\\/?*[\]]/g, '').slice(0, 31) || 'Data';
  XLSX.utils.book_append_sheet(wb, ws, safeSheet);
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(
    new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${fileBase}_${stamp()}.xlsx`,
  );
}
