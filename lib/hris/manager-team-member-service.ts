/**
 * Manager team member detail — KPI & attendance for subordinates.
 */

import { resolveManagerContext, buildTeamEmployeeFilter } from './manager-team-filter';
import { ATTENDANCE_TABLE, mapCanonicalToPortal } from './attendance-store';

export type TeamMemberKpi = {
  overallScore: number;
  period: string;
  metrics: Array<{
    name: string;
    target: number;
    actual: number;
    unit: string;
    weight: number;
    achievement: number;
    trend: 'up' | 'down' | 'stable';
  }>;
};

export type TeamMemberAttendance = {
  month: string;
  summary: { present: number; late: number; absent: number; leave: number; wfh: number; total: number };
  attendanceRate: number;
  totalWorkHours: number;
  workDaysInMonth: number;
  records: Array<{
    date: string;
    check_in: string | null;
    check_out: string | null;
    status: string;
    work_hours: number | null;
    late_minutes: number;
  }>;
  today: {
    date: string;
    check_in: string | null;
    check_out: string | null;
    status: string;
  } | null;
};

/** Verify employee is in manager's team scope */
export async function verifyEmployeeInTeam(
  sequelize: any,
  managerUserId: string,
  employeeId: string,
  isSuperAdmin: boolean,
): Promise<boolean> {
  if (!sequelize || !employeeId) return false;
  if (isSuperAdmin) {
    const [rows] = await sequelize.query(
      `SELECT id FROM employees WHERE id::text = :employeeId LIMIT 1`,
      { replacements: { employeeId: String(employeeId) } },
    );
    return !!(rows as any[])?.length;
  }

  const ctx = await resolveManagerContext(sequelize, managerUserId);
  const tf = buildTeamEmployeeFilter(isSuperAdmin, ctx, managerUserId);

  const [rows] = await sequelize.query(`
    SELECT e.id FROM employees e
    WHERE e.id::text = :employeeId
      AND (e.is_active = true OR e.status = 'active' OR e.status IS NULL)
      ${tf.sql}
    LIMIT 1
  `, { replacements: { employeeId: String(employeeId), ...tf.replacements } });

  return !!(rows as any[])?.length;
}

export async function getEmployeeBasicInfo(sequelize: any, employeeId: string) {
  const [rows] = await sequelize.query(`
    SELECT e.id, e.name, e.employee_code, e.position, e.department, e.email, e.hire_date,
      b.name AS branch_name
    FROM employees e
    LEFT JOIN branches b ON e.branch_id = b.id
    WHERE e.id::text = :employeeId LIMIT 1
  `, { replacements: { employeeId: String(employeeId) } });
  return (rows as any[])?.[0] || null;
}

function calcAchievement(target: number, actual: number): number {
  if (!target || target <= 0) return 0;
  return Math.round((actual / target) * 100);
}

export async function getTeamMemberKpi(
  sequelize: any,
  employeeId: string,
  period?: string,
): Promise<TeamMemberKpi> {
  const targetPeriod = period || new Date().toISOString().substring(0, 7);

  if (!sequelize) {
    return {
      overallScore: 87,
      period: targetPeriod,
      metrics: [
        { name: 'Penjualan', target: 100, actual: 92, unit: '%', weight: 25, achievement: 92, trend: 'up' },
        { name: 'Kehadiran', target: 95, actual: 91, unit: '%', weight: 25, achievement: 96, trend: 'down' },
      ],
    };
  }

  try {
    const [rows] = await sequelize.query(`
      SELECT ek.metric_name, ek.category, ek.target, ek.actual, ek.unit, ek.weight
      FROM employee_kpis ek
      WHERE ek.employee_id::text = :employeeId AND ek.period = :period
      ORDER BY ek.category, ek.metric_name
    `, { replacements: { employeeId: String(employeeId), period: targetPeriod } });

    const kpiRows = rows as any[];
    if (!kpiRows?.length) {
      return { overallScore: 0, period: targetPeriod, metrics: [] };
    }

    const metrics = kpiRows.map((r) => {
      const target = Number(r.target) || 0;
      const actual = Number(r.actual) || 0;
      const achievement = calcAchievement(target, actual);
      return {
        name: r.metric_name || r.category || 'KPI',
        target,
        actual,
        unit: r.unit || '%',
        weight: Number(r.weight) || 25,
        achievement,
        trend: 'stable' as const,
      };
    });

    const weighted = metrics.reduce((s, m) => s + m.achievement * (m.weight / 100), 0);
    const totalWeight = metrics.reduce((s, m) => s + m.weight, 0);
    const overallScore = totalWeight > 0
      ? Math.round(weighted / (totalWeight / 100))
      : Math.round(metrics.reduce((s, m) => s + m.achievement, 0) / metrics.length);

    return { overallScore, period: targetPeriod, metrics };
  } catch (err: any) {
    console.warn('getTeamMemberKpi error:', err?.message || err);
    return { overallScore: 0, period: targetPeriod, metrics: [] };
  }
}

