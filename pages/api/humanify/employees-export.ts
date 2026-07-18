/**
 * Export employees as CSV (tenant-scoped). No salary/NIK by default.
 *   GET /api/humanify/employees-export?format=csv&department=&status=&search=
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../lib/middleware/withHQAuth';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch { /* */ }

const MAX_ROWS = 5000;

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  if (!sequelize) {
    return res.status(503).json({ success: false, error: 'Database unavailable' });
  }

  const session = (req as any).session;
  const tenantId = session?.user?.tenantId || null;
  const { search, department, status, format } = req.query;
  if (format && String(format) !== 'csv') {
    return res.status(400).json({ success: false, error: 'Hanya format=csv' });
  }

  let where = 'WHERE 1=1';
  const replacements: Record<string, unknown> = {};
  if (tenantId) {
    where += ' AND e.tenant_id = :tenantId';
    replacements.tenantId = tenantId;
  }
  if (search) {
    where += ` AND (e.name ILIKE :search OR e.employee_code ILIKE :search OR e.email ILIKE :search OR e.position ILIKE :search)`;
    replacements.search = `%${search}%`;
  }
  if (department) {
    where += ' AND e.department = :department';
    replacements.department = department;
  }
  if (status) {
    where += ' AND e.status = :status';
    replacements.status = status;
  }

  try {
    const [rows] = await sequelize.query(
      `SELECT e.employee_code, e.name, e.email, e.phone, e.position, e.department,
              e.status, e.work_location, e.hire_date, b.name AS branch_name
       FROM employees e
       LEFT JOIN branches b ON e.branch_id = b.id
       ${where}
       ORDER BY e.name ASC
       LIMIT ${MAX_ROWS}`,
      { replacements },
    );

    const header = [
      'employee_code', 'name', 'email', 'phone', 'position', 'department',
      'status', 'work_location', 'hire_date', 'branch_name',
    ];
    const lines = [header.join(',')];
    for (const r of rows || []) {
      lines.push([
        r.employee_code, r.name, r.email, r.phone, r.position, r.department,
        r.status, r.work_location, r.hire_date ? String(r.hire_date).slice(0, 10) : '',
        r.branch_name,
      ].map(csvEscape).join(','));
    }

    try {
      const { logAdminAction } = await import('@/lib/saas/admin-audit');
      await logAdminAction({
        tenantId,
        actorUserId: session?.user?.id,
        actorEmail: session?.user?.email,
        action: 'employee.export',
        resourceType: 'employees',
        meta: { count: (rows || []).length, department, status, search },
      });
    } catch { /* non-blocking */ }

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="humanify-employees-${stamp}.csv"`);
    return res.status(200).send(`\uFEFF${lines.join('\n')}`);
  } catch (e: any) {
    console.error('[employees-export]', e?.message || e);
    return res.status(500).json({ success: false, error: e?.message || 'Export gagal' });
  }
}

export default withHQAuth(handler, { module: 'hris' });
