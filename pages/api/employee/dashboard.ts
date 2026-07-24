import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import {
  buildLastCheckIn,
  buildLastCheckOut,
  buildClockEvent,
  pickLatestClockEvent,
  normalizeAnnouncement,
  normalizeNotification,
  resolveEmployeeContext,
  formatRelativeTime,
  formatCheckInTime,
} from '../../../lib/employee-portal';
import { ensurePortalEmployee, ensurePortalSchema } from '@/lib/employee-portal/ensure-portal';
import { canAccessManagerPortal, isSuperAdminRole } from '@/lib/humanify/manager-access';
import {
  createPortalLeaveRequest,
  attachApprovalSteps,
} from '@/lib/hris/leave-request-service';
import {
  notifyManagersForEmployee,
} from '@/lib/hris/employee-notifications';
import {
  getTodayAttendance,
  getMonthStatusSummary,
  getLastClockRow,
  getAttendanceHistoryRows,
  portalClockIn,
  portalClockOut,
} from '../../../lib/hris/attendance-store';
import { loadActiveGeofences, matchGeofences } from '@/lib/hris/geofence-utils';
import { allowHrMockFallback } from '@/lib/hris/data-source';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch (e) {}

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
};

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
        case 'attendance-history': return getAttendanceHistory(req, res, userId, tenantId);
        case 'overtime-history':   return getOvertimeHistory(req, res, userId, tenantId);
        case 'travel': return getTravel(res, userId, tenantId);
        case 'notifications': return getNotifications(res, userId, tenantId);
        case 'announcements': return getAnnouncements(res, userId, tenantId);
        case 'summary': return getSummary(res, userId, tenantId);
        case 'payslip': return getPayslip(req, res, userId, tenantId);
        case 'disciplinary-letters': return getDisciplinaryLetters(res, userId, tenantId);
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
        case 'replace-claim-receipt': return replaceClaimReceipt(req, res, userId, tenantId);
        case 'submit-overtime':  return submitOvertime(req, res, userId, tenantId);
        case 'cancel-overtime':  return cancelOvertime(req, res, userId, tenantId);
        case 'travel-request': return createTravelRequest(req, res, userId, tenantId);
        case 'mark-notification-read': return markNotificationRead(req, res, userId, tenantId);
        case 'mark-all-notifications-read': return markAllNotificationsRead(res, userId, tenantId);
        case 'acknowledge-disciplinary': return acknowledgeDisciplinary(req, res, userId, tenantId);
        default: return res.status(400).json({ error: 'Unknown action' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.warn('Employee Dashboard API Error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ─── Profile ───
async function getProfile(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: allowHrMockFallback() ? mockProfile() : null });
  try {
    // Auto-link / provision employee so portal forms work for owner/self-serve users
    await ensurePortalEmployee(sequelize, userId, tenantId);

    const [rows] = await sequelize.query(`
      SELECT u.id, u.name, u.email, u.phone, u.role,
        e.id as employee_id, e.employee_code, e.position, e.department, e.hire_date as join_date,
        e.employment_category, e.business_vertical, e.agent_type, e.territory,
        b.name as branch_name, b.code as branch_code
      FROM users u
      LEFT JOIN employees e ON e.tenant_id = COALESCE(:tenantId::uuid, u.tenant_id)
        AND (e.user_id = u.id OR e.email = u.email)
      LEFT JOIN branches b ON u.assigned_branch_id = b.id OR e.branch_id = b.id
      WHERE u.id = :userId LIMIT 1
    `, { replacements: { userId, tenantId: tenantId || null } });
    const profile = rows[0] || (allowHrMockFallback() ? mockProfile() : null);
    if (!profile) return res.json({ success: true, data: null });
    const mfCategories = ['account_officer', 'collector', 'surveyor', 'telemarketing', 'field_agent'];
    const isMfAgent = profile.business_vertical === 'multifinance'
      || mfCategories.includes(profile.employment_category || '');
    const role = String(profile.role || '');
    const isManagerPortal = canAccessManagerPortal(role);
    const isSuperAdmin = isSuperAdminRole(role);
    return res.json({
      success: true,
      data: { ...profile, isMfAgent, isManagerPortal, isSuperAdmin },
    });
  } catch { return res.json({ success: true, data: allowHrMockFallback() ? mockProfile() : null }); }
}

const employeeAttendanceWhere = `(employee_id IN (
  SELECT id FROM employees WHERE user_id = :userId OR email = (SELECT email FROM users WHERE id = :userId)
))`;

// ─── Attendance ───
async function getAttendance(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: allowHrMockFallback() ? mockAttendance() : null });
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';

    const todayRow = await getTodayAttendance(sequelize, userId, today, tenantId);
    const todayCheckIn = buildClockEvent('check_in', todayRow);
    const todayCheckOut = buildClockEvent('check_out', todayRow);
    const monthSummary = await getMonthStatusSummary(sequelize, userId, monthStart, today, tenantId);

    let lastCheckIn: any = todayCheckIn;
    let lastCheckOut: any = todayCheckOut;
    if (!lastCheckIn) lastCheckIn = buildLastCheckIn(await getLastClockRow(sequelize, userId, 'in', tenantId));
    if (!lastCheckOut) lastCheckOut = buildLastCheckOut(await getLastClockRow(sequelize, userId, 'out', tenantId));

    const lastClockEvent = pickLatestClockEvent(todayCheckOut, todayCheckIn, lastCheckOut, lastCheckIn);

    return res.json({
      success: true,
      data: {
        today: todayRow ? {
          ...todayRow,
          check_in: formatCheckInTime(todayRow.check_in || todayRow.check_in_at),
          check_out: formatCheckInTime(todayRow.check_out || todayRow.check_out_at),
        } : { check_in: null, check_out: null, status: 'not_recorded' },
        thisMonth: {
          present: monthSummary['present'] || 0,
          late: monthSummary['late'] || 0,
          absent: monthSummary['absent'] || 0,
          leave: monthSummary['leave'] || 0,
        },
        lastCheckIn,
        lastCheckOut,
        lastClockEvent,
      },
    });
  } catch { return res.json({ success: true, data: allowHrMockFallback() ? mockAttendance() : null }); }
}

