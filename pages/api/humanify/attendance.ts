import type { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../lib/api/response';
import { withHQAuth } from '../../../lib/middleware/withHQAuth';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';
import { allowHrMockFallback } from '@/lib/hris/data-source';

let EmployeeAttendance: any;
let sequelize: any;
try {
  const models = require('../../../models');
  EmployeeAttendance = models.EmployeeAttendance;
} catch {
  console.warn('Models not available');
}
try {
  sequelize = require('../../../lib/sequelize');
} catch {}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getAttendance(req, res);
      case 'POST':
        return await recordAttendance(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
          errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
        );
    }
  } catch (error) {
    console.warn('Attendance API Error:', (error as any)?.message || error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'hris' });

type PeriodMode = { mode: 'daily'; date: string } | { mode: 'monthly'; startDate: string; endDate: string };

function parsePeriod(period: string, view?: string): PeriodMode {
  const p = String(period || '').trim();
  if (view === 'daily' || /^\d{4}-\d{2}-\d{2}$/.test(p)) {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(p) ? p : new Date().toISOString().split('T')[0];
    return { mode: 'daily', date };
  }
  if (/^\d{4}-\d{2}$/.test(p)) {
    const [y, m] = p.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return {
      mode: 'monthly',
      startDate: `${p}-01`,
      endDate: `${p}-${String(lastDay).padStart(2, '0')}`,
    };
  }
  const now = new Date();
  const start = new Date(now);
  if (p === 'week') start.setDate(now.getDate() - 7);
  else if (p === 'year') start.setFullYear(now.getFullYear() - 1);
  else start.setMonth(now.getMonth() - 1);
  return {
    mode: 'monthly',
    startDate: start.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
  };
}

function mapDailyRow(r: any) {
  return {
    id: r.id,
    employeeId: r.employee_code || r.employee_id,
    employeeName: r.employee_name || 'Unknown',
    position: r.position || '',
    branchName: r.branch_name || 'HQ',
    clockIn: r.clock_in,
    clockOut: r.clock_out,
    status: r.status || 'present',
    lateMinutes: Number(r.late_minutes) || 0,
    earlyLeaveMinutes: Number(r.early_leave_minutes) || 0,
    overtimeMinutes: Number(r.overtime_minutes) || 0,
    workHours: Number(r.work_hours) || 0,
    source: 'manual',
    isOutsideGeofence: false,
  };
}

function buildBranchSummary(attendance: any[]) {
  const branchStats = new Map<string, any>();
  attendance.forEach((emp) => {
    const key = emp.branchName || 'HQ';
    if (!branchStats.has(key)) {
      branchStats.set(key, {
        branchId: key,
        branchName: key,
        totalEmployees: 0,
        totalAttendance: 0,
        totalPresent: 0,
        totalLate: 0,
        totalAbsent: 0,
      });
    }
    const stats = branchStats.get(key);
    stats.totalEmployees += 1;
    stats.totalAttendance += emp.attendanceRate;
    stats.totalPresent += emp.present;
    stats.totalLate += emp.late;
    stats.totalAbsent += emp.absent;
  });

  return Array.from(branchStats.values()).map((b) => ({
    branchId: b.branchId,
    branchName: b.branchName,
    totalEmployees: b.totalEmployees,
    avgAttendance: b.totalEmployees > 0 ? Math.round((b.totalAttendance / b.totalEmployees) * 10) / 10 : 0,
    onTimeRate: b.totalPresent > 0 ? Math.round(((b.totalPresent - b.totalLate) / b.totalPresent) * 1000) / 10 : 0,
    lateRate: b.totalPresent > 0 ? Math.round((b.totalLate / b.totalPresent) * 1000) / 10 : 0,
    absentRate: b.totalEmployees > 0
      ? Math.round((b.totalAbsent / Math.max(b.totalPresent + b.totalAbsent, 1)) * 1000) / 10
      : 0,
  }));
}

/** Prefer ea.tenant_id; fall back to employee ownership for legacy rows. */
function tenantAttendanceFilter(alias = 'ea'): string {
  return `(
    ${alias}.tenant_id = :tenantId
    OR ${alias}.employee_id IN (SELECT id FROM employees WHERE tenant_id = :tenantId)
  )`;
}

