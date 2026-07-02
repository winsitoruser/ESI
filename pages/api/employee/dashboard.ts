import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch (e) {}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { action } = req.query;
    const userId = String(session.user.id || '');
    const tenantId = String((session.user as any).tenantId || '');

    if (req.method === 'GET') {
      switch (action) {
        case 'profile': return getProfile(res, userId, tenantId);
        case 'attendance': return getAttendance(res, userId, tenantId);
        case 'kpi': return getKPI(res, userId, tenantId);
        case 'leave-balance': return getLeaveBalance(res, userId, tenantId);
        case 'leave-requests': return getLeaveRequests(res, userId, tenantId);
        case 'claims': return getClaims(res, userId, tenantId);
        case 'attendance-history': return getAttendanceHistory(req, res, userId);
        case 'overtime-history':   return getOvertimeHistory(req, res, userId, tenantId);
        case 'travel': return getTravel(res, userId, tenantId);
        case 'notifications': return getNotifications(res, userId);
        case 'summary': return getSummary(res, userId, tenantId);
        default: return res.status(400).json({ error: 'Unknown action' });
      }
    }

    if (req.method === 'POST') {
      switch (action) {
        case 'clock-in': return clockIn(req, res, userId, tenantId);
        case 'clock-out': return clockOut(req, res, userId, tenantId);
        case 'leave-request': return createLeaveRequest(req, res, userId, tenantId);
        case 'claim': return createClaim(req, res, userId, tenantId);
        case 'resubmit-claim':   return resubmitClaim(req, res, userId, tenantId);
        case 'submit-overtime':  return submitOvertime(req, res, userId, tenantId);
        case 'cancel-overtime':  return cancelOvertime(req, res, userId, tenantId);
        case 'travel-request': return createTravelRequest(req, res, userId, tenantId);
        default: return res.status(400).json({ error: 'Unknown action' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Employee Dashboard API Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ─── Profile ───
async function getProfile(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: mockProfile() });
  try {
    const [rows] = await sequelize.query(`
      SELECT u.id, u.name, u.email, u.phone, u.role,
        e.employee_id as employee_code, e.position, e.department, e.join_date,
        b.name as branch_name, b.code as branch_code
      FROM users u
      LEFT JOIN employees e ON e.user_id = u.id OR e.email = u.email
      LEFT JOIN branches b ON u.assigned_branch_id = b.id OR e.branch_id = b.id
      WHERE u.id = :userId LIMIT 1
    `, { replacements: { userId } });
    return res.json({ success: true, data: rows[0] || mockProfile() });
  } catch { return res.json({ success: true, data: mockProfile() }); }
}

// ─── Attendance ───
async function getAttendance(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: mockAttendance() });
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';
    const [todayRows] = await sequelize.query(`
      SELECT check_in, check_out, status FROM employee_attendances
      WHERE (user_id = :userId OR employee_id IN (SELECT id FROM employees WHERE user_id = :userId OR email = (SELECT email FROM users WHERE id = :userId)))
      AND date = :today LIMIT 1
    `, { replacements: { userId, today } });

    const [monthRows] = await sequelize.query(`
      SELECT status, COUNT(*)::int as count FROM employee_attendances
      WHERE (user_id = :userId OR employee_id IN (SELECT id FROM employees WHERE user_id = :userId OR email = (SELECT email FROM users WHERE id = :userId)))
      AND date >= :monthStart AND date <= :today
      GROUP BY status
    `, { replacements: { userId, monthStart, today } });

    const monthSummary: Record<string, number> = {};
    (monthRows || []).forEach((r: any) => { monthSummary[r.status] = r.count; });

    return res.json({
      success: true,
      data: {
        today: todayRows[0] || null,
        thisMonth: {
          present: monthSummary['present'] || 0,
          late: monthSummary['late'] || 0,
          absent: monthSummary['absent'] || 0,
          leave: monthSummary['leave'] || 0,
        }
      }
    });
  } catch { return res.json({ success: true, data: mockAttendance() }); }
}

