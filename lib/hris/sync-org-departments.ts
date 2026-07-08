/**
 * Sinkronisasi org_structures ↔ HRIS_DEPARTMENTS (SSOT departemen).
 */
import { HRIS_DEPARTMENTS, getDepartmentLabel } from './master-data';

export const ROOT_ORG_CODE = 'NAINCODE-GROUP';
export const ROOT_ORG_NAME = 'Naincode Inti Teknologi';

/** Legacy dept codes → kode master resmi */
export const DEPARTMENT_ALIASES: Record<string, string> = {
  KITCHEN: 'PRODUCTION',
  Kitchen: 'PRODUCTION',
  Operations: 'OPERATIONS',
  'IT & Admin': 'IT',
  HQ: 'MANAGEMENT',
  Humanify: 'IT',
};

export async function ensureOrgTables(sequelize: any) {
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS org_structures (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      name VARCHAR(200) NOT NULL,
      code VARCHAR(50),
      parent_id UUID REFERENCES org_structures(id) ON DELETE SET NULL,
      level INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      head_employee_id UUID,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function syncOrgDepartments(sequelize: any, tenantId?: string | null) {
  await ensureOrgTables(sequelize);

  // Normalisasi karyawan dengan kode legacy
  for (const [legacy, canonical] of Object.entries(DEPARTMENT_ALIASES)) {
    await sequelize.query(
      `UPDATE employees SET department = :canonical
       WHERE UPPER(TRIM(department)) = UPPER(TRIM(:legacy)) AND department IS DISTINCT FROM :canonical`,
      { replacements: { legacy, canonical } }
    );
  }

  // Root group
  let [[root]] = await sequelize.query(
    `SELECT id FROM org_structures WHERE code = :code LIMIT 1`,
    { replacements: { code: ROOT_ORG_CODE } }
  );

  if (!root?.id) {
    const [[legacyRoot]] = await sequelize.query(
      `SELECT id FROM org_structures WHERE code IN ('ESI-GROUP', 'HQ', 'Humanify') AND parent_id IS NULL ORDER BY created_at ASC LIMIT 1`
    );
    if (legacyRoot?.id) {
      await sequelize.query(
        `UPDATE org_structures SET code = :code, name = :name, level = 0, updated_at = NOW() WHERE id = :id`,
        { replacements: { code: ROOT_ORG_CODE, name: ROOT_ORG_NAME, id: legacyRoot.id } }
      );
      root = legacyRoot;
    } else {
      const [ins] = await sequelize.query(
        `INSERT INTO org_structures (tenant_id, name, code, parent_id, level, sort_order, is_active)
         VALUES (:tenantId, :name, :code, NULL, 0, 0, true) RETURNING id`,
        { replacements: { tenantId: tenantId || null, name: ROOT_ORG_NAME, code: ROOT_ORG_CODE } }
      );
      root = ins[0];
    }
  }

  const rootId = root.id;
  let order = 0;
  for (const dept of HRIS_DEPARTMENTS) {
    order += 1;
    const [[existing]] = await sequelize.query(
      `SELECT id FROM org_structures WHERE code = :code LIMIT 1`,
      { replacements: { code: dept.code } }
    );
    if (existing?.id) {
      await sequelize.query(
        `UPDATE org_structures SET name = :name, parent_id = :parentId, level = 1,
         sort_order = :sortOrder, is_active = true, updated_at = NOW() WHERE id = :id`,
        { replacements: { name: dept.label, parentId: rootId, sortOrder: order, id: existing.id } }
      );
    } else {
      await sequelize.query(
        `INSERT INTO org_structures (tenant_id, name, code, parent_id, level, sort_order, is_active)
         VALUES (:tenantId, :name, :code, :parentId, 1, :sortOrder, true)`,
        {
          replacements: {
            tenantId: tenantId || null,
            name: dept.label,
            code: dept.code,
            parentId: rootId,
            sortOrder: order,
          },
        }
      );
    }
  }

  // Nonaktifkan unit legacy yang bukan master dept & bukan root
  const masterCodes = HRIS_DEPARTMENTS.map((d) => d.code);
  await sequelize.query(
    `UPDATE org_structures SET is_active = false, updated_at = NOW()
     WHERE is_active = true
       AND code IS NOT NULL
       AND code NOT IN (:rootCode, :codes)
       AND (parent_id = :rootId OR parent_id IS NULL AND code NOT IN (:rootCode))`,
    { replacements: { rootCode: ROOT_ORG_CODE, codes: masterCodes, rootId } }
  );
}

export async function fetchDepartmentsFromOrg(sequelize: any, tenantId?: string | null) {
  const tenantClause = tenantId
    ? 'AND (os.tenant_id = :tenantId OR os.tenant_id IS NULL)'
    : '';
  const [rows] = await sequelize.query(
    `SELECT os.code, os.name
     FROM org_structures os
     INNER JOIN org_structures root ON root.code = :rootCode
     WHERE os.is_active = true
       AND os.parent_id = root.id
       AND os.code IS NOT NULL
       ${tenantClause}
     ORDER BY os.sort_order ASC, os.name ASC`,
    { replacements: { rootCode: ROOT_ORG_CODE, tenantId } }
  );

  if (!rows?.length) return HRIS_DEPARTMENTS;

  return (rows as { code: string; name: string }[]).map((r) => ({
    code: r.code,
    label: r.name || getDepartmentLabel(r.code),
  }));
}
