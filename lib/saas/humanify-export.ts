/**
 * Humanify SaaS Phase 5 — tenant data export (portability)
 */
import { listTenantEmployeesLean } from './humanify-employees';

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: any[][]): string {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(','));
  }
  return lines.join('\n');
}

export async function exportTenantEmployeesCsv(tenantId: string): Promise<{
  filename: string;
  csv: string;
  count: number;
}> {
  const rows = await listTenantEmployeesLean(tenantId, 5000);
  const headers = [
    'id', 'employeeNumber', 'name', 'email', 'phone', 'department', 'position',
    'employmentType', 'status', 'joinDate',
  ];
  const data = rows.map((row) => headers.map((h) => row[h]));
  const stamp = new Date().toISOString().slice(0, 10);
  return {
    filename: `humanify-employees-${stamp}.csv`,
    csv: toCsv(headers, data),
    count: rows.length,
  };
}

export async function exportTenantBundle(tenantId: string): Promise<{
  exportedAt: string;
  tenantId: string;
  employees: { count: number; csv: string };
  careersUrlHint: string;
}> {
  const emp = await exportTenantEmployeesCsv(tenantId);
  return {
    exportedAt: new Date().toISOString(),
    tenantId,
    employees: { count: emp.count, csv: emp.csv },
    careersUrlHint: '/c/{slug}/careers',
  };
}