// ─── Attendance History (for employee self-service) ───
async function getAttendanceHistory(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const { month } = req.query; // format: YYYY-MM, default current month
  const targetMonth = (month as string) || new Date().toISOString().slice(0, 7);
  const monthStart = `${targetMonth}-01`;
  const nextMonth = new Date(`${targetMonth}-01`);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const monthEnd = nextMonth.toISOString().split('T')[0];

  if (!sequelize) return res.json({ success: true, data: mockAttendanceHistory(targetMonth) });

  try {
    const [rows] = await sequelize.query(`
      SELECT
        date,
        check_in, check_out, status, notes,
        CASE
          WHEN check_in IS NOT NULL AND check_out IS NOT NULL
          THEN ROUND(EXTRACT(EPOCH FROM (check_out::time - check_in::time)) / 3600, 2)
          ELSE NULL
        END AS work_hours,
        CASE
          WHEN check_in IS NOT NULL AND check_in::time > '08:15:00'
          THEN ROUND(EXTRACT(EPOCH FROM (check_in::time - '08:00:00')) / 60)
          ELSE 0
        END AS late_minutes
      FROM employee_attendances
      WHERE (user_id = :userId
        OR employee_id IN (
          SELECT id FROM employees WHERE user_id = :userId
          OR email = (SELECT email FROM users WHERE id = :userId)
        ))
        AND date >= :monthStart AND date < :monthEnd
      ORDER BY date DESC
    `, { replacements: { userId, monthStart, monthEnd } });

    const records = rows as any[];
    const summary = {
      present: records.filter(r => r.status === 'present').length,
      late:    records.filter(r => r.status === 'late').length,
      absent:  records.filter(r => r.status === 'absent').length,
      leave:   records.filter(r => r.status === 'leave').length,
      wfh:     records.filter(r => r.status === 'wfh').length,
      total:   records.length,
    };
    const totalWorkHours = records.reduce((s, r) => s + (parseFloat(r.work_hours) || 0), 0);
    const workDaysInMonth = records.filter(r => ['present','late','wfh'].includes(r.status)).length;
    const attendanceRate = summary.total > 0
      ? Math.round(((summary.present + summary.late + summary.wfh) / summary.total) * 100)
      : 0;

    return res.json({ success: true, data: { records, summary, totalWorkHours: Math.round(totalWorkHours * 10) / 10, workDaysInMonth, attendanceRate, month: targetMonth } });
  } catch {
    return res.json({ success: true, data: mockAttendanceHistory(targetMonth) });
  }
}

function mockAttendanceHistory(month: string) {
  const year = parseInt(month.split('-')[0]);
  const m = parseInt(month.split('-')[1]) - 1;
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const today = new Date();
  const statuses: Record<number, string> = {
    1: 'present', 2: 'present', 3: 'present', 4: 'late', 5: 'present',
    6: 'present', 7: 'present', 8: 'leave', 9: 'leave', 10: 'present',
    11: 'present', 12: 'late', 13: 'present', 14: 'absent', 15: 'present',
    16: 'present', 17: 'present', 18: 'wfh', 19: 'wfh', 20: 'present',
    21: 'present', 22: 'present', 23: 'present', 24: 'late',
  };
  const checkIns: Record<string, string> = {
    present: '08:05', late: '08:35', wfh: '08:00', leave: '', absent: ''
  };
  const checkOuts: Record<string, string> = {
    present: '17:02', late: '17:15', wfh: '17:00', leave: '', absent: ''
  };
  const records = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, m, d);
    if (date > today) break;
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const status = statuses[d] || 'present';
    const ci = checkIns[status];
    const co = checkOuts[status];
    records.push({
      date: dateStr,
      check_in: ci || null, check_out: co || null, status,
      work_hours: ci && co ? 9.0 : null,
      late_minutes: status === 'late' ? 35 : 0,
      notes: status === 'leave' ? 'Cuti tahunan' : status === 'absent' ? '' : null,
    });
  }
  records.sort((a, b) => b.date.localeCompare(a.date));
  const summary = {
    present: records.filter(r => r.status === 'present').length,
    late:    records.filter(r => r.status === 'late').length,
    absent:  records.filter(r => r.status === 'absent').length,
    leave:   records.filter(r => r.status === 'leave').length,
    wfh:     records.filter(r => r.status === 'wfh').length,
    total:   records.length,
  };
  const workDays = summary.present + summary.late + summary.wfh;
  return { records, summary, totalWorkHours: workDays * 8.5, workDaysInMonth: workDays, attendanceRate: Math.round((workDays / summary.total) * 100), month };
}

