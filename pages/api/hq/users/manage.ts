/**
 * /api/hq/users/manage — Enhanced Users API with HRIS Integration
 *
 * GET  ?action=list       — paginated users + joined HRIS employee data
 * GET  ?action=stats      — counts: total, linked_hris, unlinked, active_today
 * GET  ?action=detail     — full user + employee profile + activity log
 * GET  ?action=search-employees — search unlinked employees for linking
 * POST ?action=link-employee   — link user.id ↔ employees.user_id
 * POST ?action=unlink-employee — remove link
 * POST ?action=sync-to-hris    — create HRIS employee record from user data
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

let sequelize: any;
try { ({ sequelize } = require('../../../../lib/sequelize')); } catch {}

const q = async (sql: string, params: any = {}) => {
  if (!sequelize) return [];
  try {
    const [rows] = await sequelize.query(sql, { replacements: params });
    return rows as any[];
  } catch { return []; }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const tenantId = String((session.user as any).tenantId || '');
  const action = String(req.query.action || '');

  try {
    if (req.method === 'GET') {
      if (action === 'list')             return getList(req, res, tenantId);
      if (action === 'stats')            return getStats(res, tenantId);
      if (action === 'detail')           return getDetail(req, res, tenantId);
      if (action === 'search-employees') return searchEmployees(req, res, tenantId);
    }
    if (req.method === 'POST') {
      if (action === 'link-employee')   return linkEmployee(req, res, tenantId);
      if (action === 'unlink-employee') return unlinkEmployee(req, res, tenantId);
      if (action === 'sync-to-hris')    return syncToHris(req, res, session, tenantId);
    }
    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (e: any) {
    console.error('[users/manage]', e.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ── GET: List users with HRIS data ──────────────────────────────────────────
async function getList(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const page     = Math.max(1, parseInt(String(req.query.page  || '1')));
  const limit    = Math.max(1, parseInt(String(req.query.limit || '15')));
  const search   = String(req.query.search || '');
  const role     = String(req.query.role   || '');
  const hrisLink = String(req.query.hris   || ''); // 'linked' | 'unlinked' | ''
  const offset   = (page - 1) * limit;

  if (!sequelize) return res.json({ success: true, data: { users: MOCK_USERS, total: MOCK_USERS.length, page, limit } });

  const conditions: string[] = ['u.tenant_id = :tenantId'];
  const params: any = { tenantId, limit, offset };
  if (search) { conditions.push(`(u.name ILIKE :search OR u.email ILIKE :search)`); params.search = `%${search}%`; }
  if (role)   { conditions.push(`u.role = :role`); params.role = role; }
  if (hrisLink === 'linked')   conditions.push(`e.id IS NOT NULL`);
  if (hrisLink === 'unlinked') conditions.push(`e.id IS NULL`);

  const where = conditions.join(' AND ');

  const rows = await q(`
    SELECT
      u.id, u.name, u.email, u.phone, u.role, u.is_active,
      u.last_login_at, u.created_at,
      b.name  AS branch_name, b.code AS branch_code,
      e.id             AS employee_id,
      e.employee_no    AS employee_number,
      e.department, e.position, e.employment_type,
      e.join_date, e.employment_status AS hris_status,
      e.photo_url
    FROM users u
    LEFT JOIN branches b ON u.branch_id = b.id
    LEFT JOIN employees e ON e.user_id = u.id AND e.tenant_id = :tenantId
    WHERE ${where}
    ORDER BY u.created_at DESC
    LIMIT :limit OFFSET :offset
  `, params);

  const [{ count }] = await q(`
    SELECT COUNT(*) AS count FROM users u
    LEFT JOIN employees e ON e.user_id = u.id AND e.tenant_id = :tenantId
    WHERE ${where}
  `, { ...params, limit: undefined, offset: undefined });

  return res.json({ success: true, data: { users: rows, total: parseInt(count || '0'), page, limit } });
}

// ── GET: Stats ───────────────────────────────────────────────────────────────
async function getStats(res: NextApiResponse, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: { total: 10, linked_hris: 7, unlinked: 3, active_today: 5, by_role: [] } });

  const today = new Date().toISOString().split('T')[0];
  const [stats] = await q(`
    SELECT
      COUNT(u.id)                                                         AS total,
      COUNT(e.id)                                                         AS linked_hris,
      COUNT(u.id) - COUNT(e.id)                                          AS unlinked,
      COUNT(u.id) FILTER (WHERE u.last_login_at::date = :today)          AS active_today,
      COUNT(u.id) FILTER (WHERE u.is_active = true)                      AS active_users
    FROM users u
    LEFT JOIN employees e ON e.user_id = u.id AND e.tenant_id = :tenantId
    WHERE u.tenant_id = :tenantId
  `, { tenantId, today });

  const byRole = await q(`
    SELECT role, COUNT(*) AS count FROM users WHERE tenant_id = :tenantId GROUP BY role ORDER BY count DESC
  `, { tenantId });

  return res.json({ success: true, data: { ...(stats || {}), by_role: byRole } });
}

// ── GET: Detail user + HRIS + activity ──────────────────────────────────────
async function getDetail(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });

  if (!sequelize) {
    const u = MOCK_USERS.find(u => u.id === id) || MOCK_USERS[0];
    return res.json({ success: true, data: { user: u, employee: MOCK_EMPLOYEE, activity: MOCK_ACTIVITY } });
  }

  const [user] = await q(`
    SELECT u.*, b.name AS branch_name, b.code AS branch_code FROM users u
    LEFT JOIN branches b ON u.branch_id = b.id
    WHERE u.id = :id AND u.tenant_id = :tenantId
  `, { id, tenantId });

  const [employee] = await q(`
    SELECT e.*, jg.name AS grade_name, jg.min_salary, jg.max_salary,
      m.name AS manager_name, m.position AS manager_position
    FROM employees e
    LEFT JOIN job_grades jg ON jg.code = e.job_level AND jg.tenant_id = :tenantId
    LEFT JOIN employees m ON m.id = e.reporting_to
    WHERE e.user_id = :id AND e.tenant_id = :tenantId
    LIMIT 1
  `, { id, tenantId });

  const activity = await q(`
    SELECT action, created_at AS timestamp, ip_address, user_agent, status
    FROM user_activity_logs WHERE user_id = :id
    ORDER BY created_at DESC LIMIT 20
  `, { id });

  // Leave summary
  const leaveStats = employee?.id ? await q(`
    SELECT leave_type, COUNT(*) AS count, SUM(days_taken) AS days
    FROM employee_leaves
    WHERE employee_id = :empId AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM NOW())
    GROUP BY leave_type
  `, { empId: employee.id }) : [];

  return res.json({ success: true, data: { user, employee: employee || null, activity, leaveStats } });
}

// ── GET: Search unlinked employees ──────────────────────────────────────────
async function searchEmployees(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const q2 = String(req.query.q || '');
  if (!sequelize) return res.json({ success: true, data: [{ id: 'e1', employee_no: 'EMP-001', name: 'Budi Santoso', department: 'Sales', position: 'Sales Rep' }] });
  const rows = await q(`
    SELECT e.id, e.employee_no, e.name, e.department, e.position, e.photo_url
    FROM employees e
    WHERE e.tenant_id = :tenantId AND e.user_id IS NULL
      AND (e.name ILIKE :q OR e.employee_no ILIKE :q OR e.department ILIKE :q)
    ORDER BY e.name LIMIT 15
  `, { tenantId, q: `%${q2}%` });
  return res.json({ success: true, data: rows });
}

// ── POST: Link user ↔ employee ───────────────────────────────────────────────
async function linkEmployee(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { userId, employeeId } = req.body;
  if (!userId || !employeeId) return res.status(400).json({ success: false, error: 'userId dan employeeId wajib diisi' });
  if (!sequelize) return res.json({ success: true, message: 'Berhasil ditautkan ke profil HRIS' });
  // Remove any existing link from this employee
  await q(`UPDATE employees SET user_id = NULL, updated_at = NOW() WHERE user_id = :userId AND tenant_id = :tenantId`, { userId, tenantId });
  await q(`UPDATE employees SET user_id = :userId, updated_at = NOW() WHERE id = :empId AND tenant_id = :tenantId`, { userId, empId: employeeId, tenantId });
  return res.json({ success: true, message: 'Pengguna berhasil ditautkan ke profil HRIS karyawan' });
}

// ── POST: Unlink ─────────────────────────────────────────────────────────────
async function unlinkEmployee(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId wajib diisi' });
  if (!sequelize) return res.json({ success: true, message: 'Tautan HRIS dilepas' });
  await q(`UPDATE employees SET user_id = NULL, updated_at = NOW() WHERE user_id = :userId AND tenant_id = :tenantId`, { userId, tenantId });
  return res.json({ success: true, message: 'Tautan HRIS berhasil dilepas' });
}

// ── POST: Create HRIS employee from user data ────────────────────────────────
async function syncToHris(req: NextApiRequest, res: NextApiResponse, session: any, tenantId: string) {
  const { userId, department, position, employmentType, joinDate, salary, jobLevel } = req.body;
  if (!userId || !department || !position) return res.status(400).json({ success: false, error: 'userId, department, position wajib diisi' });

  if (!sequelize) return res.json({ success: true, message: 'Profil HRIS berhasil dibuat' });

  const [user] = await q(`SELECT * FROM users WHERE id = :userId AND tenant_id = :tenantId LIMIT 1`, { userId, tenantId });
  if (!user) return res.status(404).json({ success: false, error: 'User tidak ditemukan' });

  // Generate employee number
  const [{ count }] = await q(`SELECT COUNT(*) AS count FROM employees WHERE tenant_id = :tenantId`, { tenantId });
  const empNo = `EMP-${String(parseInt(count || '0') + 1).padStart(4, '0')}`;

  const createdBy = (session.user as any)?.id || userId;

  await q(`
    INSERT INTO employees
      (id, tenant_id, user_id, employee_no, name, email, phone, department, position,
       employment_type, join_date, base_salary, job_level, employment_status, created_at, updated_at)
    VALUES
      (uuid_generate_v4(), :tenantId, :userId, :empNo, :name, :email, :phone, :dept, :pos,
       :empType, :joinDate, :salary, :jobLevel, 'active', NOW(), NOW())
    ON CONFLICT (tenant_id, employee_no) DO NOTHING
  `, { tenantId, userId, empNo, name: user.name, email: user.email, phone: user.phone || null, dept: department, pos: position, empType: employmentType || 'permanent', joinDate: joinDate || new Date().toISOString().split('T')[0], salary: salary ? parseFloat(salary) : 0, jobLevel: jobLevel || null });

  return res.json({ success: true, message: `Profil HRIS berhasil dibuat dengan No. Karyawan: ${empNo}`, data: { employee_no: empNo } });
}

// ── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_USERS = [
  { id: 'u1', name: 'Ahmad Wijaya', email: 'ahmad@bedagang.com', phone: '081234560001', role: 'SUPER_ADMIN', is_active: true, last_login_at: '2026-04-16T08:30:00', branch_name: 'Kantor Pusat', employee_id: 'e1', employee_number: 'EMP-0001', department: 'Management', position: 'CEO', employment_type: 'permanent', hris_status: 'active', join_date: '2020-01-01' },
  { id: 'u2', name: 'Siti Rahayu', email: 'siti@bedagang.com', phone: '081234560002', role: 'BRANCH_MANAGER', is_active: true, last_login_at: '2026-04-16T07:45:00', branch_name: 'Cabang Bandung', employee_id: 'e2', employee_number: 'EMP-0002', department: 'Operations', position: 'Branch Manager', employment_type: 'permanent', hris_status: 'active', join_date: '2021-03-15' },
  { id: 'u3', name: 'Budi Santoso', email: 'budi@bedagang.com', phone: '081234560003', role: 'BRANCH_MANAGER', is_active: true, last_login_at: '2026-04-15T09:10:00', branch_name: 'Cabang Surabaya', employee_id: null, employee_number: null, department: null, position: null, employment_type: null, hris_status: null, join_date: null },
  { id: 'u4', name: 'Lisa Permata', email: 'lisa@bedagang.com', phone: '081234560006', role: 'ADMIN', is_active: true, last_login_at: '2026-04-16T08:00:00', branch_name: 'Kantor Pusat', employee_id: 'e4', employee_number: 'EMP-0004', department: 'HR', position: 'HR Manager', employment_type: 'permanent', hris_status: 'active', join_date: '2022-06-01' },
  { id: 'u5', name: 'Eko Prasetyo', email: 'eko@bedagang.com', phone: '081234560005', role: 'STAFF', is_active: true, last_login_at: '2026-04-14T07:30:00', branch_name: 'Gudang Pusat', employee_id: null, employee_number: null, department: null, position: null, employment_type: null, hris_status: null, join_date: null },
  { id: 'u6', name: 'Dewi Lestari', email: 'dewi@bedagang.com', phone: '081234560004', role: 'CASHIER', is_active: true, last_login_at: '2026-04-16T08:15:00', branch_name: 'Cabang Medan', employee_id: 'e6', employee_number: 'EMP-0006', department: 'Finance', position: 'Cashier', employment_type: 'contract', hris_status: 'active', join_date: '2023-01-10' },
];
const MOCK_EMPLOYEE = { id: 'e1', employee_no: 'EMP-0001', department: 'Management', position: 'CEO', employment_type: 'permanent', join_date: '2020-01-01', hris_status: 'active', base_salary: 25000000, job_level: 'G8', grade_name: 'Grade 8 - Senior Executive', manager_name: null, nik: '3174052701900001', bpjs_kesehatan: '0001234567890', gender: 'male', birth_date: '1990-01-27', marital_status: 'married' };
const MOCK_ACTIVITY = [
  { action: 'login', timestamp: '2026-04-16T08:30:00', ip_address: '192.168.1.10', user_agent: 'Chrome 124 / macOS', status: 'success' },
  { action: 'login', timestamp: '2026-04-15T08:15:00', ip_address: '192.168.1.10', user_agent: 'Chrome 124 / macOS', status: 'success' },
  { action: 'login', timestamp: '2026-04-14T09:00:00', ip_address: '203.0.113.5', user_agent: 'Safari / iPhone', status: 'failed' },
  { action: 'password_reset', timestamp: '2026-04-10T14:22:00', ip_address: '192.168.1.10', user_agent: 'Chrome 124 / macOS', status: 'success' },
];