// ─── Attendance History (for employee self-service) ───
async function getAttendanceHistory(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { month } = req.query; // format: YYYY-MM, default current month
  const targetMonth = (month as string) || new Date().toISOString().slice(0, 7);
  const monthStart = `${targetMonth}-01`;
  const nextMonth = new Date(`${targetMonth}-01`);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const monthEnd = nextMonth.toISOString().split('T')[0];

  if (!sequelize) return res.json({ success: true, data: allowHrMockFallback() ? mockAttendanceHistory(targetMonth) : [] });

  try {
    const records = await getAttendanceHistoryRows(sequelize, userId, monthStart, monthEnd, tenantId);
    const summary = {
      present: records.filter(r => r.status === 'present').length,
      late:    records.filter(r => r.status === 'late').length,
      absent:  records.filter(r => r.status === 'absent').length,
      leave:   records.filter(r => r.status === 'leave').length,
      wfh:     records.filter(r => r.status === 'work_from_home' || r.status === 'wfh').length,
      total:   records.length,
    };
    const totalWorkHours = records.reduce((s, r) => s + (Number(r.work_hours) || 0), 0);
    const workDaysInMonth = records.filter(r => ['present','late','work_from_home','wfh'].includes(r.status)).length;
    const attendanceRate = summary.total > 0
      ? Math.round(((summary.present + summary.late + summary.wfh) / summary.total) * 100)
      : 0;

    return res.json({ success: true, data: { records, summary, totalWorkHours: Math.round(totalWorkHours * 10) / 10, workDaysInMonth, attendanceRate, month: targetMonth } });
  } catch {
    return res.json({ success: true, data: allowHrMockFallback() ? mockAttendanceHistory(targetMonth) : { records: [], summary: {}, totalWorkHours: 0, workDaysInMonth: 0, attendanceRate: 0, month: targetMonth } });
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
  const empty = {
    records: [] as any[],
    recap: { total_sessions: 0, total_hours: 0, total_pay_approved: 0, pending: 0, approved: 0, rejected: 0 },
    month: targetMonth,
  };

  if (!sequelize) {
    return res.json({
      success: true,
      data: allowHrMockFallback() ? { records: MOCK_OT, recap: MOCK_RECAP, month: targetMonth } : empty,
    });
  }
  if (!tenantId) return res.json({ success: true, data: empty });

  try {
    const [emp] = await sequelize.query(
      `SELECT id FROM employees WHERE user_id = :uid AND tenant_id = :tid LIMIT 1`,
      { replacements: { uid: userId, tid: tenantId } },
    );
    const empId = emp?.[0]?.id;
    if (!empId) return res.json({ success: true, data: empty });

    const [rows] = await sequelize.query(`
      SELECT o.*,
        COALESCE(
          o.duration_hours,
          o.hours,
          CASE
            WHEN o.start_time IS NOT NULL AND o.end_time IS NOT NULL
              THEN ROUND(EXTRACT(EPOCH FROM (o.end_time::time - o.start_time::time)) / 3600.0, 2)
            ELSE 0
          END
        ) AS duration_hours,
        ap.name AS approved_by_name
      FROM overtime_requests o
      LEFT JOIN users ap ON ap.id::text = o.approved_by::text
      WHERE o.employee_id = :empId
        AND o.tenant_id = :tid
        AND TO_CHAR(COALESCE(o.date, o.request_date), 'YYYY-MM') = :month
      ORDER BY COALESCE(o.date, o.request_date) DESC NULLS LAST, o.created_at DESC
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
  } catch (e: any) {
    console.warn('getOvertimeHistory:', e?.message || e);
    return res.json({
      success: true,
      data: allowHrMockFallback() ? { records: MOCK_OT, recap: MOCK_RECAP, month: targetMonth } : empty,
    });
  }
}

// ─── Submit Overtime ─────────────────────────────────────────────────────────
async function submitOvertime(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { date, start_time, end_time, reason, work_description, overtime_type = 'regular' } = req.body || {};
  if (!date || !start_time || !end_time || !reason)
    return res.status(400).json({ success: false, error: 'date, start_time, end_time, reason wajib diisi' });

  if (!sequelize) {
    if (allowHrMockFallback()) {
      return res.json({ success: true, message: 'Pengajuan lembur berhasil dikirim dan menunggu persetujuan' });
    }
    return res.status(503).json({ success: false, error: 'Database tidak tersedia' });
  }

  try {
    await ensurePortalSchema(sequelize);
    const emp = await ensurePortalEmployee(sequelize, userId, tenantId);
    if (!emp?.id) {
      return res.status(400).json({ success: false, error: 'Profil karyawan belum tersedia' });
    }

    let baseSalary = emp.salary || 0;
    try {
      const [sal] = await sequelize.query(
        `SELECT base_salary FROM employee_salaries
         WHERE employee_id = :empId AND is_active = true
         ORDER BY COALESCE(effective_date, created_at::date) DESC NULLS LAST LIMIT 1`,
        { replacements: { empId: emp.id } },
      );
      if (sal?.[0]?.base_salary) baseSalary = Number(sal[0].base_salary);
    } catch { /* optional */ }

    const dow = new Date(date).getDay();
    const dayType = (dow === 0 || dow === 6) ? 'weekend' : 'weekday';
    const mult = dayType === 'weekend' ? 2.0 : 1.5;
    const [sh, sm] = start_time.split(':').map(Number);
    const [eh, em] = end_time.split(':').map(Number);
    const durHrs = Math.max(0.5, Math.round(((eh + em / 60) - (sh + sm / 60)) * 10) / 10);
    const hourlyRate = baseSalary > 0 ? baseSalary / 173 : 0;
    const calcPay = Math.round(hourlyRate * durHrs * mult);
    const tid = tenantId || emp.tenantId;

    // Insert compatible with both legacy (request_date/hours) and rich schema
    await sequelize.query(`
      INSERT INTO overtime_requests (
        id, tenant_id, employee_id,
        request_date, hours,
        date, day_type, start_time, end_time,
        reason, work_description, overtime_type, multiplier, calculated_pay, duration_hours,
        status, created_at, updated_at
      ) VALUES (
        uuid_generate_v4(), :tid, :empId,
        :date, :hours,
        :date, :dayType, :start, :end,
        :reason, :desc, :otype, :mult, :pay, :hours,
        'pending', NOW(), NOW()
      )
    `, {
      replacements: {
        tid,
        empId: emp.id,
        date,
        hours: durHrs,
        dayType,
        start: start_time,
        end: end_time,
        reason,
        desc: work_description || null,
        otype: overtime_type,
        mult,
        pay: calcPay,
      },
    });

    await notifyManagersForEmployee(sequelize, emp.id, {
      tenantId: tid,
      title: 'Pengajuan Lembur Baru',
      message: `Lembur ${date} (${durHrs.toFixed(1)} jam) menunggu persetujuan Anda.`,
      type: 'approval',
      sourceType: 'employee_overtime',
    });

    return res.json({ success: true, message: 'Pengajuan lembur berhasil dikirim dan menunggu persetujuan' });
  } catch (e: any) {
    console.warn('submitOvertime error:', e?.message || e);
    return res.status(500).json({ success: false, error: 'Gagal mengajukan lembur', details: e.message });
  }
}

// ─── Cancel Overtime ─────────────────────────────────────────────────────────
async function cancelOvertime(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (!sequelize) {
    if (allowHrMockFallback()) return res.json({ success: true, message: 'Pengajuan lembur dibatalkan' });
    return res.status(503).json({ success: false, error: 'Database tidak tersedia' });
  }
  if (!tenantId) return res.status(403).json({ success: false, error: 'Tenant context required' });
  try {
    const emp = await ensurePortalEmployee(sequelize, userId, tenantId);
    if (!emp?.id) return res.status(400).json({ success: false, error: 'Profil karyawan belum tersedia' });
    const [updated] = await sequelize.query(
      `UPDATE overtime_requests SET status='cancelled', updated_at=NOW()
       WHERE id=:id AND employee_id=:empId AND tenant_id=:tid AND status='pending'
       RETURNING id`,
      { replacements: { id, empId: emp.id, tid: tenantId } },
    );
    if (!updated?.[0]) {
      return res.status(404).json({ success: false, error: 'Pengajuan lembur tidak ditemukan atau sudah diproses' });
    }
    return res.json({ success: true, message: 'Pengajuan lembur berhasil dibatalkan' });
  } catch {
    return res.status(500).json({ success: false, error: 'Gagal membatalkan' });
  }
}

// ─── Clock In/Out ───
async function clockIn(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { latitude, longitude, address, accuracy, photo_base64, method } = req.body || {};
  const checkInTime = new Date().toTimeString().substring(0, 5);
  const clockMethod = method === 'photo_mobile' || photo_base64 ? 'photo_mobile' : 'gps_mobile';
  const locationPayload = (latitude != null && longitude != null)
    ? { lat: Number(latitude), lng: Number(longitude), address: address || null, accuracy: accuracy != null ? Number(accuracy) : null }
    : null;

  let geofenceMatch = null;
  if (locationPayload && sequelize) {
    const fences = await loadActiveGeofences(sequelize, tenantId || null);
    geofenceMatch = matchGeofences(locationPayload.lat, locationPayload.lng, fences);
  }

  if (!sequelize) {
    return res.json({
      success: true,
      data: {
        checkIn: checkInTime,
        method: clockMethod,
        location: locationPayload || { address: 'Kantor Pusat Jakarta', lat: -6.2088, lng: 106.8456 },
        geofence: geofenceMatch,
        photoSaved: !!photo_base64,
      },
    });
  }

  try {
    const locationJson = locationPayload
      ? JSON.stringify({ ...locationPayload, geofence: geofenceMatch })
      : null;
    await portalClockIn(
      sequelize,
      userId,
      tenantId,
      locationJson,
      clockMethod,
      photo_base64 || null,
      geofenceMatch?.inside ? geofenceMatch.id : null,
    );

    return res.json({
      success: true,
      data: {
        checkIn: checkInTime,
        method: clockMethod,
        location: locationPayload,
        geofence: geofenceMatch,
        photoSaved: !!photo_base64,
        mapsUrl: locationPayload ? `https://www.google.com/maps?q=${locationPayload.lat},${locationPayload.lng}` : null,
      },
    });
  } catch {
    return res.json({
      success: true,
      data: { checkIn: checkInTime, location: locationPayload, geofence: geofenceMatch },
      message: 'Mock clock-in',
    });
  }
}