// ─── Overtime History ────────────────────────────────────────────────────────
async function getOvertimeHistory(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { month } = req.query;
  const targetMonth = String(month || new Date().toISOString().slice(0, 7));

  const MOCK_OT = [
    { id: 'ot1', date: `${targetMonth}-14`, day_type: 'weekday', start_time: '17:00', end_time: '20:00', duration_hours: 3, reason: 'Penyelesaian laporan bulanan', work_description: 'Rekap penjualan Q1', overtime_type: 'regular', multiplier: 1.5, calculated_pay: 270000, status: 'pending', created_at: `${targetMonth}-14T17:05:00` },
    { id: 'ot2', date: `${targetMonth}-13`, day_type: 'weekend', start_time: '08:00', end_time: '14:00', duration_hours: 6, reason: 'Audit stok gudang bulanan', work_description: 'Stock opname', overtime_type: 'regular', multiplier: 2.0, calculated_pay: 960000, status: 'approved', approved_by_name: 'Manager', created_at: `${targetMonth}-12T16:00:00` },
    { id: 'ot3', date: `${targetMonth}-08`, day_type: 'weekday', start_time: '17:00', end_time: '21:00', duration_hours: 4, reason: 'Pekerjaan mendesak', work_description: 'Penerimaan barang darurat', overtime_type: 'emergency', multiplier: 1.5, calculated_pay: 240000, status: 'rejected', rejection_reason: 'Melebihi kuota lembur bulan ini.', created_at: `${targetMonth}-08T17:00:00` },
  ];

  const MOCK_RECAP = { total_sessions: 2, total_hours: 9, total_pay_approved: 960000, pending: 1, approved: 1, rejected: 1 };

  if (!sequelize) return res.json({ success: true, data: { records: MOCK_OT, recap: MOCK_RECAP, month: targetMonth } });

  try {
    const [emp] = await sequelize.query(`SELECT id FROM employees WHERE user_id=:uid AND tenant_id=:tid LIMIT 1`, { replacements: { uid: userId, tid: tenantId } });
    const empId = emp?.[0]?.id || userId;

    const [rows] = await sequelize.query(`
      SELECT o.*,
        ROUND(EXTRACT(EPOCH FROM (o.end_time::time - o.start_time::time))/3600,2) AS duration_hours,
        ap.name AS approved_by_name
      FROM overtime_requests o
      LEFT JOIN users ap ON o.approved_by = ap.id
      WHERE o.employee_id = :empId AND o.tenant_id = :tid
        AND TO_CHAR(o.date,'YYYY-MM') = :month
      ORDER BY o.date DESC, o.created_at DESC
    `, { replacements: { empId, tid: tenantId, month: targetMonth } });

    const recs = rows as any[];
    const recap = {
      total_sessions: recs.filter(r => r.status === 'approved').length,
      total_hours: recs.filter(r => r.status === 'approved').reduce((s, r) => s + parseFloat(r.duration_hours || 0), 0),
      total_pay_approved: recs.filter(r => r.status === 'approved').reduce((s, r) => s + parseFloat(r.calculated_pay || 0), 0),
      pending: recs.filter(r => r.status === 'pending').length,
      approved: recs.filter(r => r.status === 'approved').length,
      rejected: recs.filter(r => r.status === 'rejected').length,
    };
    return res.json({ success: true, data: { records: recs, recap, month: targetMonth } });
  } catch { return res.json({ success: true, data: { records: MOCK_OT, recap: MOCK_RECAP, month: targetMonth } }); }
}

