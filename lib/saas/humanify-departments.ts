/**
 * Lean department listing for Public API v1 — headcount by department code.
 */
import { HRIS_DEPARTMENTS, getDepartmentLabel } from '@/lib/hris/master-data';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

async function tableExists(name: string): Promise<boolean> {
  if (!sequelize) return false;
  const [rows] = await sequelize.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = :name LIMIT 1
  `, { replacements: { name } });
  return Boolean(rows?.length);
}

async function columnSet(table: string): Promise<Set<string>> {
  const [cols] = await sequelize.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = :table
  `, { replacements: { table } });
  return new Set((cols || []).map((c: any) => c.column_name));
}

export interface DepartmentLean {
  code: string;
  label: string;
  employeeCount: number;
}

export async function listTenantDepartmentsLean(tenantId: string): Promise<DepartmentLean[]> {
  if (!sequelize || !tenantId) {
    return HRIS_DEPARTMENTS.map((d) => ({ code: d.code, label: d.label, employeeCount: 0 }));
  }

  let table = '';
  if (await tableExists('employees')) table = 'employees';
  else if (await tableExists('hris_employees')) table = 'hris_employees';
  else {
    return HRIS_DEPARTMENTS.map((d) => ({ code: d.code, label: d.label, employeeCount: 0 }));
  }

  const cols = await columnSet(table);
  if (!cols.has('department') || !cols.has('tenant_id')) {
    return HRIS_DEPARTMENTS.map((d) => ({ code: d.code, label: d.label, employeeCount: 0 }));
  }

  const [rows] = await sequelize.query(`
    SELECT UPPER(TRIM(department)) AS code, COUNT(*)::int AS c
    FROM ${table}
    WHERE tenant_id = :tid
      AND department IS NOT NULL
      AND TRIM(department) <> ''
    GROUP BY UPPER(TRIM(department))
    ORDER BY c DESC, code ASC
  `, { replacements: { tid: tenantId } });

  const counts = new Map<string, number>();
  for (const r of rows || []) {
    const code = String(r.code || '').toUpperCase();
    if (!code) continue;
    counts.set(code, Number(r.c) || 0);
  }

  const known = new Set(HRIS_DEPARTMENTS.map((d) => d.code));
  const result: DepartmentLean[] = HRIS_DEPARTMENTS.map((d) => ({
    code: d.code,
    label: d.label,
    employeeCount: counts.get(d.code) || 0,
  }));

  for (const [code, employeeCount] of counts) {
    if (known.has(code)) continue;
    result.push({ code, label: getDepartmentLabel(code), employeeCount });
  }

  return result;
}