async function clockOut(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { latitude, longitude, address, accuracy, photo_base64, method } = req.body || {};
  const checkOutTime = new Date().toTimeString().substring(0, 5);
  const clockMethod = method === 'photo_mobile' || photo_base64 ? 'photo_mobile' : 'gps_mobile';
  const locationPayload = (latitude != null && longitude != null)
    ? { lat: Number(latitude), lng: Number(longitude), address: address || null, accuracy: accuracy != null ? Number(accuracy) : null }
    : null;

  let geofenceMatch = null;
  if (locationPayload && sequelize) {
    const fences = await loadActiveGeofences(sequelize, tenantId || null);
    geofenceMatch = matchGeofences(locationPayload.lat, locationPayload.lng, fences);
  }

  if (!sequelize) {
    return res.json({
      success: true,
      data: {
        checkOut: checkOutTime,
        method: clockMethod,
        location: locationPayload || { address: 'Kantor Pusat Jakarta', lat: -6.2088, lng: 106.8456 },
        geofence: geofenceMatch,
        photoSaved: !!photo_base64,
        mapsUrl: locationPayload ? `https://www.google.com/maps?q=${locationPayload.lat},${locationPayload.lng}` : null,
      },
    });
  }

  try {
    const locationJson = locationPayload
      ? JSON.stringify({ ...locationPayload, geofence: geofenceMatch })
      : null;
    await portalClockOut(
      sequelize,
      userId,
      tenantId,
      locationJson,
      clockMethod,
      photo_base64 || null,
      geofenceMatch?.inside ? geofenceMatch.id : null,
    );

    return res.json({
      success: true,
      data: {
        checkOut: checkOutTime,
        method: clockMethod,
        location: locationPayload,
        geofence: geofenceMatch,
        photoSaved: !!photo_base64,
        mapsUrl: locationPayload ? `https://www.google.com/maps?q=${locationPayload.lat},${locationPayload.lng}` : null,
      },
    });
  } catch {
    return res.json({
      success: true,
      data: { checkOut: checkOutTime, location: locationPayload, geofence: geofenceMatch },
    });
  }
}

