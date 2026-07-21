import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { getDepartmentLabel } from '../../../lib/hris/master-data';
import { syncOrgDepartments } from '../../../lib/hris/sync-org-departments';
import { runCompensationAudit } from '@/lib/hris/compensation-bands';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch (e) {}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sortOrgNodes(nodes: any[]) {
  nodes.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.name || '').localeCompare(String(b.name || '')));
  nodes.forEach((n) => {
    if (n.children?.length) sortOrgNodes(n.children);
  });
}

async function ensureOrgTables() {
  if (!sequelize) return false;
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
  return true;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { action } = req.query;

    if (req.method === 'GET') {
      if (action === 'org-tree') return getOrgTree(req, res, session);
      if (action === 'org-list') return getOrgList(req, res, session);
      if (action === 'job-grades') return getJobGrades(req, res, session);
      if (action === 'compensation-audit') return getCompensationAudit(req, res, session);
      if (action === 'summary') return getOrgSummary(req, res, session);
      return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      if (action === 'org') return upsertOrg(req, res, session);
      if (action === 'job-grade') return upsertJobGrade(req, res, session);
      return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    if (req.method === 'DELETE') {
      if (action === 'org') return deleteOrg(req, res, session);
      if (action === 'job-grade') return deleteJobGrade(req, res, session);
      return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.warn('Organization API Error:', error?.message || error);
    return res.status(500).json({ success: false, error: error?.message || 'Internal server error' });
  }
}

export default withHQAuth(handler, { module: 'hris' });

// ===== GET: Org Tree (hierarchical) =====
async function getOrgTree(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [], flat: [], dataSource: 'empty' });
  const tenantId = (session.user as any)?.tenantId || null;
  if (!tenantId) return res.json({ success: true, data: [], flat: [], dataSource: 'empty' });

  try {
    await ensureOrgTables();
    // Do NOT seed Naincode master tree for SaaS tenants
    await syncOrgDepartments(sequelize, tenantId, { seedDefaults: false });
    const [rows] = await sequelize.query(`
      SELECT os.*,
        he.name AS head_name, he.employee_code AS head_code, he.position AS head_position,
        (SELECT COUNT(*)::int FROM employees e
          WHERE e.tenant_id = :tenantId
            AND COALESCE(e.is_active, true) = true
            AND (e.department = os.code OR e.department = os.name)
        ) AS employee_count
      FROM org_structures os
      LEFT JOIN employees he ON os.head_employee_id = he.id AND he.tenant_id = :tenantId
      WHERE os.is_active = true AND os.tenant_id = :tenantId
      ORDER BY os.level ASC, os.sort_order ASC, os.name ASC
    `, { replacements: { tenantId } });

    const map: Record<string, any> = {};
    const tree: any[] = [];
    (rows || []).forEach((r: any) => {
      r.children = [];
      map[r.id] = r;
    });
    (rows || []).forEach((r: any) => {
      if (r.parent_id && map[r.parent_id]) {
        map[r.parent_id].children.push(r);
      } else if (!r.parent_id) {
        tree.push(r);
      } else {
        tree.push(r);
      }
    });

    sortOrgNodes(tree);
    (rows || []).forEach((r: any) => {
      if (r.children?.length) sortOrgNodes(r.children);
    });

    return res.json({
      success: true,
      data: tree,
      flat: rows,
      dataSource: (rows || []).length > 0 ? 'live' : 'empty',
    });
  } catch (e: any) {
    console.warn('getOrgTree error:', e.message);
    return res.json({ success: true, data: [], flat: [], dataSource: 'empty' });
  }
}

