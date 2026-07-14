/**
 * Schema-safe employee listing for lean VPS `employees` table.
 */
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

function pickExpr(cols: Set<string>, candidates: string[], asAlias: string, fallbackSql = 'NULL'): string {
  for (const c of candidates) {
    if (cols.has(c)) return `${c} AS "${asAlias}"`;
  }
  return `${fallbackSql} AS "${asAlias}"`;
}

export async function listTenantEmployeesLean(
  tenantId: string,
  limit = 50,
): Promise<Record<string, unknown>[]> {
  if (!sequelize) return [];

  let table = '';
  if (await tableExists('employees')) table = 'employees';
  else if (await tableExists('hris_employees')) table = 'hris_employees';
  else return [];

  const cols = await columnSet(table);
  const select = [
    cols.has('id') ? 'id' : 'NULL AS id',
    pickExpr(cols, ['employee_number', 'employee_code', 'employee_id'], 'employeeNumber'),
    pickExpr(cols, ['name', 'full_name'], 'name', `''`),
    pickExpr(cols, ['email'], 'email'),
    pickExpr(cols, ['phone'], 'phone'),
    pickExpr(cols, ['department'], 'department'),
    pickExpr(cols, ['position'], 'position'),
    pickExpr(cols, ['status'], 'status'),
    pickExpr(cols, ['employment_type', 'employment_category'], 'employmentType'),
    pickExpr(cols, ['join_date', 'hire_date'], 'joinDate'),
  ].join(',\n      ');

  const order = cols.has('created_at') ? 'created_at DESC NULLS LAST' : 'id DESC';
  const [rows] = await sequelize.query(`
    SELECT ${select}
    FROM ${table}
    WHERE tenant_id = :tid
    ORDER BY ${order}
    LIMIT :lim
  `, { replacements: { tid: tenantId, lim: Math.min(5000, Math.max(1, limit)) } });
  return rows || [];
}