// ─── Submit Overtime ─────────────────────────────────────────────────────────
async function submitOvertime(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { date, start_time, end_time, reason, work_description, overtime_type = 'regular' } = req.body;
  if (!date || !start_time || !end_time || !reason)
    return res.status(400).json({ success: false, error: 'date, start_time, end_time, reason wajib diisi' });

  if (!sequelize) return res.json({ success: true, message: 'Pengajuan lembur berhasil dikirim dan menunggu persetujuan' });

  try {
    const [empRows] = await sequelize.query(`SELECT id, base_salary FROM employees WHERE user_id=:uid AND tenant_id=:tid LIMIT 1`, { replacements: { uid: userId, tid: tenantId } });
    const emp = empRows?.[0];
    const empId = emp?.id || userId;

    const dow = new Date(date).getDay();
    const dayType = (dow === 0 || dow === 6) ? 'weekend' : 'weekday';
    const mult = dayType === 'weekend' ? 2.0 : 1.5;
    const [sh, sm] = start_time.split(':').map(Number);
    const [eh, em] = end_time.split(':').map(Number);
    const durHrs = Math.max(0, (eh + em / 60) - (sh + sm / 60));
    const hourlyRate = emp?.base_salary ? emp.base_salary / 173 : 0;
    const calcPay = Math.round(hourlyRate * durHrs * mult);

    await sequelize.query(`
      INSERT INTO overtime_requests (id, tenant_id, employee_id, date, day_type, start_time, end_time,
        reason, work_description, overtime_type, multiplier, calculated_pay, status, created_at, updated_at)
      VALUES (uuid_generate_v4(), :tid, :empId, :date, :dayType, :start, :end,
        :reason, :desc, :otype, :mult, :pay, 'pending', NOW(), NOW())
    `, { replacements: { tid: tenantId, empId, date, dayType, start: start_time, end: end_time, reason, desc: work_description || null, otype: overtime_type, mult, pay: calcPay } });

    return res.json({ success: true, message: 'Pengajuan lembur berhasil dikirim dan menunggu persetujuan' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Gagal mengajukan lembur', details: e.message });
  }
}

// ─── Cancel Overtime ─────────────────────────────────────────────────────────
async function cancelOvertime(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (!sequelize) return res.json({ success: true, message: 'Pengajuan lembur dibatalkan' });
  try {
    const [empRows] = await sequelize.query(`SELECT id FROM employees WHERE user_id=:uid AND tenant_id=:tid LIMIT 1`, { replacements: { uid: userId, tid: tenantId } });
    const empId = empRows?.[0]?.id || userId;
    await sequelize.query(`UPDATE overtime_requests SET status='cancelled', updated_at=NOW() WHERE id=:id AND employee_id=:empId AND tenant_id=:tid AND status='pending'`, { replacements: { id, empId, tid: tenantId } });
    return res.json({ success: true, message: 'Pengajuan lembur berhasil dibatalkan' });
  } catch { return res.status(500).json({ success: false, error: 'Gagal membatalkan' }); }
}

// ─── Clock In/Out ───
async function clockIn(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: { checkIn: new Date().toTimeString().substring(0, 5) } });
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    await sequelize.query(`
      INSERT INTO employee_attendances (user_id, date, check_in, status, created_at, updated_at)
      VALUES (:userId, :today, :now, 'present', :now, :now)
      ON CONFLICT (user_id, date) DO UPDATE SET check_in = :now, status = 'present', updated_at = :now
    `, { replacements: { userId, today, now } });
    return res.json({ success: true, data: { checkIn: new Date().toTimeString().substring(0, 5) } });
  } catch (e: any) {
    return res.json({ success: true, data: { checkIn: new Date().toTimeString().substring(0, 5) }, message: 'Mock clock-in' });
  }
}

async function clockOut(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: { checkOut: new Date().toTimeString().substring(0, 5) } });
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    await sequelize.query(`
      UPDATE employee_attendances SET check_out = :now, updated_at = :now
      WHERE user_id = :userId AND date = :today
    `, { replacements: { userId, today, now } });
    return res.json({ success: true, data: { checkOut: new Date().toTimeString().substring(0, 5) } });
  } catch {
    return res.json({ success: true, data: { checkOut: new Date().toTimeString().substring(0, 5) } });
  }
}