// ===== GET: Org List (flat) =====
async function getOrgList(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [], dataSource: 'empty' });
  const tenantId = (session.user as any)?.tenantId || null;
  if (!tenantId) return res.json({ success: true, data: [], dataSource: 'empty' });
  try {
    await ensureOrgTables();
    const [rows] = await sequelize.query(`
      SELECT os.*, p.name AS parent_name
      FROM org_structures os
      LEFT JOIN org_structures p ON os.parent_id = p.id
      WHERE os.is_active = true AND os.tenant_id = :tenantId
      ORDER BY os.level ASC, os.sort_order ASC
    `, { replacements: { tenantId } });
    return res.json({ success: true, data: rows || [], dataSource: (rows || []).length > 0 ? 'live' : 'empty' });
  } catch {
    return res.json({ success: true, data: [], dataSource: 'empty' });
  }
}

// ===== GET: Job Grades =====
async function getCompensationAudit(req: NextApiRequest, res: NextApiResponse, session: any) {
  const tenantId = (session.user as any)?.tenantId || null;
  const audit = await runCompensationAudit(tenantId);
  return res.json({ success: true, data: audit, dataSource: audit.dataSource });
}

async function getJobGrades(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [], dataSource: 'empty' });
  const tenantId = (session.user as any)?.tenantId || null;
  if (!tenantId) return res.json({ success: true, data: [], dataSource: 'empty' });
  try {
    await ensureOrgTables();
    const [rows] = await sequelize.query(`
      SELECT jg.*,
        (SELECT COUNT(*)::int FROM employees e
          WHERE e.tenant_id = :tenantId AND e.job_grade_id::text = jg.id::text) AS employee_count
      FROM job_grades jg
      WHERE jg.is_active = true AND jg.tenant_id = :tenantId
      ORDER BY jg.level ASC
    `, { replacements: { tenantId } });
    return res.json({ success: true, data: rows || [], dataSource: (rows || []).length > 0 ? 'live' : 'empty' });
  } catch {
    return res.json({ success: true, data: [], dataSource: 'empty' });
  }
}

// ===== GET: Summary =====
async function getOrgSummary(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: {}, dataSource: 'empty' });
  const tenantId = (session.user as any)?.tenantId || null;
  if (!tenantId) return res.json({ success: true, data: {}, dataSource: 'empty' });
  try {
    await ensureOrgTables();
    await syncOrgDepartments(sequelize, tenantId, { seedDefaults: false });
    const [orgCount] = await sequelize.query(
      `SELECT COUNT(*)::int AS cnt FROM org_structures WHERE is_active = true AND tenant_id = :tenantId`,
      { replacements: { tenantId } },
    );
    const [gradeCount] = await sequelize.query(
      `SELECT COUNT(*)::int AS cnt FROM job_grades WHERE is_active = true AND tenant_id = :tenantId`,
      { replacements: { tenantId } },
    );
    const [empCount] = await sequelize.query(
      `SELECT COUNT(*)::int AS cnt FROM employees WHERE COALESCE(is_active, true) = true AND tenant_id = :tenantId`,
      { replacements: { tenantId } },
    );
    const [deptCounts] = await sequelize.query(`
      SELECT COALESCE(department, 'Other') AS department, COUNT(*)::int AS cnt
      FROM employees WHERE COALESCE(is_active, true) = true AND tenant_id = :tenantId
      GROUP BY department ORDER BY cnt DESC
    `, { replacements: { tenantId } });

    const departmentBreakdown = (deptCounts || []).map((d: any) => ({
      department: d.department,
      department_label: getDepartmentLabel(d.department),
      cnt: d.cnt,
    }));

    const units = Number(orgCount?.[0]?.cnt) || 0;
    const grades = Number(gradeCount?.[0]?.cnt) || 0;
    const employees = Number(empCount?.[0]?.cnt) || 0;

    return res.json({
      success: true,
      data: {
        // Canonical keys (UI cards)
        totalUnits: units,
        totalGrades: grades,
        totalJobGrades: grades,
        totalEmployees: employees,
        totalDepartments: units,
        departmentBreakdown,
        // Legacy aliases (older clients / smoke)
        orgUnits: units,
        jobGrades: grades,
        employees,
      },
      dataSource: employees > 0 || units > 0 ? 'live' : 'empty',
    });
  } catch (e: any) {
    console.warn('getOrgSummary error:', e.message);
    return res.json({ success: true, data: {}, dataSource: 'empty' });
  }
}