async function queryDailyRecords(
  tenantId: string,
  date: string,
  branchId?: string,
  employeeId?: string
) {
  if (!sequelize) return [];
  let extra = '';
  const replacements: Record<string, string> = { date, tenantId };
  if (branchId) {
    extra += ' AND ea.branch_id::text = :branchId';
    replacements.branchId = branchId;
  }
  if (employeeId) {
    extra += ' AND ea.employee_id::text = :employeeId';
    replacements.employeeId = employeeId;
  }
  const rows = await (await import('@/lib/saas/tenant-request-bound')).safeQueryWithSavepoint(
    sequelize,
    `SELECT ea.id, ea.employee_id, ea.branch_id, ea.date, ea.clock_in, ea.clock_out, ea.status,
           ea.late_minutes, ea.early_leave_minutes, ea.overtime_minutes, ea.work_hours,
           e.name as employee_name, e.employee_code, e.position, e.department,
           COALESCE(b.name, 'HQ') as branch_name
    FROM employee_attendance ea
    INNER JOIN employees e ON ea.employee_id::text = e.id::text AND e.tenant_id = :tenantId
    LEFT JOIN branches b ON ea.branch_id::text = b.id::text
    WHERE ea.date = :date ${extra}
    ORDER BY ea.clock_in DESC NULLS LAST`,
    replacements,
    'att_daily',
  );
  return rows.map(mapDailyRow);
}

async function queryMonthlyAttendance(
  tenantId: string,
  startDate: string,
  endDate: string,
  branchId?: string,
  employeeId?: string
) {
  if (!sequelize) return [];
  let extra = '';
  const replacements: Record<string, string> = { startDate, endDate, tenantId };
  if (branchId) {
    extra += ' AND ea.branch_id::text = :branchId';
    replacements.branchId = branchId;
  }
  if (employeeId) {
    extra += ' AND ea.employee_id::text = :employeeId';
    replacements.employeeId = employeeId;
  }
  const [rows] = await sequelize.query(`
    SELECT ea.employee_id,
           e.name as employee_name,
           e.employee_code,
           e.position,
           COALESCE(b.name, 'HQ') as branch_name,
           COUNT(*)::int as total_days,
           COUNT(*) FILTER (WHERE ea.status IN ('present', 'late', 'work_from_home'))::int as present,
           COUNT(*) FILTER (WHERE ea.status = 'late')::int as late,
           COUNT(*) FILTER (WHERE ea.status = 'absent')::int as absent,
           COUNT(*) FILTER (WHERE ea.status IN ('leave', 'sick'))::int as leave,
           COUNT(*) FILTER (WHERE ea.status = 'work_from_home')::int as work_from_home
    FROM employee_attendance ea
    INNER JOIN employees e ON ea.employee_id::text = e.id::text AND e.tenant_id = :tenantId
    LEFT JOIN branches b ON ea.branch_id::text = b.id::text
    WHERE ea.date >= :startDate AND ea.date <= :endDate ${extra}
    GROUP BY ea.employee_id, e.name, e.employee_code, e.position, b.name
    ORDER BY e.name ASC
  `, { replacements });

  return rows.map((r: any) => {
    const present = Number(r.present) || 0;
    const totalDays = Number(r.total_days) || 0;
    return {
      employeeId: r.employee_code || r.employee_id,
      employeeName: r.employee_name || 'Unknown',
      branchName: r.branch_name || 'HQ',
      position: r.position || '',
      present,
      late: Number(r.late) || 0,
      absent: Number(r.absent) || 0,
      leave: Number(r.leave) || 0,
      workFromHome: Number(r.work_from_home) || 0,
      totalDays,
      attendanceRate: totalDays > 0 ? Math.round((present / totalDays) * 1000) / 10 : 0,
    };
  });
}