// ─── KPI ───
async function getKPI(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: mockKPI() });
  try {
    const period = new Date().toISOString().substring(0, 7);
    const [rows] = await sequelize.query(`
      SELECT ek.* FROM employee_kpis ek
      LEFT JOIN employees e ON ek.employee_id = e.id
      WHERE (e.user_id = :userId OR e.email = (SELECT email FROM users WHERE id = :userId))
      AND ek.period = :period ORDER BY ek.category
    `, { replacements: { userId, period } });

    if (!rows || rows.length === 0) return res.json({ success: true, data: mockKPI() });

    const overallScore = Math.round(rows.reduce((s: number, r: any) => s + (r.achievement || 0), 0) / rows.length);
    const metrics = rows.map((r: any) => ({
      name: r.metric_name || r.category,
      target: r.target_value || 100,
      actual: r.actual_value || 0,
      unit: r.unit || '%',
      weight: r.weight || 25,
      trend: (r.actual_value || 0) >= (r.previous_value || 0) ? 'up' : 'down',
    }));
    return res.json({ success: true, data: { overallScore, metrics } });
  } catch { return res.json({ success: true, data: mockKPI() }); }
}

// ─── Leave Balance & Requests ───
async function getLeaveBalance(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: mockLeaveBalance() });
  try {
    const year = new Date().getFullYear();
    const [rows] = await sequelize.query(`
      SELECT lt.name as type, lb.total_days as total, lb.used_days as used
      FROM employee_leave_balances lb
      LEFT JOIN leave_types lt ON lb.leave_type_id = lt.id
      LEFT JOIN employees e ON lb.employee_id = e.id
      WHERE (e.user_id = :userId OR e.email = (SELECT email FROM users WHERE id = :userId))
      AND lb.year = :year
    `, { replacements: { userId, year } });
    if (!rows || rows.length === 0) return res.json({ success: true, data: mockLeaveBalance() });
    return res.json({ success: true, data: rows });
  } catch { return res.json({ success: true, data: mockLeaveBalance() }); }
}

async function getLeaveRequests(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: mockLeaveRequests() });
  try {
    const [rows] = await sequelize.query(`
      SELECT lr.*, lt.name as leave_type_name FROM leave_requests lr
      LEFT JOIN leave_types lt ON lr.leave_type = lt.code OR lr.leave_type_id = lt.id
      LEFT JOIN employees e ON lr.employee_id = e.id
      WHERE (e.user_id = :userId OR e.email = (SELECT email FROM users WHERE id = :userId))
      ORDER BY lr.created_at DESC LIMIT 20
    `, { replacements: { userId } });
    if (!rows || rows.length === 0) return res.json({ success: true, data: mockLeaveRequests() });
    return res.json({ success: true, data: rows });
  } catch { return res.json({ success: true, data: mockLeaveRequests() }); }
}

async function createLeaveRequest(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { leaveType, startDate, endDate, reason } = req.body;
  if (!leaveType || !startDate || !endDate || !reason) {
    return res.status(400).json({ success: false, error: 'Semua field harus diisi' });
  }
  const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1;
  if (!sequelize) {
    return res.json({ success: true, data: { id: 'lr-new', leaveType, startDate, endDate, totalDays: days, reason, status: 'pending' } });
  }
  try {
    const now = new Date().toISOString();
    const [empRows] = await sequelize.query(
      `SELECT id FROM employees WHERE user_id = :userId OR email = (SELECT email FROM users WHERE id = :userId) LIMIT 1`,
      { replacements: { userId } }
    );
    const employeeId = empRows?.[0]?.id || userId;
    await sequelize.query(`
      INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, total_days, reason, status, tenant_id, created_at, updated_at)
      VALUES (:employeeId, :leaveType, :startDate, :endDate, :days, :reason, 'pending', :tenantId, :now, :now)
    `, { replacements: { employeeId, leaveType, startDate, endDate, days, reason, tenantId, now } });
    return res.json({ success: true, message: 'Pengajuan cuti berhasil dikirim' });
  } catch (e: any) {
    return res.json({ success: true, data: { leaveType, startDate, endDate, totalDays: days, reason, status: 'pending' }, message: 'Saved (mock)' });
  }
}