// ─── KPI ───
async function getKPI(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: allowHrMockFallback() ? mockKPI() : null });
  try {
    const period = new Date().toISOString().substring(0, 7);
    const [rows] = await sequelize.query(`
      SELECT ek.* FROM employee_kpis ek
      LEFT JOIN employees e ON ek.employee_id = e.id
      WHERE (e.user_id = :userId OR e.email = (SELECT email FROM users WHERE id = :userId))
      ${tenantId ? 'AND e.tenant_id = :tenantId' : 'AND 1=0'}
      AND ek.period = :period ORDER BY ek.category
    `, { replacements: { userId, period, tenantId } });

    if (!rows || rows.length === 0) {
      return res.json({ success: true, data: allowHrMockFallback() ? mockKPI() : null });
    }

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
  } catch { return res.json({ success: true, data: allowHrMockFallback() ? mockKPI() : null }); }
}

// ─── Leave Balance & Requests ───
async function getLeaveBalance(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) {
    return res.json({ success: true, data: allowHrMockFallback() ? mockLeaveBalance() : [] });
  }
  try {
    await ensurePortalEmployee(sequelize, userId, tenantId);
    const year = new Date().getFullYear();
    // Prefer leave_balances (prod schema); fallback employee_leave_balances
    let rows: any[] = [];
    try {
      const [r] = await sequelize.query(`
        SELECT lt.name as type, lt.code,
          COALESCE(lb.entitled, 12) as total,
          COALESCE(lb.used, 0) as used,
          COALESCE(lb.remaining, COALESCE(lb.entitled, 12) - COALESCE(lb.used, 0)) as remaining
        FROM leave_balances lb
        LEFT JOIN leave_types lt ON lb.leave_type_id = lt.id
        LEFT JOIN employees e ON lb.employee_id = e.id
        WHERE (e.user_id = :userId OR e.email = (SELECT email FROM users WHERE id = :userId))
        ${tenantId ? 'AND e.tenant_id = :tenantId' : 'AND 1=0'}
        AND lb.year = :year
      `, { replacements: { userId, year, tenantId } });
      rows = r || [];
    } catch {
      const [r] = await sequelize.query(`
        SELECT lt.name as type, lb.total_days as total, lb.used_days as used
        FROM employee_leave_balances lb
        LEFT JOIN leave_types lt ON lb.leave_type_id = lt.id
        LEFT JOIN employees e ON lb.employee_id = e.id
        WHERE (e.user_id = :userId OR e.email = (SELECT email FROM users WHERE id = :userId))
        ${tenantId ? 'AND e.tenant_id = :tenantId' : 'AND 1=0'}
        AND lb.year = :year
      `, { replacements: { userId, year, tenantId } });
      rows = r || [];
    }
    if (!rows.length) {
      return res.json({ success: true, data: allowHrMockFallback() ? mockLeaveBalance() : [] });
    }
    return res.json({ success: true, data: rows });
  } catch {
    return res.json({ success: true, data: allowHrMockFallback() ? mockLeaveBalance() : [] });
  }
}

async function getLeaveRequests(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) {
    return res.json({ success: true, data: allowHrMockFallback() ? mockLeaveRequests() : [] });
  }
  try {
    const [rows] = await sequelize.query(`
      SELECT lr.*, lt.name as leave_type_name FROM leave_requests lr
      LEFT JOIN leave_types lt ON lr.leave_type = lt.code OR lr.leave_type_id = lt.id
      LEFT JOIN employees e ON lr.employee_id::text = e.id::text
      WHERE (e.user_id = :userId OR e.email = (SELECT email FROM users WHERE id = :userId))
      ${tenantId ? 'AND e.tenant_id = :tenantId AND lr.tenant_id = :tenantId' : 'AND 1=0'}
      ORDER BY lr.created_at DESC LIMIT 20
    `, { replacements: { userId, tenantId } });
    if (!rows || rows.length === 0) {
      return res.json({ success: true, data: allowHrMockFallback() ? mockLeaveRequests() : [] });
    }
    const enriched = await attachApprovalSteps(rows as any[]);
    return res.json({ success: true, data: enriched });
  } catch {
    return res.json({ success: true, data: allowHrMockFallback() ? mockLeaveRequests() : [] });
  }
}

