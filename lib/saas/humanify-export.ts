/**
 * Humanify SaaS Phase 5 — tenant data export (portability)
 */
let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

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

async function tableExists(name: string): Promise<boolean> {
  if (!sequelize) return false;
  const [rows] = await sequelize.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = :name
    LIMIT 1
  `, { replacements: { name } });
  return Boolean(rows?.length);
}

export async function exportTenantEmployeesCsv(tenantId: string): Promise<{
  filename: string;
  csv: string;
  count: number;
}> {
  if (!sequelize) throw new Error('Database unavailable');

  let rows: any[] = [];
  if (await tableExists('employees')) {
    const [r] = await sequelize.query(`
      SELECT id, employee_number, name, email, phone, department, position,
             employment_type, status, join_date, created_at
      FROM employees
      WHERE tenant_id = :tid
      ORDER BY created_at DESC NULLS LAST
      LIMIT 5000
    `, { replacements: { tid: tenantId } });
    rows = r || [];
  } else if (await tableExists('hris_employees')) {
    const [r] = await sequelize.query(`
      SELECT id, employee_number, name, email, phone, department, position,
             employment_type, status, join_date, created_at
      FROM hris_employees
      WHERE tenant_id = :tid
      ORDER BY created_at DESC NULLS LAST
      LIMIT 5000
    `, { replacements: { tid: tenantId } });
    rows = r || [];
  }

  const headers = [
    'id', 'employee_number', 'name', 'email', 'phone', 'department', 'position',
    'employment_type', 'status', 'join_date', 'created_at',
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