async function getAttendance(req: NextApiRequest, res: NextApiResponse) {
  const { period = 'month', branchId, employeeId, view } = req.query;
  const branch = branchId as string | undefined;
  const employee = employeeId as string | undefined;
  const session = (req as any).session;
  const tenantId = tenantIdFromSession(session);
  const parsed = parsePeriod(String(period), view as string);

  if (!tenantId) {
    return res.status(HttpStatus.OK).json(successResponse(getEmptyAttendancePayload(parsed)));
  }

  try {
    if (!sequelize) {
      return res.status(HttpStatus.OK).json(
        successResponse(getEmptyAttendancePayload(parsed))
      );
    }

    if (parsed.mode === 'daily') {
      const dailyRecords = await queryDailyRecords(tenantId, parsed.date, branch, employee);
      const present = dailyRecords.filter((r) => r.status === 'present').length;
      const late = dailyRecords.filter((r) => r.status === 'late').length;
      const absent = dailyRecords.filter((r) => r.status === 'absent').length;
      const leave = dailyRecords.filter((r) => ['leave', 'sick'].includes(r.status)).length;

      return res.status(HttpStatus.OK).json(
        successResponse({
          dailyRecords,
          date: parsed.date,
          summary: {
            total: dailyRecords.length,
            present,
            late,
            absent,
            leave,
            clockedIn: dailyRecords.filter((r) => r.clockIn && !r.clockOut).length,
          },
        })
      );
    }

    const attendance = await queryMonthlyAttendance(
      tenantId,
      parsed.startDate,
      parsed.endDate,
      branch,
      employee
    );
    const branchSummary = buildBranchSummary(attendance);

    const [trendRows] = await sequelize.query(`
      SELECT ea.date,
             COUNT(*) FILTER (WHERE ea.status IN ('present', 'work_from_home'))::int as present,
             COUNT(*) FILTER (WHERE ea.status = 'late')::int as late,
             COUNT(*) FILTER (WHERE ea.status = 'absent')::int as absent
      FROM employee_attendance ea
      WHERE ea.date >= :startDate AND ea.date <= :endDate
        AND ${tenantAttendanceFilter('ea')}
      GROUP BY ea.date
      ORDER BY ea.date ASC
    `, { replacements: { startDate: parsed.startDate, endDate: parsed.endDate, tenantId } });

    const dailyTrend = (trendRows as any[]).map((d) => ({
      date: d.date,
      present: Number(d.present) || 0,
      late: Number(d.late) || 0,
      absent: Number(d.absent) || 0,
    }));

    return res.status(HttpStatus.OK).json(
      successResponse({
        attendance,
        branchSummary,
        dailyTrend,
        period: { startDate: parsed.startDate, endDate: parsed.endDate },
        summary: {
          totalEmployees: attendance.length,
          avgAttendance: attendance.length > 0
            ? Math.round(attendance.reduce((sum, a) => sum + a.attendanceRate, 0) / attendance.length * 10) / 10
            : 0,
          perfectAttendance: attendance.filter((a) => a.attendanceRate === 100).length,
          lowAttendance: attendance.filter((a) => a.attendanceRate < 80).length,
        },
      })
    );
  } catch (error) {
    console.warn('Error fetching attendance:', (error as any)?.message || error);
    return res.status(HttpStatus.OK).json(
      successResponse(getEmptyAttendancePayload(parsed))
    );
  }
}

function getEmptyAttendancePayload(parsed: PeriodMode) {
  if (parsed.mode === 'daily') {
    return {
      dailyRecords: [],
      date: parsed.date,
      summary: { total: 0, present: 0, late: 0, absent: 0, leave: 0, clockedIn: 0 },
    };
  }
  return {
    attendance: [],
    branchSummary: [],
    dailyTrend: [],
    period: { startDate: parsed.startDate, endDate: parsed.endDate },
    summary: { totalEmployees: 0, avgAttendance: 0, perfectAttendance: 0, lowAttendance: 0 },
  };
}

async function recordAttendance(req: NextApiRequest, res: NextApiResponse) {
  const { employeeId, branchId, date, clockIn, clockOut, status, notes } = req.body;
  const tenantId = tenantIdFromSession((req as any).session);

  if (!employeeId || !date) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'employeeId and date are required')
    );
  }

  if (!tenantId) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Tenant context required')
    );
  }

  try {
    if (!EmployeeAttendance) {
      if (allowHrMockFallback()) {
        return res.status(200).json({ success: true, message: 'Attendance recorded (mock mode)' });
      }
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json(
        errorResponse(ErrorCodes.DATABASE_ERROR, 'Attendance model unavailable')
      );
    }

    // Ensure employee belongs to this tenant
    if (sequelize) {
      const [owned] = await sequelize.query(
        `SELECT id FROM employees WHERE id::text = :employeeId AND tenant_id = :tenantId LIMIT 1`,
        { replacements: { employeeId: String(employeeId), tenantId } }
      );
      if (!owned?.length) {
        return res.status(HttpStatus.NOT_FOUND).json(
          errorResponse(ErrorCodes.NOT_FOUND, 'Employee not found for this tenant')
        );
      }
    }

    const [record, created] = await EmployeeAttendance.findOrCreate({
      where: { employeeId, date },
      defaults: {
        employeeId,
        branchId,
        date,
        clockIn,
        clockOut,
        status: status || 'present',
        notes,
        tenantId,
      },
    });

    if (!created) {
      await record.update({ clockIn, clockOut, status, notes });
    }

    return res.status(HttpStatus.OK).json(
      successResponse(
        record,
        undefined,
        created ? 'Attendance recorded' : 'Attendance updated'
      )
    );
  } catch (error) {
    console.warn('Error recording attendance:', (error as any)?.message || error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to record attendance')
    );
  }
}