async function createLeaveRequest(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { leaveType, startDate, endDate, reason, attachmentUrl, attachments } = req.body || {};
  if (!leaveType || !startDate || !endDate || !reason) {
    return res.status(400).json({ success: false, error: 'Semua field harus diisi' });
  }

  try {
    if (!sequelize) {
      if (allowHrMockFallback()) {
        return res.json({ success: true, message: 'Pengajuan cuti berhasil (mock)', data: { leaveType, startDate, endDate, status: 'pending' } });
      }
      return res.status(503).json({ success: false, error: 'Database tidak tersedia' });
    }

    const emp = await ensurePortalEmployee(sequelize, userId, tenantId);
    if (!emp?.id) {
      return res.status(400).json({
        success: false,
        error: 'Profil karyawan belum tersedia. Hubungkan akun Anda dengan data karyawan di HRIS terlebih dahulu.',
      });
    }

    let resolvedAttachment = typeof attachmentUrl === 'string' && attachmentUrl.trim() ? attachmentUrl.trim() : null;
    if (!resolvedAttachment && Array.isArray(attachments) && attachments.length > 0) {
      const first = attachments[0];
      resolvedAttachment = first?.data || first?.url || first?.name || null;
      if (attachments.length > 1 && !resolvedAttachment?.startsWith('data:')) {
        resolvedAttachment = JSON.stringify(attachments.map((a: any) => ({ name: a.name, type: a.type })));
      }
    }

    const needsAttachment = ['sick', 'sakit', 'medical'].includes(String(leaveType).toLowerCase());
    if (needsAttachment && !resolvedAttachment) {
      return res.status(400).json({
        success: false,
        error: 'Cuti sakit memerlukan lampiran (surat dokter / bukti).',
      });
    }

    const result = await createPortalLeaveRequest({
      employeeId: emp.id,
      leaveType,
      startDate,
      endDate,
      reason,
      tenantId: tenantId || emp.tenantId,
      attachmentUrl: resolvedAttachment,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    if (!result.autoApproved) {
      try {
        const { withDbSavepoint } = await import('@/lib/saas/tenant-request-bound');
        await withDbSavepoint(sequelize, async () => {
          await notifyManagersForEmployee(sequelize, emp.id, {
            tenantId: tenantId || emp.tenantId,
            title: 'Pengajuan Cuti Baru',
            message: `Ada pengajuan cuti ${leaveType} (${startDate} – ${endDate}) yang menunggu persetujuan Anda.`,
            type: 'approval',
            sourceType: 'leave_request',
            sourceId: result.data?.id ? String(result.data.id) : null,
          });
        }, 'leave_notify');
      } catch (notifyErr) {
        console.warn('leave notify skipped:', (notifyErr as any)?.message || notifyErr);
      }
    }

    return res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (e: any) {
    console.warn('createLeaveRequest error:', e?.message || e);
    return res.status(500).json({ success: false, error: 'Gagal mengajukan cuti', details: e?.message });
  }
}

// ─── Claims ───
async function getClaims(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) {
    return res.json({ success: true, data: allowHrMockFallback() ? mockClaims() : [] });
  }
  try {
    await ensurePortalSchema(sequelize);
    const [rows] = await sequelize.query(`
      SELECT c.*, c.rejection_reason, c.rejected_by_name, c.rejected_at, c.resubmit_count,
             COALESCE(c.attachments_count, 0) as attachments_count
      FROM employee_claims c
      LEFT JOIN employees e ON c.employee_id = e.id
      WHERE (e.user_id = :userId OR e.email = (SELECT email FROM users WHERE id = :userId))
      ${tenantId ? 'AND e.tenant_id = :tenantId AND c.tenant_id = :tenantId' : 'AND 1=0'}
      ORDER BY c.created_at DESC LIMIT 20
    `, { replacements: { userId, tenantId } });
    if (!rows || rows.length === 0) {
      return res.json({ success: true, data: allowHrMockFallback() ? mockClaims() : [] });
    }
    return res.json({ success: true, data: rows });
  } catch {
    return res.json({ success: true, data: allowHrMockFallback() ? mockClaims() : [] });
  }
}

async function createClaim(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { claimType, amount, description, receiptDate, attachments } = req.body || {};
  if (!claimType || !amount || !description) {
    return res.status(400).json({ success: false, error: 'Semua field harus diisi' });
  }
  if (!sequelize) {
    if (allowHrMockFallback()) {
      return res.json({ success: true, data: { id: 'cl-new', claim_type: claimType, amount, description, status: 'pending' } });
    }
    return res.status(503).json({ success: false, error: 'Database tidak tersedia' });
  }
  try {
    await ensurePortalSchema(sequelize);
    const emp = await ensurePortalEmployee(sequelize, userId, tenantId);
    if (!emp?.id) {
      return res.status(400).json({ success: false, error: 'Profil karyawan belum tersedia' });
    }
    const now = new Date().toISOString();
    const { persistPortalClaimAttachments, serializeClaimReceipts } = await import('@/lib/hris/claim-receipt');
    const savedFiles = await persistPortalClaimAttachments(attachments, tenantId || emp.tenantId || '');
    const attachmentsCount = savedFiles.length;
    const receiptUrl = attachmentsCount > 0 ? serializeClaimReceipts(savedFiles) : null;
    await sequelize.query(`
      INSERT INTO employee_claims (
        id, employee_id, claim_type, amount, description, receipt_date, claim_date,
        status, tenant_id, receipt_url, attachments_count, created_at, updated_at
      ) VALUES (
        uuid_generate_v4(), :employeeId, :claimType, :amount, :description, :receiptDate, :receiptDate,
        'pending', :tenantId, :receiptUrl, :attachmentsCount, :now, :now
      )
    `, {
      replacements: {
        employeeId: emp.id,
        claimType,
        amount: parseFloat(amount),
        description,
        receiptDate: receiptDate || now.slice(0, 10),
        tenantId: tenantId || emp.tenantId,
        receiptUrl,
        attachmentsCount,
        now,
      },
    });

    await notifyManagersForEmployee(sequelize, emp.id, {
      tenantId: tenantId || emp.tenantId,
      title: 'Klaim Baru Menunggu Persetujuan',
      message: `Klaim ${claimType} sebesar Rp ${parseFloat(amount).toLocaleString('id-ID')} menunggu persetujuan Anda.`,
      type: 'approval',
      sourceType: 'employee_claim',
    });

    return res.json({ success: true, message: 'Klaim berhasil dikirim' });
  } catch (e: any) {
    console.warn('createClaim error:', e?.message || e);
    return res.status(500).json({ success: false, error: 'Gagal mengirim klaim', details: e?.message });
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
    if (!tenantId) return res.status(403).json({ success: false, error: 'Tenant context required' });
    const [owned] = await sequelize.query(`
      SELECT c.id FROM employee_claims c
      LEFT JOIN employees e ON c.employee_id = e.id
      WHERE c.id = :claimId AND c.status = 'rejected' AND c.tenant_id = :tenantId
        AND e.tenant_id = :tenantId
        AND (e.user_id = :userId OR e.email = (SELECT email FROM users WHERE id = :userId))
      LIMIT 1
    `, { replacements: { claimId, userId, tenantId } });
    if (!owned || (owned as any[]).length === 0) {
      return res.status(404).json({ success: false, error: 'Klaim tidak ditemukan atau tidak bisa diajukan ulang' });
    }
    const attachmentsCount = Array.isArray(attachments) ? attachments.length : null;
    const { persistPortalClaimAttachments, serializeClaimReceipts } = await import('@/lib/hris/claim-receipt');
    const savedFiles = attachmentsCount
      ? await persistPortalClaimAttachments(attachments, tenantId)
      : [];
    const receiptUrl = savedFiles.length ? serializeClaimReceipts(savedFiles) : null;
    const finalAttachmentsCount = savedFiles.length || attachmentsCount;
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
      WHERE id = :claimId AND tenant_id = :tenantId
    `, { replacements: { claimId, tenantId, amount: amount ? parseFloat(amount) : null, description: description || null, receiptDate: receiptDate || null, receiptUrl, attachmentsCount: finalAttachmentsCount } });
    return res.json({ success: true, message: 'Klaim berhasil diajukan ulang dan sedang menunggu persetujuan' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Gagal mengajukan ulang klaim', details: e.message });
  }
}

/** Replace receipt attachments on own pending claim (legacy filename-only → private storage). */
async function replaceClaimReceipt(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { claimId, attachments } = req.body || {};
  if (!claimId) return res.status(400).json({ success: false, error: 'claimId wajib diisi' });
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return res.status(400).json({ success: false, error: 'Lampirkan minimal 1 bukti (PDF/JPG/PNG)' });
  }
  if (!sequelize) {
    if (allowHrMockFallback()) {
      return res.json({ success: true, message: 'Bukti klaim diperbarui (mock)' });
    }
    return res.status(503).json({ success: false, error: 'Database tidak tersedia' });
  }
  try {
    if (!tenantId) return res.status(403).json({ success: false, error: 'Tenant context required' });
    await ensurePortalSchema(sequelize);
    const [owned] = await sequelize.query(`
      SELECT c.id, c.receipt_url FROM employee_claims c
      LEFT JOIN employees e ON c.employee_id = e.id
      WHERE c.id = :claimId AND c.status = 'pending' AND c.tenant_id = :tenantId
        AND e.tenant_id = :tenantId
        AND (e.user_id = :userId OR e.email = (SELECT email FROM users WHERE id = :userId))
      LIMIT 1
    `, { replacements: { claimId, userId, tenantId } });
    if (!owned || (owned as any[]).length === 0) {
      return res.status(404).json({ success: false, error: 'Klaim pending tidak ditemukan' });
    }
    const { persistPortalClaimAttachments, serializeClaimReceipts } = await import('@/lib/hris/claim-receipt');
    const savedFiles = await persistPortalClaimAttachments(attachments, tenantId);
    if (!savedFiles.length) {
      return res.status(400).json({ success: false, error: 'Gagal menyimpan bukti' });
    }
    const receiptUrl = serializeClaimReceipts(savedFiles);
    await sequelize.query(`
      UPDATE employee_claims
      SET receipt_url = :receiptUrl,
          attachments_count = :attachmentsCount,
          updated_at = NOW()
      WHERE id = :claimId AND tenant_id = :tenantId AND status = 'pending'
    `, {
      replacements: {
        claimId,
        tenantId,
        receiptUrl,
        attachmentsCount: savedFiles.length,
      },
    });
    return res.json({
      success: true,
      message: 'Bukti klaim berhasil diunggah ulang — sekarang bisa di-preview HR/manajer',
      data: { attachments_count: savedFiles.length },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Gagal mengganti bukti klaim', details: e?.message });
  }
}

// ─── Travel ───
async function getTravel(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) {
    return res.json({ success: true, data: allowHrMockFallback() ? mockTravel() : [] });
  }
  try {
    const [rows] = await sequelize.query(`
      SELECT tr.* FROM travel_requests tr
      LEFT JOIN employees e ON tr.employee_id = e.id
      WHERE (e.user_id = :userId OR e.email = (SELECT email FROM users WHERE id = :userId))
      ${tenantId ? 'AND e.tenant_id = :tenantId AND tr.tenant_id = :tenantId' : 'AND 1=0'}
      ORDER BY tr.created_at DESC LIMIT 20
    `, { replacements: { userId, tenantId } });
    if (!rows || rows.length === 0) {
      return res.json({ success: true, data: allowHrMockFallback() ? mockTravel() : [] });
    }
    return res.json({ success: true, data: rows });
  } catch {
    return res.json({ success: true, data: allowHrMockFallback() ? mockTravel() : [] });
  }
}

async function createTravelRequest(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const {
    destination,
    departureCity,
    purpose,
    departureDate,
    returnDate,
    transportation,
    estimatedBudget,
    // aliases
    startDate,
    endDate,
    estimatedCost,
  } = req.body || {};

  const depDate = departureDate || startDate;
  const retDate = returnDate || endDate;
  const budget = estimatedBudget ?? estimatedCost;

  if (!destination || !purpose || !depDate || !retDate) {
    return res.status(400).json({ success: false, error: 'Semua field harus diisi' });
  }
  if (!sequelize) {
    if (allowHrMockFallback()) {
      return res.json({ success: true, data: { destination, purpose, status: 'pending' } });
    }
    return res.status(503).json({ success: false, error: 'Database tidak tersedia' });
  }
  try {
    await ensurePortalSchema(sequelize);
    const emp = await ensurePortalEmployee(sequelize, userId, tenantId);
    if (!emp?.id) {
      return res.status(400).json({ success: false, error: 'Profil karyawan belum tersedia' });
    }
    const now = new Date().toISOString();
    const reqNum = `TRV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    await sequelize.query(`
      INSERT INTO travel_requests (
        id, employee_id, request_number, destination, departure_city, purpose,
        departure_date, return_date, start_date, end_date,
        transportation, estimated_budget, status, tenant_id, created_at, updated_at
      ) VALUES (
        uuid_generate_v4(), :employeeId, :reqNum, :destination, :departureCity, :purpose,
        :depDate, :retDate, :depDate, :retDate,
        :transportation, :budget, 'pending', :tenantId, :now, :now
      )
    `, {
      replacements: {
        employeeId: emp.id,
        reqNum,
        destination,
        departureCity: departureCity || 'Jakarta',
        purpose,
        depDate,
        retDate,
        transportation: transportation || 'flight',
        budget: parseFloat(budget) || 0,
        tenantId: tenantId || emp.tenantId,
        now,
      },
    });
    return res.json({ success: true, message: 'Pengajuan perjalanan berhasil dikirim' });
  } catch (e: any) {
    console.warn('createTravelRequest error:', e?.message || e);
    return res.status(500).json({ success: false, error: 'Gagal mengajukan perjalanan', details: e?.message });
  }
}

// ─── Notifications ───
async function getNotifications(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) {
    return res.json({ success: true, data: allowHrMockFallback() ? mockNotifications() : [] });
  }
  if (!tenantId) return res.json({ success: true, data: [] });
  try {
    const [rows] = await sequelize.query(`
      SELECT id, title, message, type, read_at, created_at, source_type, source_id
      FROM employee_notifications
      WHERE tenant_id = :tenantId
        AND (
          user_id = :userId
          OR employee_id IN (
            SELECT id FROM employees
            WHERE tenant_id = :tenantId
              AND (user_id = :userId OR email = (SELECT email FROM users WHERE id = :userId))
          )
        )
      ORDER BY created_at DESC LIMIT 30
    `, { replacements: { userId, tenantId } });
    return res.json({
      success: true,
      data: (rows as any[] || []).map(normalizeNotification),
    });
  } catch {
    return res.json({ success: true, data: allowHrMockFallback() ? mockNotifications() : [] });
  }
}

async function markNotificationRead(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (!sequelize) return res.json({ success: true });
  if (!tenantId) return res.status(403).json({ success: false, error: 'Tenant context required' });
  try {
    await sequelize.query(`
      UPDATE employee_notifications SET read_at = NOW()
      WHERE id = :id
        AND tenant_id = :tenantId
        AND (user_id = :userId OR employee_id IN (
          SELECT id FROM employees WHERE user_id = :userId AND tenant_id = :tenantId
        ))
    `, { replacements: { id, userId, tenantId } });
    return res.json({ success: true });
  } catch {
    return res.json({ success: true });
  }
}

async function markAllNotificationsRead(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true });
  if (!tenantId) return res.status(403).json({ success: false, error: 'Tenant context required' });
  try {
    await sequelize.query(`
      UPDATE employee_notifications SET read_at = NOW()
      WHERE read_at IS NULL
        AND tenant_id = :tenantId
        AND (user_id = :userId OR employee_id IN (
          SELECT id FROM employees WHERE user_id = :userId AND tenant_id = :tenantId
        ))
    `, { replacements: { userId, tenantId } });
    return res.json({ success: true });
  } catch {
    return res.json({ success: true });
  }
}

