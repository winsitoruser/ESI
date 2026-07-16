import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../lib/middleware/withHQAuth';
import {
  HRIS_DEPARTMENTS,
  HRIS_WORK_LOCATIONS,
} from '../../../lib/hris/master-data';
import { HRIS_TEAM_WORK_AREAS } from '../../../lib/hris/team-member-sync';
import { syncOrgDepartments, fetchDepartmentsFromOrg } from '../../../lib/hris/sync-org-departments';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';

const ESI_HQ_BRANCH = {
  id: 'esi-hq',
  code: 'ESI-HQ',
  name: 'Kantor Pusat ESI',
  city: 'Jakarta',
};

async function ensureOrgTables(sequelize: any) {
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS org_structures (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      name VARCHAR(200) NOT NULL,
      code VARCHAR(50),
      parent_id UUID,
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
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS job_grades (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      code VARCHAR(20) NOT NULL,
      name VARCHAR(100) NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      min_salary DECIMAL(15,2) DEFAULT 0,
      max_salary DECIMAL(15,2) DEFAULT 0,
      benefits JSONB DEFAULT '[]',
      leave_quota JSONB DEFAULT '{}',
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function seedDefaultOrg(sequelize: any, tenantId?: string | null) {
  const [existing] = await sequelize.query(`SELECT COUNT(*)::int AS c FROM org_structures`);
  if ((existing[0]?.c || 0) > 0) return;

  const units = [
    { code: 'ESI-GROUP', name: 'PT Ekosistem Satwa Indonesia', level: 0, parent: null },
    { code: 'OPERATIONS', name: 'Operasional', level: 1, parent: 'ESI-GROUP' },
    { code: 'SALES', name: 'Penjualan & Marketing', level: 1, parent: 'ESI-GROUP' },
    { code: 'FINANCE', name: 'Keuangan', level: 1, parent: 'ESI-GROUP' },
    { code: 'HR', name: 'SDM & Administrasi', level: 1, parent: 'ESI-GROUP' },
    { code: 'IT', name: 'Teknologi Informasi', level: 1, parent: 'ESI-GROUP' },
  ];

  const idMap: Record<string, string> = {};
  for (const u of units) {
    const [rows] = await sequelize.query(
      `INSERT INTO org_structures (tenant_id, name, code, parent_id, level, is_active)
       VALUES (:tenantId, :name, :code, :parentId, :level, true)
       RETURNING id`,
      {
        replacements: {
          tenantId: tenantId || null,
          name: u.name,
          code: u.code,
          parentId: u.parent ? idMap[u.parent] : null,
          level: u.level,
        },
      }
    );
    idMap[u.code] = rows[0]?.id;
  }

  const grades = [
    { code: 'E1', name: 'Eksekutif', level: 1, min: 20000000, max: 50000000 },
    { code: 'M1', name: 'Manajer', level: 3, min: 10000000, max: 18000000 },
    { code: 'S1', name: 'Supervisor', level: 4, min: 7000000, max: 12000000 },
    { code: 'S2', name: 'Staf', level: 6, min: 4000000, max: 6000000 },
  ];
  for (const g of grades) {
    await sequelize.query(
      `INSERT INTO job_grades (tenant_id, code, name, level, min_salary, max_salary, is_active)
       VALUES (:tenantId, :code, :name, :level, :min, :max, true)`,
      { replacements: { tenantId: tenantId || null, ...g } }
    );
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = (req as any).session;
  const tenantId = tenantIdFromSession(session);

  // Empty for SaaS tenants until they create their own branches — never leak other tenants / ESI stub.
  let branches: Array<{ id: string; code: string; name: string; city: string }> = [];
  let orgUnits: any[] = [];
  let jobGrades: any[] = [];
  // Catalog taxonomy for forms (not company operational rows). Prefer org-derived when available.
  let departments = HRIS_DEPARTMENTS;

  try {
    const sequelize = require('../../../lib/sequelize');

    if (tenantId) {
      const [branchRows] = await sequelize.query(
        `SELECT id, code, name, city FROM branches
         WHERE tenant_id = :tenantId AND is_active IS NOT FALSE
         ORDER BY name ASC LIMIT 100`,
        { replacements: { tenantId } }
      );
      if (branchRows?.length) {
        branches = branchRows.map((b: any) => ({
          id: String(b.id),
          code: b.code || '',
          name: b.name || '',
          city: b.city || '',
        }));
      }

      await ensureOrgTables(sequelize);
      await syncOrgDepartments(sequelize, tenantId);
      departments = await fetchDepartmentsFromOrg(sequelize, tenantId);

      const tenantClause = 'WHERE tenant_id = :tenantId';
      const [orgRows] = await sequelize.query(
        `SELECT id, name, code, parent_id, level, description
         FROM org_structures ${tenantClause}
         ORDER BY level ASC, sort_order ASC, name ASC`,
        { replacements: { tenantId } }
      );
      orgUnits = (orgRows || []).map((o: any) => ({
        id: String(o.id),
        name: o.name,
        code: o.code || '',
        parentId: o.parent_id,
        level: o.level,
        description: o.description,
        /** Kode org yang cocok dengan kode departemen master (jika sama) */
        departmentCode: HRIS_DEPARTMENTS.some((d) => d.code === o.code) ? o.code : null,
      }));

      const [gradeRows] = await sequelize.query(
        `SELECT id, code, name, level, min_salary, max_salary, description
         FROM job_grades ${tenantClause}
         ORDER BY level ASC, sort_order ASC`,
        { replacements: { tenantId } }
      );
      jobGrades = (gradeRows || []).map((g: any) => ({
        id: String(g.id),
        code: g.code,
        name: g.name,
        level: g.level,
        salaryMin: g.min_salary,
        salaryMax: g.max_salary,
        description: g.description,
      }));
    }
  } catch {
    /* fallback stub */
  }

  return res.status(200).json({
    success: true,
    data: {
      departments: departments.length ? departments : HRIS_DEPARTMENTS,
      workLocations: HRIS_WORK_LOCATIONS,
      teamWorkAreas: HRIS_TEAM_WORK_AREAS,
      branches,
      orgUnits,
      jobGrades,
    },
  });
}

export default withHQAuth(handler, { module: 'hris' });