export async function getTeamMemberAttendance(
  sequelize: any,
  employeeId: string,
  month?: string,
): Promise<TeamMemberAttendance> {
  const targetMonth = month || new Date().toISOString().slice(0, 7);
  const monthStart = `${targetMonth}-01`;
  const nextMonth = new Date(`${targetMonth}-01`);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const monthEnd = nextMonth.toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  if (!sequelize) {
    return {
      month: targetMonth,
      summary: { present: 18, late: 2, absent: 1, leave: 1, wfh: 0, total: 22 },
      attendanceRate: 91,
      totalWorkHours: 176,
      workDaysInMonth: 20,
      records: [],
      today: null,
    };
  }

  const [historyRows] = await sequelize.query(`
    SELECT date, clock_in, clock_out, status, notes, work_hours, late_minutes
    FROM ${ATTENDANCE_TABLE}
    WHERE employee_id::text = :employeeId
      AND date >= :monthStart AND date < :monthEnd
    ORDER BY date DESC
    LIMIT 31
  `, { replacements: { employeeId: String(employeeId), monthStart, monthEnd } });

  const records = (historyRows as any[]).map((r) => {
    const mapped = mapCanonicalToPortal(r)!;
    let workHours = mapped.work_hours;
    if (workHours == null && r.clock_in && r.clock_out) {
      const diff = (new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime()) / 3600000;
      workHours = diff > 0 ? Math.round(diff * 100) / 100 : null;
    }
    return {
      date: mapped.date,
      check_in: mapped.check_in,
      check_out: mapped.check_out,
      status: mapped.status,
      work_hours: workHours ?? null,
      late_minutes: mapped.late_minutes || 0,
    };
  });

  const summary = {
    present: records.filter((r) => r.status === 'present').length,
    late: records.filter((r) => r.status === 'late').length,
    absent: records.filter((r) => r.status === 'absent').length,
    leave: records.filter((r) => r.status === 'leave').length,
    wfh: records.filter((r) => ['work_from_home', 'wfh'].includes(r.status)).length,
    total: records.length,
  };

  const totalWorkHours = records.reduce((s, r) => s + (Number(r.work_hours) || 0), 0);
  const workDaysInMonth = records.filter((r) =>
    ['present', 'late', 'work_from_home', 'wfh'].includes(r.status),
  ).length;
  const attendanceRate = summary.total > 0
    ? Math.round(((summary.present + summary.late + summary.wfh) / summary.total) * 100)
    : 0;

  const [todayRows] = await sequelize.query(`
    SELECT date, clock_in, clock_out, status
    FROM ${ATTENDANCE_TABLE}
    WHERE employee_id::text = :employeeId AND date = :today
    LIMIT 1
  `, { replacements: { employeeId: String(employeeId), today } });

  const todayRow = (todayRows as any[])?.[0];
  const todayData = todayRow
    ? {
        date: todayRow.date,
        check_in: todayRow.clock_in || null,
        check_out: todayRow.clock_out || null,
        status: todayRow.status || 'present',
      }
    : null;

  return {
    month: targetMonth,
    summary,
    attendanceRate,
    totalWorkHours: Math.round(totalWorkHours * 10) / 10,
    workDaysInMonth,
    records,
    today: todayData,
  };
}

export async function getTeamMemberDetail(
  sequelize: any,
  managerUserId: string,
  employeeId: string,
  isSuperAdmin: boolean,
  opts?: { period?: string; month?: string },
) {
  const inTeam = await verifyEmployeeInTeam(sequelize, managerUserId, employeeId, isSuperAdmin);
  if (!inTeam) return { error: 'Karyawan tidak ditemukan atau bukan anggota tim Anda', status: 403 };

  const employee = await getEmployeeBasicInfo(sequelize, employeeId);
  if (!employee) return { error: 'Karyawan tidak ditemukan', status: 404 };

  const [kpi, attendance] = await Promise.all([
    getTeamMemberKpi(sequelize, employeeId, opts?.period),
    getTeamMemberAttendance(sequelize, employeeId, opts?.month || opts?.period),
  ]).catch((err) => {
    console.warn('getTeamMemberDetail data error:', err?.message || err);
    throw err;
  });

  return {
    employee: {
      id: employee.id,
      name: employee.name,
      employee_code: employee.employee_code,
      position: employee.position,
      department: employee.department,
      email: employee.email,
      branch_name: employee.branch_name,
      hire_date: employee.hire_date,
    },
    kpi,
    attendance,
  };
}