// ===== POST: Upsert Org =====
async function upsertOrg(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ success: false, error: 'Database tidak tersedia' });

  const { id, name, code, parent_id, level, sort_order, head_employee_id, description } = req.body;
  const tenantId = (session.user as any).tenantId || null;
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });

  if (!name?.trim()) return res.status(400).json({ success: false, error: 'Nama unit wajib diisi' });

  const cleanParentId = parent_id && UUID_RE.test(parent_id) ? parent_id : null;
  const cleanHeadId = head_employee_id && UUID_RE.test(head_employee_id) ? head_employee_id : null;
  const isUpdate = id && UUID_RE.test(id);

  if (isUpdate && cleanParentId === id) {
    return res.status(400).json({ success: false, error: 'Unit tidak boleh menjadi induk dirinya sendiri' });
  }

  try {
    await ensureOrgTables();

    if (cleanParentId) {
      const [[parentRow]] = await sequelize.query(
        `SELECT id, level FROM org_structures WHERE id = :parentId AND is_active = true AND tenant_id = :tenantId LIMIT 1`,
        { replacements: { parentId: cleanParentId, tenantId } }
      );
      if (!parentRow?.id) {
        return res.status(400).json({ success: false, error: 'Unit induk tidak ditemukan' });
      }
    }

    if (isUpdate) {
      const [, meta] = await sequelize.query(`
        UPDATE org_structures SET
          name = :name, code = :code, parent_id = :parent_id,
          level = :level, sort_order = :sort_order, head_employee_id = :head_employee_id,
          description = :description,
          metadata = COALESCE(metadata, '{}'::jsonb) || '{"source":"user","customized":true}'::jsonb,
          updated_at = NOW()
        WHERE id = :id AND tenant_id = :tenantId
      `, {
        replacements: {
          id, tenantId, name: name.trim(), code: code?.trim() || null,
          parent_id: cleanParentId, level: level ?? 0, sort_order: sort_order ?? 0,
          head_employee_id: cleanHeadId, description: description?.trim() || null,
        },
      });
      if ((meta as any)?.rowCount === 0) return res.status(404).json({ success: false, error: 'Unit tidak ditemukan' });
      return res.json({ success: true, message: 'Unit organisasi diperbarui' });
    }

    const [result] = await sequelize.query(`
      INSERT INTO org_structures (tenant_id, name, code, parent_id, level, sort_order, head_employee_id, description, metadata)
      VALUES (:tenantId, :name, :code, :parent_id, :level, :sort_order, :head_employee_id, :description, '{"source":"user"}'::jsonb)
      RETURNING *
    `, {
      replacements: {
        tenantId, name: name.trim(), code: code?.trim() || null,
        parent_id: cleanParentId, level: level ?? 0, sort_order: sort_order ?? 0,
        head_employee_id: cleanHeadId, description: description?.trim() || null,
      },
    });

    return res.json({ success: true, data: result[0], message: 'Unit organisasi berhasil dibuat' });
  } catch (e: any) {
    console.warn('upsertOrg error:', e.message);
    return res.status(500).json({ success: false, error: e.message || 'Gagal menyimpan unit organisasi' });
  }
}