// ─── Company Announcements ───
async function getAnnouncements(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) {
    return res.json({ success: true, data: allowHrMockFallback() ? mockAnnouncements() : [] });
  }
  // Never show other tenants' or orphan (NULL tenant) announcements to a customer tenant
  if (!tenantId) return res.json({ success: true, data: [] });
  try {
    const ctx = await resolveEmployeeContext(sequelize, userId, tenantId);
    const [rows] = await sequelize.query(`
      SELECT id, title, content, category, priority, is_pinned, status, target_audience,
        target_department, target_branch, published_at, expires_at, view_count, created_at
      FROM hris_announcements
      WHERE is_active = true
        AND tenant_id = :tid
        AND (status = 'published' OR status IS NULL)
        AND (published_at IS NULL OR published_at <= NOW())
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (
          target_audience = 'all' OR target_audience IS NULL
          OR (target_audience = 'department' AND (:dept IS NOT NULL AND target_department = :dept))
          OR (target_audience = 'branch' AND (:branchId IS NOT NULL AND target_branch::text = :branchId::text))
        )
      ORDER BY is_pinned DESC, published_at DESC NULLS LAST, created_at DESC
      LIMIT 15
    `, { replacements: { tid: tenantId, dept: ctx.department, branchId: ctx.branchId } });
    return res.json({
      success: true,
      data: (rows as any[] || []).map(normalizeAnnouncement),
    });
  } catch {
    return res.json({ success: true, data: allowHrMockFallback() ? mockAnnouncements() : [] });
  }
}

