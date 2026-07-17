/**
 * Schema-safe single employee create for Humanify (shared by HQ API + public v1).
 */
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

async function employeeColumns(): Promise<Set<string>> {
  if (!sequelize) return new Set();
  const [rows] = await sequelize.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees'
  `);
  return new Set((rows || []).map((r: any) => r.column_name));
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  phone?: string | null;
  position: string;
  department?: string | null;
  workLocation?: string | null;
  employmentCategory?: string | null;
}

export interface CreatedEmployeeLean {
  id: string;
  employeeNumber: string;
  name: string;
  email: string;
  phone: string | null;
  position: string;
  department: string;
  workLocation: string;
  status: string;
  joinDate: string;
}

export async function createTenantEmployeeLean(
  tenantId: string,
  input: CreateEmployeeInput,
): Promise<CreatedEmployeeLean> {
  if (!sequelize || !tenantId) throw new Error('Database unavailable');
  const cols = await employeeColumns();

  const [[countRow]] = await sequelize.query(
    `SELECT COUNT(*)::int AS c FROM employees WHERE tenant_id = :tid`,
    { replacements: { tid: tenantId } },
  );
  const count = Number(countRow?.c || 0);
  const tenantToken = String(tenantId).replace(/-/g, '').slice(0, 6).toUpperCase();
  const employeeCode = `EMP-${tenantToken}-${String(count + 1).padStart(3, '0')}`;

  const now = new Date();
  const newId = crypto.randomUUID();
  const fields: Array<[string, unknown]> = [];
  const add = (col: string, val: unknown) => {
    if (cols.size === 0 || cols.has(col)) fields.push([col, val]);
  };

  add('id', newId);
  add('employee_code', employeeCode);
  add('name', input.name);
  add('email', input.email);
  add('phone', input.phone || null);
  add('position', input.position);
  add('department', input.department || 'ADMINISTRATION');
  add('work_location', input.workLocation || 'ADMIN_OFFICE');
  add('work_role', 'staff');
  add('status', 'ACTIVE');
  add('is_active', true);
  add('hire_date', now);
  add('employment_category', input.employmentCategory || 'permanent');
  add('tenant_id', tenantId);
  add('created_at', now);
  add('updated_at', now);

  const colNames = fields.map((f) => `"${f[0]}"`).join(', ');
  const placeholders = fields.map((_, i) => `:v${i}`).join(', ');
  const repl: Record<string, unknown> = {};
  fields.forEach((f, i) => { repl[`v${i}`] = f[1]; });

  try {
    await sequelize.query(
      `INSERT INTO employees (${colNames}) VALUES (${placeholders})`,
      { replacements: repl },
    );
  } catch (e: any) {
    if (e?.original?.code === '23505' || e?.parent?.code === '23505') {
      throw Object.assign(new Error('Email atau kode karyawan sudah digunakan'), { statusCode: 409 });
    }
    throw e;
  }

  return {
    id: newId,
    employeeNumber: employeeCode,
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    position: input.position,
    department: input.department || 'ADMINISTRATION',
    workLocation: input.workLocation || 'ADMIN_OFFICE',
    status: 'ACTIVE',
    joinDate: now.toISOString(),
  };
}
