/**
 * /api/hq/hris/overtime — Overtime (Lembur) Management API
 *
 * GET  ?action=list       — paginated overtime requests (admin view)
 * GET  ?action=stats      — summary counts & hours
 * GET  ?action=recap      — monthly recap per employee/dept
 * GET  ?action=detail     — single overtime detail
 * GET  ?action=settings   — overtime multiplier settings
 * POST ?action=submit     — employee submits overtime request
 * POST ?action=approve    — manager approves
 * POST ?action=reject     — manager rejects (with reason)
 * POST ?action=cancel     — employee cancels pending request
 * POST ?action=save-settings — save multiplier/rules
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

let sequelize: any;
try { ({ sequelize } = require('../../../../lib/sequelize')); } catch {}

const q = async (sql: string, params: any = {}) => {
  if (!sequelize) return [];
  try { const [rows] = await sequelize.query(sql, { replacements: params }); return rows as any[]; }
  catch { return []; }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const tenantId = String((session.user as any).tenantId || '');
  const action = String(req.query.action || '');

  try {
    if (req.method === 'GET') {
      if (action === 'list')     return getList(req, res, tenantId);
      if (action === 'stats')    return getStats(req, res, tenantId);
      if (action === 'recap')    return getRecap(req, res, tenantId);
      if (action === 'detail')   return getDetail(req, res, tenantId);
      if (action === 'settings') return getSettings(res, tenantId);
    }
    if (req.method === 'POST') {
      if (action === 'submit')        return submit(req, res, session, tenantId);
      if (action === 'approve')       return approve(req, res, session, tenantId);
      if (action === 'reject')        return reject(req, res, session, tenantId);
      if (action === 'cancel')        return cancel(req, res, tenantId);
      if (action === 'save-settings') return saveSettings(req, res, tenantId);
    }
    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (e: any) {
    console.error('[overtime]', e.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ── GET: List ─────────────────────────────────────────────────────────────────
async function getList(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { status, dept, month, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(String(page)) - 1) * parseInt(String(limit));
  if (!sequelize) return res.json({ success: true, data: { records: MOCK_OVERTIME, total: MOCK_OVERTIME.length } });

  const conds = ['o.tenant_id = :tenantId'];
  const params: any = { tenantId, limit: parseInt(String(limit)), offset };
  if (status) { conds.push('o.status = :status'); params.status = status; }
  if (dept)   { conds.push('e.department = :dept'); params.dept = dept; }
  if (month)  { conds.push("TO_CHAR(o.date,'YYYY-MM') = :month"); params.month = month; }

  const rows = await q(`
    SELECT o.*, e.name AS employee_name, e.employee_no, e.department, e.position,
      ROUND(EXTRACT(EPOCH FROM (o.end_time::time - o.start_time::time))/3600, 2) AS duration_hours,
      ap.name AS approved_by_name
    FROM overtime_requests o
    LEFT JOIN employees e ON o.employee_id = e.id
    LEFT JOIN users ap ON o.approved_by = ap.id
    WHERE ${conds.join(' AND ')}
    ORDER BY o.date DESC, o.created_at DESC
    LIMIT :limit OFFSET :offset
  `, params);

  const [{ count }] = await q(`SELECT COUNT(*) AS count FROM overtime_requests o LEFT JOIN employees e ON o.employee_id = e.id WHERE ${conds.join(' AND ')}`, { ...params, limit: undefined, offset: undefined });
  return res.json({ success: true, data: { records: rows, total: parseInt(count || '0') } });
}

// ── GET: Stats ────────────────────────────────────────────────────────────────
async function getStats(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { month } = req.query;
  const thisMonth = String(month || new Date().toISOString().slice(0, 7));
  if (!sequelize) return res.json({ success: true, data: MOCK_STATS });

  const [stats] = await q(`
    SELECT
      COUNT(*) FILTER (WHERE status='pending')  AS pending,
      COUNT(*) FILTER (WHERE status='approved') AS approved,
      COUNT(*) FILTER (WHERE status='rejected') AS rejected,
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN status='approved' THEN EXTRACT(EPOCH FROM (end_time::time - start_time::time))/3600 ELSE 0 END),0) AS total_hours_approved,
      COALESCE(SUM(CASE WHEN status='pending'  THEN EXTRACT(EPOCH FROM (end_time::time - start_time::time))/3600 ELSE 0 END),0) AS total_hours_pending
    FROM overtime_requests WHERE tenant_id=:tenantId AND TO_CHAR(date,'YYYY-MM')=:month
  `, { tenantId, month: thisMonth });

  const byDept = await q(`
    SELECT e.department, COUNT(*) AS count,
      COALESCE(SUM(EXTRACT(EPOCH FROM (o.end_time::time - o.start_time::time))/3600),0) AS hours
    FROM overtime_requests o LEFT JOIN employees e ON o.employee_id=e.id
    WHERE o.tenant_id=:tenantId AND o.status='approved' AND TO_CHAR(o.date,'YYYY-MM')=:month
    GROUP BY e.department ORDER BY hours DESC LIMIT 8
  `, { tenantId, month: thisMonth });

  return res.json({ success: true, data: { ...(stats || MOCK_STATS), by_dept: byDept, month: thisMonth } });
}

// ── GET: Monthly recap per employee ──────────────────────────────────────────
async function getRecap(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { month, dept } = req.query;
  const targetMonth = String(month || new Date().toISOString().slice(0, 7));
  if (!sequelize) return res.json({ success: true, data: { recap: MOCK_RECAP, month: targetMonth } });

  const conds = ["o.tenant_id=:tenantId AND o.status='approved' AND TO_CHAR(o.date,'YYYY-MM')=:month"];
  const params: any = { tenantId, month: targetMonth };
  if (dept) { conds.push('e.department=:dept'); params.dept = dept; }

  const recap = await q(`
    SELECT e.id AS employee_id, e.employee_no, e.name AS employee_name, e.department, e.position,
      COUNT(o.id) AS total_sessions,
      ROUND(COALESCE(SUM(EXTRACT(EPOCH FROM (o.end_time::time - o.start_time::time))/3600),0)::numeric, 2) AS total_hours,
      COUNT(o.id) FILTER (WHERE o.day_type='weekday')  AS weekday_sessions,
      COUNT(o.id) FILTER (WHERE o.day_type='weekend')  AS weekend_sessions,
      COUNT(o.id) FILTER (WHERE o.day_type='holiday')  AS holiday_sessions,
      ROUND(COALESCE(SUM(o.calculated_pay),0)::numeric, 0) AS total_pay
    FROM overtime_requests o
    LEFT JOIN employees e ON o.employee_id=e.id
    WHERE ${conds.join(' AND ')}
    GROUP BY e.id, e.employee_no, e.name, e.department, e.position
    ORDER BY total_hours DESC
  `, params);

  return res.json({ success: true, data: { recap, month: targetMonth } });
}

// ── GET: Single detail ────────────────────────────────────────────────────────
async function getDetail(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (!sequelize) return res.json({ success: true, data: MOCK_OVERTIME[0] });

  const [rows] = await q(`
    SELECT o.*, e.name AS employee_name, e.employee_no, e.department, e.position,
      ROUND(EXTRACT(EPOCH FROM (o.end_time::time - o.start_time::time))/3600,2) AS duration_hours,
      ap.name AS approved_by_name
    FROM overtime_requests o
    LEFT JOIN employees e ON o.employee_id=e.id
    LEFT JOIN users ap ON o.approved_by=ap.id
    WHERE o.id=:id AND o.tenant_id=:tenantId
  `, { id, tenantId });

  if (!rows?.length) return res.status(404).json({ success: false, error: 'Tidak ditemukan' });
  return res.json({ success: true, data: rows[0] });
}

// ── GET: Settings ─────────────────────────────────────────────────────────────
async function getSettings(res: NextApiResponse, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: DEFAULT_SETTINGS });
  const rows = await q(`SELECT setting_value FROM hris_settings WHERE tenant_id=:tenantId AND setting_key='overtime' LIMIT 1`, { tenantId });
  return res.json({ success: true, data: rows?.[0]?.setting_value || DEFAULT_SETTINGS });
}

// ── POST: Submit overtime request ─────────────────────────────────────────────
async function submit(req: NextApiRequest, res: NextApiResponse, session: any, tenantId: string) {
  const { date, start_time, end_time, reason, work_description, overtime_type = 'regular' } = req.body;
  if (!date || !start_time || !end_time || !reason)
    return res.status(400).json({ success: false, error: 'date, start_time, end_time, reason wajib diisi' });

  const userId = (session.user as any).id;
  if (!sequelize) return res.json({ success: true, message: 'Pengajuan lembur berhasil dikirim', data: { id: `ot-${Date.now()}`, status: 'pending' } });

  const [emp] = await q(`SELECT id, base_salary FROM employees WHERE user_id=:uid AND tenant_id=:tid LIMIT 1`, { uid: userId, tid: tenantId });
  const empId = emp?.id || userId;

  // Determine day type & multiplier
  const d = new Date(date);
  const dow = d.getDay();
  const [holiday] = await q(`SELECT 1 FROM public_holidays WHERE date=:date AND (tenant_id=:tid OR tenant_id IS NULL) LIMIT 1`, { date, tid: tenantId });
  const dayType = holiday ? 'holiday' : (dow === 0 || dow === 6) ? 'weekend' : 'weekday';
  const multipliers: Record<string, number> = { weekday: 1.5, weekend: 2.0, holiday: 3.0 };
  const multiplier = multipliers[dayType];

  const startH = parseInt(start_time.split(':')[0]) + parseInt(start_time.split(':')[1]) / 60;
  const endH   = parseInt(end_time.split(':')[0])   + parseInt(end_time.split(':')[1]) / 60;
  const durHrs  = Math.max(0, endH - startH);
  const hourlyRate = emp?.base_salary ? emp.base_salary / 173 : 0;
  const calcPay = Math.round(hourlyRate * durHrs * multiplier);

  await q(`
    INSERT INTO overtime_requests (id, tenant_id, employee_id, date, day_type, start_time, end_time,
      reason, work_description, overtime_type, multiplier, calculated_pay, status, created_at, updated_at)
    VALUES (uuid_generate_v4(), :tid, :empId, :date, :dayType, :start, :end,
      :reason, :desc, :otype, :mult, :pay, 'pending', NOW(), NOW())
  `, { tid: tenantId, empId, date, dayType, start: start_time, end: end_time, reason, desc: work_description || null, otype: overtime_type, mult: multiplier, pay: calcPay });

  return res.json({ success: true, message: 'Pengajuan lembur berhasil dikirim dan menunggu persetujuan' });
}

// ── POST: Approve ─────────────────────────────────────────────────────────────
async function approve(req: NextApiRequest, res: NextApiResponse, session: any, tenantId: string) {
  const { id, notes } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  const approvedBy = (session.user as any).id;
  if (!sequelize) return res.json({ success: true, message: 'Lembur disetujui' });
  await q(`UPDATE overtime_requests SET status='approved', approved_by=:by, approved_at=NOW(), notes=:notes, updated_at=NOW() WHERE id=:id AND tenant_id=:tid`, { by: approvedBy, notes: notes || null, id, tid: tenantId });
  return res.json({ success: true, message: 'Lembur berhasil disetujui' });
}

// ── POST: Reject ──────────────────────────────────────────────────────────────
async function reject(req: NextApiRequest, res: NextApiResponse, session: any, tenantId: string) {
  const { id, rejection_reason } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (!rejection_reason) return res.status(400).json({ success: false, error: 'Alasan penolakan wajib diisi' });
  const rejectedBy = (session.user as any).id;
  if (!sequelize) return res.json({ success: true, message: 'Lembur ditolak' });
  await q(`UPDATE overtime_requests SET status='rejected', rejection_reason=:reason, approved_by=:by, approved_at=NOW(), updated_at=NOW() WHERE id=:id AND tenant_id=:tid`, { reason: rejection_reason, by: rejectedBy, id, tid: tenantId });
  return res.json({ success: true, message: 'Lembur berhasil ditolak' });
}

// ── POST: Cancel ──────────────────────────────────────────────────────────────
async function cancel(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (!sequelize) return res.json({ success: true, message: 'Pengajuan dibatalkan' });
  await q(`UPDATE overtime_requests SET status='cancelled', updated_at=NOW() WHERE id=:id AND tenant_id=:tid AND status='pending'`, { id, tid: tenantId });
  return res.json({ success: true, message: 'Pengajuan lembur dibatalkan' });
}

// ── POST: Save settings ───────────────────────────────────────────────────────
async function saveSettings(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const settings = req.body;
  if (!sequelize) return res.json({ success: true, message: 'Pengaturan disimpan' });
  await q(`INSERT INTO hris_settings (id, tenant_id, setting_key, setting_value, created_at, updated_at)
    VALUES (uuid_generate_v4(), :tid, 'overtime', :val::jsonb, NOW(), NOW())
    ON CONFLICT (tenant_id, setting_key) DO UPDATE SET setting_value=:val::jsonb, updated_at=NOW()`,
    { tid: tenantId, val: JSON.stringify(settings) });
  return res.json({ success: true, message: 'Pengaturan lembur berhasil disimpan' });
}

// ── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_OVERTIME = [
  { id: 'ot1', employee_name: 'Budi Santoso', employee_no: 'EMP-0002', department: 'Sales', position: 'Sales Rep', date: '2026-04-14', day_type: 'weekday', start_time: '17:00', end_time: '20:00', duration_hours: 3, reason: 'Penyelesaian laporan bulanan', work_description: 'Rekap penjualan Q1 dan input data CRM', overtime_type: 'regular', multiplier: 1.5, calculated_pay: 270000, status: 'pending', created_at: '2026-04-14T17:05:00' },
  { id: 'ot2', employee_name: 'Siti Rahayu', employee_no: 'EMP-0003', department: 'Operations', position: 'Branch Manager', date: '2026-04-13', day_type: 'weekend', start_time: '08:00', end_time: '14:00', duration_hours: 6, reason: 'Audit stok gudang bulanan', work_description: 'Stock opname gudang cabang Bandung', overtime_type: 'regular', multiplier: 2.0, calculated_pay: 960000, status: 'approved', approved_by_name: 'Ahmad Wijaya', created_at: '2026-04-12T16:00:00' },
  { id: 'ot3', employee_name: 'Dewi Lestari', employee_no: 'EMP-0006', department: 'Finance', position: 'Cashier', date: '2026-04-10', day_type: 'weekday', start_time: '17:00', end_time: '19:30', duration_hours: 2.5, reason: 'Closing kas akhir bulan', work_description: 'Rekonsiliasi kas harian dan jurnal penutup', overtime_type: 'regular', multiplier: 1.5, calculated_pay: 187500, status: 'approved', approved_by_name: 'Lisa Permata', created_at: '2026-04-10T17:05:00' },
  { id: 'ot4', employee_name: 'Eko Prasetyo', employee_no: 'EMP-0005', department: 'Warehouse', position: 'Staff Gudang', date: '2026-04-08', day_type: 'weekday', start_time: '17:00', end_time: '21:00', duration_hours: 4, reason: 'Bongkar muat barang mendesak', work_description: 'Penerimaan barang dari vendor darurat', overtime_type: 'emergency', multiplier: 1.5, calculated_pay: 240000, status: 'rejected', rejection_reason: 'Melebihi kuota lembur bulan ini. Harap koordinasi dengan supervisor.', created_at: '2026-04-08T17:00:00' },
  { id: 'ot5', employee_name: 'Lisa Permata', employee_no: 'EMP-0004', department: 'HR', position: 'HR Manager', date: '2026-04-07', day_type: 'weekday', start_time: '17:00', end_time: '19:00', duration_hours: 2, reason: 'Penyelesaian kontrak karyawan baru', work_description: 'Review dan tanda tangan kontrak 5 karyawan baru', overtime_type: 'project', multiplier: 1.5, calculated_pay: 375000, status: 'approved', approved_by_name: 'Ahmad Wijaya', created_at: '2026-04-07T17:10:00' },
];
const MOCK_STATS = { pending: 1, approved: 3, rejected: 1, total: 5, total_hours_approved: 11.5, total_hours_pending: 3, by_dept: [{ department: 'Operations', hours: 6, count: 1 }, { department: 'Finance', hours: 2.5, count: 1 }, { department: 'HR', hours: 2, count: 1 }] };
const MOCK_RECAP = [
  { employee_id: 'e2', employee_no: 'EMP-0002', employee_name: 'Siti Rahayu', department: 'Operations', position: 'Branch Manager', total_sessions: 3, total_hours: 12, weekday_sessions: 1, weekend_sessions: 2, holiday_sessions: 0, total_pay: 1920000 },
  { employee_id: 'e4', employee_no: 'EMP-0004', employee_name: 'Lisa Permata', department: 'HR', position: 'HR Manager', total_sessions: 2, total_hours: 5.5, weekday_sessions: 2, weekend_sessions: 0, holiday_sessions: 0, total_pay: 825000 },
  { employee_id: 'e6', employee_no: 'EMP-0006', employee_name: 'Dewi Lestari', department: 'Finance', position: 'Cashier', total_sessions: 2, total_hours: 4.5, weekday_sessions: 2, weekend_sessions: 0, holiday_sessions: 0, total_pay: 337500 },
];
const DEFAULT_SETTINGS = { weekday_multiplier: 1.5, weekend_multiplier: 2.0, holiday_multiplier: 3.0, min_overtime_minutes: 30, max_overtime_hours_per_day: 4, max_overtime_hours_per_month: 40, requires_approval: true, auto_detect: true };

