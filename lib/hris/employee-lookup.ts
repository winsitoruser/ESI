import { normalizeEmployeeRecord } from './master-data';

let sequelize: any;
try {
  sequelize = require('../sequelize');
} catch {
  sequelize = null;
}

export type HrisEmployeeRow = ReturnType<typeof normalizeEmployeeRecord> & { id: string };

export async function loadEmployeeById(
  empId: string,
  tenantId?: string | null
): Promise<HrisEmployeeRow | null> {
  if (!sequelize || !empId) return null;

  const tenantClause = tenantId ? 'AND e.tenant_id = :tenantId' : '';
  const sqlWithLoc = `
    SELECT e.id, e.employee_code AS employee_id, e.name, e.email, e.phone AS phone_number,
      e.position, e.department, e.status, e.hire_date AS join_date,
      e.branch_id, b.name AS branch_name, e.work_location
    FROM employees e
    LEFT JOIN branches b ON e.branch_id = b.id
    WHERE e.id = :empId ${tenantClause}
    LIMIT 1
  `;
  const sqlBasic = sqlWithLoc.replace('e.work_location', "NULL::varchar AS work_location");

  try {
    const [rows] = await sequelize.query(sqlWithLoc, {
      replacements: { empId, tenantId },
    });
    if (rows?.[0]) return normalizeEmployeeRecord(rows[0]) as HrisEmployeeRow;
  } catch {
    const [rows] = await sequelize.query(sqlBasic, {
      replacements: { empId, tenantId },
    });
    if (rows?.[0]) return normalizeEmployeeRecord(rows[0]) as HrisEmployeeRow;
  }
  return null;
}

export async function loadEmployeesList(
  opts: { tenantId?: string | null; limit?: number; search?: string; activeOnly?: boolean } = {}
): Promise<HrisEmployeeRow[]> {
  if (!sequelize) return [];

  const { tenantId, limit = 200, search, activeOnly = true } = opts;
  let where = 'WHERE 1=1';
  const replacements: Record<string, unknown> = { limit };

  if (tenantId) {
    where += ' AND e.tenant_id = :tenantId';
    replacements.tenantId = tenantId;
  }
  if (activeOnly) {
    where += ` AND (e.is_active IS NOT FALSE AND (e.status IS NULL OR e.status IN ('active','ACTIVE')))`;
  }
  if (search) {
    where += ` AND (
      e.name ILIKE :search OR e.employee_code ILIKE :search OR e.email ILIKE :search
      OR e.position ILIKE :search OR e.department ILIKE :search
    )`;
    replacements.search = `%${search}%`;
  }

  const sqlWithLoc = `
    SELECT e.id, e.employee_code AS employee_id, e.name, e.email, e.phone AS phone_number,
      e.position, e.department, e.status, e.hire_date AS join_date,
      e.branch_id, b.name AS branch_name, e.work_location
    FROM employees e
    LEFT JOIN branches b ON e.branch_id = b.id
    ${where}
    ORDER BY e.name ASC
    LIMIT :limit
  `;
  const sqlBasic = sqlWithLoc.replace('e.work_location', "NULL::varchar AS work_location");

  try {
    const [rows] = await sequelize.query(sqlWithLoc, { replacements });
    return (rows || []).map((r: Record<string, unknown>) => normalizeEmployeeRecord(r) as HrisEmployeeRow);
  } catch {
    const [rows] = await sequelize.query(sqlBasic, { replacements });
    return (rows || []).map((r: Record<string, unknown>) => normalizeEmployeeRecord(r) as HrisEmployeeRow);
  }
}