// ─── Payslip (self-service) ───
function mapPayslipRow(row: any) {
  let comps = row.components;
  if (typeof comps === 'string') { try { comps = JSON.parse(comps); } catch { comps = {}; } }
  const earnings = row.earnings
    ? (typeof row.earnings === 'string' ? JSON.parse(row.earnings) : row.earnings)
    : (comps?.earnings || []);
  const deductions = row.deductions
    ? (typeof row.deductions === 'string' ? JSON.parse(row.deductions) : row.deductions)
    : (comps?.deductions || []);
  return {
    ...row,
    earnings,
    deductions,
    total_earnings: Number(row.total_earnings ?? row.gross_salary ?? 0),
    total_deductions: Number(row.total_deductions ?? 0),
    tax_amount: Number(row.tax_amount ?? 0),
    net_salary: Number(row.net_salary ?? 0),
    base_salary: Number(row.base_salary ?? 0),
  };
}

async function getPayslip(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: allowHrMockFallback() ? mockPayslips() : [] });
  try {
    const ctx = await resolveEmployeeContext(sequelize, userId, tenantId);
    if (!ctx.employeeId) return res.json({ success: true, data: allowHrMockFallback() ? mockPayslips() : [] });

    const { month } = req.query;
    let where = 'WHERE pi.employee_id = :empId';
    const replacements: any = { empId: ctx.employeeId, tenantId };
    if (tenantId) {
      where += ' AND (pr.tenant_id = :tenantId OR e.tenant_id = :tenantId)';
    } else {
      where += ' AND 1=0';
    }
    if (month) {
      where += ' AND to_char(pr.period_start, \'YYYY-MM\') = :month';
      replacements.month = month;
    }

    const [rows] = await sequelize.query(`
      SELECT pi.*, e.name as employee_name, e.position as employee_position, e.department,
             pr.run_code, pr.period_start, pr.period_end, pr.pay_date, pr.status as run_status
      FROM payroll_items pi
      JOIN payroll_runs pr ON pi.payroll_run_id = pr.id
      LEFT JOIN employees e ON pi.employee_id = e.id
      ${where}
      ORDER BY pr.period_start DESC
      LIMIT 12
    `, { replacements });

    if (rows?.length) return res.json({ success: true, data: (rows as any[]).map(mapPayslipRow) });
  } catch { /* fall through */ }
  return res.json({ success: true, data: allowHrMockFallback() ? mockPayslips() : [] });
}

// ─── Disciplinary letters (employee view) ───
async function getDisciplinaryLetters(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: allowHrMockFallback() ? mockDisciplinaryLetters() : [] });
  try {
    const ctx = await resolveEmployeeContext(sequelize, userId, tenantId);
    if (!ctx.employeeId) return res.json({ success: true, data: allowHrMockFallback() ? mockDisciplinaryLetters() : [] });

    const [rows] = await sequelize.query(`
      SELECT dl.id, dl.letter_type, dl.letter_number, dl.status, dl.violation_type,
        dl.violation_description, dl.incident_date, dl.effective_date, dl.expiry_date,
        dl.acknowledged, dl.acknowledged_at, dl.issued_at, dl.created_at
      FROM hr_disciplinary_letters dl
      WHERE dl.employee_id::text = :empId
        ${tenantId ? 'AND dl.tenant_id = :tenantId' : 'AND 1=0'}
        AND dl.status IN ('issued', 'acknowledged', 'pending_approval')
      ORDER BY dl.issued_at DESC NULLS LAST, dl.created_at DESC
      LIMIT 20
    `, { replacements: { empId: String(ctx.employeeId), tenantId } });

    if (rows?.length) return res.json({ success: true, data: rows });
  } catch { /* fall through */ }
  return res.json({ success: true, data: allowHrMockFallback() ? mockDisciplinaryLetters() : [] });
}