// ─── Claims ───
async function getClaims(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: mockClaims() });
  try {
    const [rows] = await sequelize.query(`
      SELECT c.*, c.rejection_reason, c.rejected_by_name, c.rejected_at, c.resubmit_count,
             COALESCE(c.attachments_count, 0) as attachments_count
      FROM employee_claims c
      LEFT JOIN employees e ON c.employee_id = e.id
      WHERE (e.user_id = :userId OR e.email = (SELECT email FROM users WHERE id = :userId))
      ORDER BY c.created_at DESC LIMIT 20
    `, { replacements: { userId } });
    if (!rows || rows.length === 0) return res.json({ success: true, data: mockClaims() });
    return res.json({ success: true, data: rows });
  } catch { return res.json({ success: true, data: mockClaims() }); }
}

async function createClaim(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { claimType, amount, description, receiptDate, attachments } = req.body;
  if (!claimType || !amount || !description) {
    return res.status(400).json({ success: false, error: 'Semua field harus diisi' });
  }
  if (!sequelize) {
    return res.json({ success: true, data: { id: 'cl-new', claim_type: claimType, amount, description, status: 'pending' } });
  }
  try {
    const now = new Date().toISOString();
    const [empRows] = await sequelize.query(
      `SELECT id FROM employees WHERE user_id = :userId OR email = (SELECT email FROM users WHERE id = :userId) LIMIT 1`,
      { replacements: { userId } }
    );
    const employeeId = empRows?.[0]?.id || userId;
    const attachmentsCount = Array.isArray(attachments) ? attachments.length : 0;
    const receiptUrl = attachmentsCount > 0 ? JSON.stringify(attachments.map((a: any) => a.name)) : null;
    await sequelize.query(`
      INSERT INTO employee_claims (employee_id, claim_type, amount, description, receipt_date, status, tenant_id, receipt_url, attachments_count, created_at, updated_at)
      VALUES (:employeeId, :claimType, :amount, :description, :receiptDate, 'pending', :tenantId, :receiptUrl, :attachmentsCount, :now, :now)
    `, { replacements: { employeeId, claimType, amount: parseFloat(amount), description, receiptDate: receiptDate || now, tenantId, receiptUrl, attachmentsCount, now } });
    return res.json({ success: true, message: 'Klaim berhasil dikirim' });
  } catch {
    return res.json({ success: true, data: { claim_type: claimType, amount, description, status: 'pending' }, message: 'Saved (mock)' });
  }
}

async function resubmitClaim(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { claimId, amount, description, receiptDate, attachments } = req.body;
  if (!claimId) return res.status(400).json({ success: false, error: 'claimId wajib diisi' });
  if (!sequelize) {
    return res.json({ success: true, message: 'Klaim berhasil diajukan ulang' });
  }
  try {
    // Verify ownership — employee can only resubmit their own rejected claim
    const [owned] = await sequelize.query(`
      SELECT c.id FROM employee_claims c
      LEFT JOIN employees e ON c.employee_id = e.id
      WHERE c.id = :claimId AND c.status = 'rejected'
        AND (e.user_id = :userId OR e.email = (SELECT email FROM users WHERE id = :userId))
      LIMIT 1
    `, { replacements: { claimId, userId } });
    if (!owned || (owned as any[]).length === 0) {
      return res.status(404).json({ success: false, error: 'Klaim tidak ditemukan atau tidak bisa diajukan ulang' });
    }
    const attachmentsCount = Array.isArray(attachments) ? attachments.length : null;
    const receiptUrl = attachmentsCount ? JSON.stringify(attachments.map((a: any) => a.name)) : null;
    await sequelize.query(`
      UPDATE employee_claims
      SET status = 'pending',
          amount = COALESCE(:amount, amount),
          description = COALESCE(:description, description),
          receipt_date = COALESCE(:receiptDate, receipt_date),
          receipt_url = COALESCE(:receiptUrl, receipt_url),
          attachments_count = COALESCE(:attachmentsCount, attachments_count),
          rejection_reason = NULL,
          rejected_by = NULL,
          rejected_by_name = NULL,
          rejected_at = NULL,
          resubmitted_at = NOW(),
          resubmit_count = COALESCE(resubmit_count, 0) + 1,
          updated_at = NOW()
      WHERE id = :claimId
    `, { replacements: { claimId, amount: amount ? parseFloat(amount) : null, description: description || null, receiptDate: receiptDate || null, receiptUrl, attachmentsCount } });
    return res.json({ success: true, message: 'Klaim berhasil diajukan ulang dan sedang menunggu persetujuan' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Gagal mengajukan ulang klaim', details: e.message });
  }
}

// ─── Travel ───
async function getTravel(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: mockTravel() });
  try {
    const [rows] = await sequelize.query(`
      SELECT tr.* FROM travel_requests tr
      LEFT JOIN employees e ON tr.employee_id = e.id
      WHERE (e.user_id = :userId OR e.email = (SELECT email FROM users WHERE id = :userId))
      ORDER BY tr.created_at DESC LIMIT 20
    `, { replacements: { userId } });
    if (!rows || rows.length === 0) return res.json({ success: true, data: mockTravel() });
    return res.json({ success: true, data: rows });
  } catch { return res.json({ success: true, data: mockTravel() }); }
}