// ===== POST: Upsert Job Grade =====
async function upsertJobGrade(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ success: false, error: 'Database tidak tersedia' });

  const { id, code, name, level, min_salary, max_salary, salary_min, salary_max, benefits, leave_quota, description } = req.body;
  const tenantId = (session.user as any).tenantId || null;
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
  const minSal = min_salary ?? salary_min ?? 0;
  const maxSal = max_salary ?? salary_max ?? 0;

  if (!code?.trim() || !name?.trim()) {
    return res.status(400).json({ success: false, error: 'Kode dan nama golongan wajib diisi' });
  }

  const isUpdate = id && UUID_RE.test(id);

  try {
    await ensureOrgTables();

    if (isUpdate) {
      const [, meta] = await sequelize.query(`
        UPDATE job_grades SET code = :code, name = :name, level = :level,
          min_salary = :min_salary, max_salary = :max_salary, benefits = :benefits::jsonb,
          leave_quota = :leave_quota::jsonb, description = :description, updated_at = NOW()
        WHERE id = :id AND tenant_id = :tenantId
      `, {
        replacements: {
          id, tenantId, code: code.trim(), name: name.trim(), level: level || 1,
          min_salary: minSal, max_salary: maxSal,
          benefits: JSON.stringify(benefits || []),
          leave_quota: JSON.stringify(leave_quota || {}),
          description: description?.trim() || null,
        },
      });
      if ((meta as any)?.rowCount === 0) return res.status(404).json({ success: false, error: 'Golongan tidak ditemukan' });
      return res.json({ success: true, message: 'Golongan jabatan diperbarui' });
    }

    const [result] = await sequelize.query(`
      INSERT INTO job_grades (tenant_id, code, name, level, min_salary, max_salary, benefits, leave_quota, description, sort_order)
      VALUES (:tenantId, :code, :name, :level, :min_salary, :max_salary, :benefits::jsonb, :leave_quota::jsonb, :description, :level)
      RETURNING *
    `, {
      replacements: {
        tenantId, code: code.trim(), name: name.trim(), level: level || 1,
        min_salary: minSal, max_salary: maxSal,
        benefits: JSON.stringify(benefits || []),
        leave_quota: JSON.stringify(leave_quota || {}),
        description: description?.trim() || null,
      },
    });

    return res.json({ success: true, data: result[0], message: 'Golongan jabatan berhasil dibuat' });
  } catch (e: any) {
    console.warn('upsertJobGrade error:', e.message);
    return res.status(500).json({ success: false, error: e.message || 'Gagal menyimpan golongan jabatan' });
  }
}

// ===== DELETE: Org =====
async function deleteOrg(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ success: false, error: 'Database tidak tersedia' });
  const id = String(req.query.id || req.body?.id || '').trim();
  if (!id || !UUID_RE.test(id)) return res.status(400).json({ success: false, error: 'ID tidak valid' });
  const tenantId = (session.user as any)?.tenantId || null;
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });

  try {
    await ensureOrgTables();
    const [, meta] = await sequelize.query(
      `UPDATE org_structures SET is_active = false, metadata = COALESCE(metadata, '{}'::jsonb) || '{"deleted":true}'::jsonb, updated_at = NOW()
       WHERE id = :id AND tenant_id = :tenantId`,
      { replacements: { id, tenantId } },
    );
    if ((meta as any)?.rowCount === 0) return res.status(404).json({ success: false, error: 'Unit tidak ditemukan' });
    return res.json({ success: true, message: 'Unit organisasi dihapus' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== DELETE: Job Grade =====
async function deleteJobGrade(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.status(503).json({ success: false, error: 'Database tidak tersedia' });
  const id = String(req.query.id || req.body?.id || '').trim();
  if (!id || !UUID_RE.test(id)) return res.status(400).json({ success: false, error: 'ID tidak valid' });
  const tenantId = (session.user as any)?.tenantId || null;
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });

  try {
    await ensureOrgTables();
    const [, meta] = await sequelize.query(
      `UPDATE job_grades SET is_active = false, updated_at = NOW() WHERE id = :id AND tenant_id = :tenantId`,
      { replacements: { id, tenantId } },
    );
    if ((meta as any)?.rowCount === 0) return res.status(404).json({ success: false, error: 'Golongan tidak ditemukan' });
    return res.json({ success: true, message: 'Golongan jabatan dihapus' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
