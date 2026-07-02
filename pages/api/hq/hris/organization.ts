import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

let sequelize: any;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { action } = req.query;

    if (req.method === 'GET') {
      if (action === 'org-tree') return getOrgTree(req, res);
      if (action === 'org-list') return getOrgList(req, res);
      if (action === 'job-grades') return getJobGrades(req, res);
      if (action === 'summary') return getOrgSummary(req, res);
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      if (action === 'org') return upsertOrg(req, res, session);
      if (action === 'job-grade') return upsertJobGrade(req, res, session);
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'DELETE') {
      if (action === 'org') return deleteOrg(req, res);
      if (action === 'job-grade') return deleteJobGrade(req, res);
      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Organization API Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ===== GET: Org Tree (hierarchical) =====
async function getOrgTree(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: [] });

  const [rows] = await sequelize.query(`
    SELECT os.*, 
      he.name as head_name, he.employee_id as head_code, he.position as head_position,
      (SELECT COUNT(*) FROM employees e WHERE e.org_structure_id = os.id::text) as employee_count
    FROM org_structures os
    LEFT JOIN employees he ON os.head_employee_id::integer = he.id
    WHERE os.is_active = true
    ORDER BY os.level ASC, os.sort_order ASC, os.name ASC
  `);

  // Build tree
  const map: Record<string, any> = {};
  const tree: any[] = [];
  (rows || []).forEach((r: any) => {
    r.children = [];
    map[r.id] = r;
  });
  (rows || []).forEach((r: any) => {
    if (r.parent_id && map[r.parent_id]) {
      map[r.parent_id].children.push(r);
    } else {
      tree.push(r);
    }
  });

  return res.json({ success: true, data: tree, flat: rows });
}

// ===== GET: Org List (flat) =====
async function getOrgList(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const [rows] = await sequelize.query(`
    SELECT os.*, p.name as parent_name
    FROM org_structures os
    LEFT JOIN org_structures p ON os.parent_id = p.id
    ORDER BY os.level ASC, os.sort_order ASC
  `);
  return res.json({ success: true, data: rows || [] });
}

// ===== GET: Job Grades =====
async function getJobGrades(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const [rows] = await sequelize.query(`
    SELECT jg.*,
      (SELECT COUNT(*) FROM employees e WHERE e.job_grade_id = jg.id::text) as employee_count
    FROM job_grades jg
    WHERE jg.is_active = true
    ORDER BY jg.level ASC
  `);
  return res.json({ success: true, data: rows || [] });
}

// ===== GET: Summary =====
async function getOrgSummary(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: {} });
  const [orgCount] = await sequelize.query(`SELECT COUNT(*) as cnt FROM org_structures WHERE is_active = true`);
  const [gradeCount] = await sequelize.query(`SELECT COUNT(*) as cnt FROM job_grades WHERE is_active = true`);
  const [empCount] = await sequelize.query(`SELECT COUNT(*) as cnt FROM employees WHERE status = 'ACTIVE'`);
  const [deptCounts] = await sequelize.query(`SELECT department, COUNT(*) as cnt FROM employees WHERE status = 'ACTIVE' GROUP BY department ORDER BY cnt DESC`);

  return res.json({
    success: true,
    data: {
      totalUnits: parseInt(orgCount[0].cnt),
      totalGrades: parseInt(gradeCount[0].cnt),
      totalEmployees: parseInt(empCount[0].cnt),
      departmentBreakdown: deptCounts || []
    }
  });
}

// ===== POST: Upsert Org =====
async function upsertOrg(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true });
  const { id, name, code, parent_id, level, sort_order, head_employee_id, description } = req.body;
  const tenantId = (session.user as any).tenantId;

  if (!name) return res.status(400).json({ error: 'name required' });

  if (id) {
    await sequelize.query(`
      UPDATE org_structures SET name = :name, code = :code, parent_id = :parent_id, 
        level = :level, sort_order = :sort_order, head_employee_id = :head_employee_id,
        description = :description, updated_at = NOW()
      WHERE id = :id
    `, { replacements: { id, name, code: code || null, parent_id: parent_id || null, level: level || 0, sort_order: sort_order || 0, head_employee_id: head_employee_id || null, description: description || null } });
    return res.json({ success: true, message: 'Updated' });
  } else {
    const [result] = await sequelize.query(`
      INSERT INTO org_structures (tenant_id, name, code, parent_id, level, sort_order, head_employee_id, description)
      VALUES (:tenantId, :name, :code, :parent_id, :level, :sort_order, :head_employee_id, :description) RETURNING *
    `, { replacements: { tenantId, name, code: code || null, parent_id: parent_id || null, level: level || 0, sort_order: sort_order || 0, head_employee_id: head_employee_id || null, description: description || null } });
    return res.json({ success: true, data: result[0] || result, message: 'Created' });
  }
}

// ===== POST: Upsert Job Grade =====
async function upsertJobGrade(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true });
  const { id, code, name, level, min_salary, max_salary, benefits, leave_quota, description } = req.body;
  const tenantId = (session.user as any).tenantId;

  if (!code || !name) return res.status(400).json({ error: 'code and name required' });

  if (id) {
    await sequelize.query(`
      UPDATE job_grades SET code = :code, name = :name, level = :level, 
        min_salary = :min_salary, max_salary = :max_salary, benefits = :benefits,
        leave_quota = :leave_quota, description = :description, updated_at = NOW()
      WHERE id = :id
    `, { replacements: { id, code, name, level: level || 1, min_salary: min_salary || 0, max_salary: max_salary || 0, benefits: JSON.stringify(benefits || []), leave_quota: JSON.stringify(leave_quota || {}), description: description || null } });
    return res.json({ success: true, message: 'Updated' });
  } else {
    const [result] = await sequelize.query(`
      INSERT INTO job_grades (tenant_id, code, name, level, min_salary, max_salary, benefits, leave_quota, description, sort_order)
      VALUES (:tenantId, :code, :name, :level, :min_salary, :max_salary, :benefits, :leave_quota, :description, :level) RETURNING *
    `, { replacements: { tenantId, code, name, level: level || 1, min_salary: min_salary || 0, max_salary: max_salary || 0, benefits: JSON.stringify(benefits || []), leave_quota: JSON.stringify(leave_quota || {}), description: description || null } });
    return res.json({ success: true, data: result[0] || result, message: 'Created' });
  }
}

// ===== DELETE: Org =====
async function deleteOrg(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true });
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  // Soft delete
  await sequelize.query(`UPDATE org_structures SET is_active = false, updated_at = NOW() WHERE id = :id`, { replacements: { id } });
  return res.json({ success: true, message: 'Deleted' });
}

// ===== DELETE: Job Grade =====
async function deleteJobGrade(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true });
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  await sequelize.query(`UPDATE job_grades SET is_active = false, updated_at = NOW() WHERE id = :id`, { replacements: { id } });
  return res.json({ success: true, message: 'Deleted' });
}