async function createTravelRequest(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { destination, departureCity, purpose, departureDate, returnDate, transportation, estimatedBudget } = req.body;
  if (!destination || !purpose || !departureDate || !returnDate) {
    return res.status(400).json({ success: false, error: 'Semua field harus diisi' });
  }
  if (!sequelize) {
    return res.json({ success: true, data: { destination, purpose, status: 'pending' } });
  }
  try {
    const now = new Date().toISOString();
    const [empRows] = await sequelize.query(
      `SELECT id FROM employees WHERE user_id = :userId OR email = (SELECT email FROM users WHERE id = :userId) LIMIT 1`,
      { replacements: { userId } }
    );
    const employeeId = empRows?.[0]?.id || userId;
    const reqNum = `TRV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    await sequelize.query(`
      INSERT INTO travel_requests (employee_id, request_number, destination, departure_city, purpose, departure_date, return_date, transportation, estimated_budget, status, tenant_id, created_at, updated_at)
      VALUES (:employeeId, :reqNum, :destination, :departureCity, :purpose, :departureDate, :returnDate, :transportation, :budget, 'pending', :tenantId, :now, :now)
    `, { replacements: { employeeId, reqNum, destination, departureCity: departureCity || 'Jakarta', purpose, departureDate, returnDate, transportation: transportation || 'flight', budget: parseFloat(estimatedBudget) || 0, tenantId, now } });
    return res.json({ success: true, message: 'Pengajuan perjalanan berhasil dikirim' });
  } catch {
    return res.json({ success: true, data: { destination, purpose, status: 'pending' }, message: 'Saved (mock)' });
  }
}

// ─── Notifications ───
async function getNotifications(res: NextApiResponse, userId: string) {
  return res.json({ success: true, data: mockNotifications() });
}

// ─── Summary ───
async function getSummary(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: mockSummary() });
  try {
    const [pendingLeave] = await sequelize.query(`
      SELECT COUNT(*)::int as count FROM leave_requests lr
      LEFT JOIN employees e ON lr.employee_id = e.id
      WHERE (e.user_id = :userId OR e.email = (SELECT email FROM users WHERE id = :userId))
      AND lr.status = 'pending'
    `, { replacements: { userId } });
    const [pendingClaims] = await sequelize.query(`
      SELECT COUNT(*)::int as count FROM employee_claims c
      LEFT JOIN employees e ON c.employee_id = e.id
      WHERE (e.user_id = :userId OR e.email = (SELECT email FROM users WHERE id = :userId))
      AND c.status = 'pending'
    `, { replacements: { userId } });
    const [pendingTravel] = await sequelize.query(`
      SELECT COUNT(*)::int as count FROM travel_requests tr
      LEFT JOIN employees e ON tr.employee_id = e.id
      WHERE (e.user_id = :userId OR e.email = (SELECT email FROM users WHERE id = :userId))
      AND tr.status = 'pending'
    `, { replacements: { userId } });
    return res.json({
      success: true,
      data: {
        pendingLeave: pendingLeave?.[0]?.count || 0,
        pendingClaims: pendingClaims?.[0]?.count || 0,
        pendingTravel: pendingTravel?.[0]?.count || 0,
      }
    });
  } catch { return res.json({ success: true, data: mockSummary() }); }
}

// ─── Mock Data ───
function mockProfile() {
  return { name: 'Budi Santoso', email: 'budi@bedagang.com', phone: '08123456789', position: 'Senior Developer', department: 'Engineering', branch_name: 'Cabang Jakarta Pusat', employee_code: 'EMP-2024-007', join_date: '2023-06-15' };
}
function mockAttendance() {
  return { today: { check_in: '08:15', check_out: null, status: 'present' }, thisMonth: { present: 18, late: 2, absent: 1, leave: 1 } };
}
function mockKPI() {
  return { overallScore: 87, metrics: [
    { name: 'Penjualan', target: 100, actual: 92, unit: '%', trend: 'up' },
    { name: 'Kepuasan Pelanggan', target: 90, actual: 88, unit: '%', trend: 'stable' },
    { name: 'Kehadiran', target: 95, actual: 91, unit: '%', trend: 'down' },
    { name: 'Produktivitas', target: 100, actual: 85, unit: '%', trend: 'up' },
  ]};
}
function mockLeaveBalance() {
  return [
    { type: 'Cuti Tahunan', used: 5, total: 12 },
    { type: 'Cuti Sakit', used: 2, total: 14 },
    { type: 'Cuti Penting', used: 1, total: 3 },
  ];
}
function mockLeaveRequests() {
  return [
    { id: 'l1', leave_type: 'annual', leave_type_name: 'Cuti Tahunan', start_date: '2026-04-20', end_date: '2026-04-22', total_days: 3, status: 'pending', reason: 'Liburan keluarga' },
    { id: 'l2', leave_type: 'sick', leave_type_name: 'Cuti Sakit', start_date: '2026-03-05', end_date: '2026-03-05', total_days: 1, status: 'approved', reason: 'Sakit demam' },
    { id: 'l3', leave_type: 'annual', leave_type_name: 'Cuti Tahunan', start_date: '2026-02-14', end_date: '2026-02-14', total_days: 1, status: 'approved', reason: 'Urusan pribadi' },
  ];
}
function mockClaims() {
  return [
    { id: 'c1', claim_type: 'medical', description: 'Biaya rawat jalan', amount: 1500000, status: 'approved', created_at: '2026-03-05' },
    { id: 'c2', claim_type: 'transport', description: 'Transport dinas Bandung', amount: 850000, status: 'pending', created_at: '2026-03-10' },
    { id: 'c3', claim_type: 'meals', description: 'Makan lembur', amount: 350000, status: 'approved', created_at: '2026-03-08' },
    { id: 'c4', claim_type: 'other', description: 'Parkir kantor', amount: 200000, status: 'rejected', created_at: '2026-03-01', rejection_reason: 'Klaim parkir tidak termasuk dalam kebijakan reimbursement. Silakan ajukan ulang dengan melampirkan surat tugas resmi.', rejected_by_name: 'Manager HR', rejected_at: '2026-03-02', resubmit_count: 0, attachments_count: 0 },
  ];
}
function mockTravel() {
  return [
    { id: 't1', request_number: 'TRV-2026-024', destination: 'Surabaya', departure_date: '2026-03-18', return_date: '2026-03-20', estimated_budget: 8500000, status: 'approved', purpose: 'Visit cabang & audit' },
    { id: 't2', request_number: 'TRV-2026-023', destination: 'Bali', departure_date: '2026-03-22', return_date: '2026-03-24', estimated_budget: 12000000, status: 'pending', purpose: 'Meeting supplier' },
  ];
}
function mockNotifications() {
  return [
    { id: 'n1', title: 'Cuti disetujui', message: 'Pengajuan cuti 14 Feb telah disetujui', time: '2 jam lalu', read: false, type: 'success' },
    { id: 'n2', title: 'KPI diperbarui', message: 'Skor KPI bulan Maret telah diperbarui', time: '1 hari lalu', read: false, type: 'info' },
    { id: 'n3', title: 'Klaim ditolak', message: 'Klaim parkir kantor ditolak oleh atasan', time: '3 hari lalu', read: true, type: 'error' },
  ];
}
function mockSummary() {
  return { pendingLeave: 1, pendingClaims: 1, pendingTravel: 1 };
}
