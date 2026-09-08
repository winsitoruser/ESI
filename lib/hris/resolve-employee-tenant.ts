/**
 * Platform ops (super_admin) often have no session tenantId.
 * Derive tenant from the employee row so detail/upload/list sub-data still work
 * under FORCE RLS (inserts need a real tenant_id).
 */

const SUB_TABLES = new Set([
  'employee_families',
  'employee_educations',
  'employee_certifications',
  'employee_skills',
  'employee_work_experiences',
  'employee_documents',
  'employee_contracts',
]);

export function isPlatformOpsSession(session: any): boolean {
  const role = String(session?.user?.role || '').toLowerCase();
  return ['super_admin', 'superadmin', 'platform_admin'].includes(role);
}

export async function lookupEmployeeTenantId(
  sequelize: any,
  employeeId: string | number | null | undefined,
): Promise<string | null> {
  if (!sequelize || employeeId == null || employeeId === '') return null;
  try {
    const [rows]: any = await sequelize.query(
      `SELECT tenant_id FROM employees WHERE id = :empId LIMIT 1`,
      { replacements: { empId: employeeId } },
    );
    const tid = rows?.[0]?.tenant_id;
    return tid ? String(tid) : null;
  } catch {
    return null;
  }
}

export async function lookupRowTenantId(
  sequelize: any,
  table: string,
  id: string | null | undefined,
): Promise<string | null> {
  if (!sequelize || !id || !SUB_TABLES.has(table)) return null;
  try {
    const [rows]: any = await sequelize.query(
      `SELECT tenant_id FROM ${table} WHERE id = :id LIMIT 1`,
      { replacements: { id } },
    );
    const tid = rows?.[0]?.tenant_id;
    return tid ? String(tid) : null;
  } catch {
    return null;
  }
}

export async function lookupDocumentTenantId(
  sequelize: any,
  documentId: string | null | undefined,
): Promise<string | null> {
  return lookupRowTenantId(sequelize, 'employee_documents', documentId);
}

/**
 * First tenant that already has employees, else earliest tenant row.
 * Used when platform ops have no session tenantId (prod superadmin).
 * Always join `tenants` — orphaned employee.tenant_id values abort FK inserts.
 */
export async function lookupDefaultTenantId(sequelize: any): Promise<string | null> {
  if (!sequelize) return null;
  const { safeQueryWithSavepoint } = require('../saas/tenant-request-bound');
  const fromEmp = await safeQueryWithSavepoint(
    sequelize,
    `SELECT t.id
     FROM employees e
     INNER JOIN tenants t ON t.id = e.tenant_id
     WHERE e.tenant_id IS NOT NULL
     LIMIT 1`,
    {},
    'default_tid_emp',
  );
  if (fromEmp?.[0]?.id) return String(fromEmp[0].id);
  const fromT = await safeQueryWithSavepoint(
    sequelize,
    `SELECT id FROM tenants
     WHERE COALESCE(status, 'active') NOT IN ('archived')
     ORDER BY created_at ASC
     LIMIT 1`,
    {},
    'default_tid_active',
  );
  if (fromT?.[0]?.id) return String(fromT[0].id);
  const anyT = await safeQueryWithSavepoint(
    sequelize,
    `SELECT id FROM tenants LIMIT 1`,
    {},
    'default_tid_any',
  );
  return anyT?.[0]?.id ? String(anyT[0].id) : null;
}

export async function tenantIdExists(sequelize: any, tenantId: string | null | undefined): Promise<boolean> {
  if (!sequelize || !tenantId) return false;
  try {
    const { safeQueryWithSavepoint } = require('../saas/tenant-request-bound');
    const rows = await safeQueryWithSavepoint(
      sequelize,
      `SELECT 1 FROM tenants WHERE id = :id LIMIT 1`,
      { id: String(tenantId) },
      'tenant_exists',
    );
    return Boolean(rows?.[0]);
  } catch {
    return false;
  }
}

export async function resolveEffectiveTenantId(opts: {
  sequelize: any;
  session: any;
  sessionTenantId?: string | null;
  employeeId?: string | number | null;
  documentId?: string | null;
}): Promise<string | null> {
  const sessionTid = opts.sessionTenantId ? String(opts.sessionTenantId) : null;
  if (sessionTid) return sessionTid;
  if (!isPlatformOpsSession(opts.session)) return null;
  if (opts.employeeId != null && opts.employeeId !== '') {
    const fromEmp = await lookupEmployeeTenantId(opts.sequelize, opts.employeeId);
    if (fromEmp) return fromEmp;
  }
  if (opts.documentId) {
    const fromDoc = await lookupDocumentTenantId(opts.sequelize, opts.documentId);
    if (fromDoc) return fromDoc;
  }
  return lookupDefaultTenantId(opts.sequelize);
}