async function acknowledgeDisciplinary(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (!tenantId) return res.status(403).json({ success: false, error: 'Tenant context required' });
  if (!sequelize) return res.status(503).json({ success: false, error: 'Database tidak tersedia' });

  try {
    const ctx = await resolveEmployeeContext(sequelize, userId, tenantId);
    if (!ctx.employeeId) return res.status(404).json({ success: false, error: 'Profil karyawan tidak ditemukan' });
    const [upd] = await sequelize.query(`
      UPDATE hr_disciplinary_letters SET status = 'acknowledged', acknowledged = true,
        acknowledged_at = NOW(), current_phase = 'acknowledgment', updated_at = NOW()
      WHERE id = :id AND employee_id::text = :empId AND tenant_id = :tenantId AND status = 'issued'
      RETURNING id
    `, { replacements: { id, empId: String(ctx.employeeId), tenantId } });
    if (!upd?.[0]) return res.status(404).json({ success: false, error: 'Surat peringatan tidak ditemukan' });
    return res.json({ success: true, message: 'Anda telah mengakui penerimaan surat peringatan' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ─── Summary ───
async function getSummary(res: NextApiResponse, userId: string, tenantId: string) {
  const empty = { pendingLeave: 0, pendingClaims: 0, pendingTravel: 0 };
  if (!sequelize) return res.json({ success: true, data: allowHrMockFallback() ? mockSummary() : empty });
  if (!tenantId) return res.json({ success: true, data: empty });
  try {
    const [pendingLeave] = await sequelize.query(`
      SELECT COUNT(*)::int as count FROM leave_requests lr
      LEFT JOIN employees e ON lr.employee_id = e.id
      WHERE (e.user_id = :userId OR e.email = (SELECT email FROM users WHERE id = :userId))
      AND e.tenant_id = :tenantId AND lr.status = 'pending'
    `, { replacements: { userId, tenantId } });
    const [pendingClaims] = await sequelize.query(`
      SELECT COUNT(*)::int as count FROM employee_claims c
      LEFT JOIN employees e ON c.employee_id = e.id
      WHERE (e.user_id = :userId OR e.email = (SELECT email FROM users WHERE id = :userId))
      AND c.tenant_id = :tenantId AND c.status = 'pending'
    `, { replacements: { userId, tenantId } });
    const [pendingTravel] = await sequelize.query(`
      SELECT COUNT(*)::int as count FROM travel_requests tr
      LEFT JOIN employees e ON tr.employee_id = e.id
      WHERE (e.user_id = :userId OR e.email = (SELECT email FROM users WHERE id = :userId))
      AND tr.tenant_id = :tenantId AND tr.status = 'pending'
    `, { replacements: { userId, tenantId } });
    return res.json({
      success: true,
      data: {
        pendingLeave: pendingLeave?.[0]?.count || 0,
        pendingClaims: pendingClaims?.[0]?.count || 0,
        pendingTravel: pendingTravel?.[0]?.count || 0,
      },
    });
  } catch {
    return res.json({ success: true, data: allowHrMockFallback() ? mockSummary() : empty });
  }
}

// ─── Mock Data ───
function mockProfile() {
  return {
    name: 'Budi Santoso', email: 'budi@bedagang.com', phone: '08123456789',
    position: 'Senior Developer', department: 'Engineering', branch_name: 'Cabang Jakarta Pusat',
    employee_code: 'EMP-2024-007', join_date: '2023-06-15', role: 'staff',
    isMfAgent: false, isManagerPortal: false, isSuperAdmin: false,
  };
}

function mockPayslips() {
  const month = new Date().toISOString().slice(0, 7);
  return [{
    id: 'mock-ps1',
    run_code: 'PAY-2026-06',
    period_start: `${month}-01`,
    period_end: `${month}-30`,
    pay_date: `${month}-28`,
    employee_name: 'Budi Santoso',
    employee_position: 'Senior Developer',
    base_salary: 12000000,
    total_earnings: 13500000,
    total_deductions: 1200000,
    tax_amount: 450000,
    net_salary: 11850000,
    earnings: [
      { name: 'Gaji Pokok', amount: 12000000 },
      { name: 'Tunjangan Transport', amount: 1500000 },
    ],
    deductions: [
      { name: 'BPJS Kesehatan', amount: 120000 },
      { name: 'BPJS Ketenagakerjaan', amount: 108000 },
      { name: 'PPh 21', amount: 450000 },
    ],
  }];
}

function mockDisciplinaryLetters() {
  return [];
}
function mockAttendance() {
  const locIn = { lat: -6.2088, lng: 106.8456, address: 'Kantor Pusat Jakarta, Jl. Sudirman', accuracy: 12 };
  const today = new Date().toISOString().split('T')[0];
  const lastIn = {
    type: 'check_in' as const,
    label: 'Clock In',
    time: '08:15',
    date: today,
    location: locIn,
    mapsUrl: 'https://www.google.com/maps?q=-6.2088,106.8456',
  };
  return {
    today: { check_in: '08:15', check_out: null, status: 'present' },
    thisMonth: { present: 18, late: 2, absent: 1, leave: 1 },
    lastCheckIn: lastIn,
    lastCheckOut: null,
    lastClockEvent: lastIn,
  };
}

function mockAnnouncements() {
  return [
    {
      id: 'ann1',
      title: 'Kebijakan Kerja Hybrid 2026',
      content: 'Mulai Juli 2026, karyawan HQ dapat WFH maksimal 2 hari per minggu dengan persetujuan atasan langsung.',
      priority: 'high',
      is_pinned: true,
      published_at: new Date(Date.now() - 3600000).toISOString(),
      time: '1 jam lalu',
    },
    {
      id: 'ann2',
      title: 'Libur Nasional — Hari Raya',
      content: 'Kantor tutup pada tanggal merah sesuai kalender resmi. Pastikan handover tugas sebelum libur.',
      priority: 'normal',
      is_pinned: true,
      published_at: new Date(Date.now() - 86400000).toISOString(),
      time: '1 hari lalu',
    },
    {
      id: 'ann3',
      title: 'Program Kesehatan Karyawan',
      content: 'Medical check-up gratis untuk seluruh karyawan. Daftar melalui HRIS → Benefits sebelum 30 Juli.',
      priority: 'normal',
      is_pinned: false,
      published_at: new Date(Date.now() - 172800000).toISOString(),
      time: '2 hari lalu',
    },
  ];
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
