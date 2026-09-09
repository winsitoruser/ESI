/**
 * Unified attendance data layer — canonical table: employee_attendance
 * Maps portal field names (check_in/check_out) for backward compatibility.
 */

import { resolveEmployeeContext } from '@/lib/employee-portal';
import { withAutocommitQuery } from '@/lib/saas/tenant-request-bound';
import { evaluateClockIn, evaluateClockOut, businessDateInTimeZone } from '@/lib/hris/work-time-policy';
import { loadWorkTimePolicy, resolveShiftWindow } from '@/lib/hris/work-time-policy-store';

export const ATTENDANCE_TABLE = 'employee_attendance';

let attendancePhotoColsReady = false;

export type PortalAttendanceRow = {
  date: string;
  check_in: string | null;
  check_out: string | null;
  check_in_at?: string | null;
  check_out_at?: string | null;
  status: string;
  check_in_location?: unknown;
  check_out_location?: unknown;
  check_in_photo?: string | null;
  check_out_photo?: string | null;
  geofence_id?: string | null;
  notes?: string | null;
  work_hours?: number | null;
  late_minutes?: number;
  attendance_date?: string;
};

/** Fail-closed: never resolve employees when tenant context is missing. */
function employeeIdSubquery() {
  return `SELECT id FROM employees
    WHERE :tenantId::uuid IS NOT NULL
      AND tenant_id = :tenantId::uuid
      AND (user_id = :userId OR email = (SELECT email FROM users WHERE id = :userId))`;
}

export function mapCanonicalToPortal(row: any): PortalAttendanceRow | null {
  if (!row) return null;
  return {
    date: row.date,
    attendance_date: row.date,
    check_in: row.clock_in || row.check_in || null,
    check_out: row.clock_out || row.check_out || null,
    check_in_at: row.clock_in || row.check_in_at || null,
    check_out_at: row.clock_out || row.check_out_at || null,
    status: row.status || 'present',
    check_in_location: row.clock_in_location ?? row.check_in_location ?? null,
    check_out_location: row.clock_out_location ?? row.check_out_location ?? null,
    check_in_photo: row.clock_in_photo ?? null,
    check_out_photo: row.clock_out_photo ?? null,
    geofence_id: row.geofence_id ?? null,
    notes: row.notes ?? null,
    work_hours: row.work_hours != null ? Number(row.work_hours) : null,
    late_minutes: Number(row.late_minutes) || 0,
  };
}

export async function resolveEmployeeId(
  sequelize: any,
  userId: string,
  tenantId?: string | null,
): Promise<string | null> {
  const ctx = await resolveEmployeeContext(sequelize, userId, tenantId);
  return ctx.employeeId || null;
}

export async function getTodayAttendance(
  sequelize: any,
  userId: string,
  today: string,
  tenantId?: string | null,
): Promise<PortalAttendanceRow | null> {
  const [rows] = await sequelize.query(`
    SELECT date, clock_in, clock_out, status, clock_in_location, clock_out_location, notes, work_hours, late_minutes
    FROM ${ATTENDANCE_TABLE}
    WHERE employee_id IN (${employeeIdSubquery()}) AND date = :today
    ORDER BY clock_in DESC NULLS LAST
    LIMIT 1
  `, { replacements: { userId, today, tenantId: tenantId || null } });
  return mapCanonicalToPortal((rows as any[])?.[0]);
}

export async function getMonthStatusSummary(
  sequelize: any,
  userId: string,
  monthStart: string,
  today: string,
  tenantId?: string | null,
): Promise<Record<string, number>> {
  const [rows] = await sequelize.query(`
    SELECT status, COUNT(*)::int AS count
    FROM ${ATTENDANCE_TABLE}
    WHERE employee_id IN (${employeeIdSubquery()})
      AND date >= :monthStart AND date <= :today
    GROUP BY status
  `, { replacements: { userId, monthStart, today, tenantId: tenantId || null } });
  const summary: Record<string, number> = {};
  (rows as any[] || []).forEach((r) => { summary[r.status] = r.count; });
  return summary;
}

export async function getLastClockRow(
  sequelize: any,
  userId: string,
  type: 'in' | 'out',
  tenantId?: string | null,
): Promise<any | null> {
  const col = type === 'in' ? 'clock_in' : 'clock_out';
  const [rows] = await sequelize.query(`
    SELECT date, clock_in, clock_out, clock_in_location, clock_out_location
    FROM ${ATTENDANCE_TABLE}
    WHERE employee_id IN (${employeeIdSubquery()}) AND ${col} IS NOT NULL
    ORDER BY ${col} DESC NULLS LAST
    LIMIT 1
  `, { replacements: { userId, tenantId: tenantId || null } });
  const row = (rows as any[])?.[0];
  if (!row) return null;
  return {
    ...row,
    check_in: row.clock_in,
    check_out: row.clock_out,
    check_in_at: row.clock_in,
    check_out_at: row.clock_out,
    check_in_location: row.clock_in_location,
    check_out_location: row.clock_out_location,
    attendance_date: row.date,
  };
}

export async function getAttendanceHistoryRows(
  sequelize: any,
  userId: string,
  monthStart: string,
  monthEnd: string,
  tenantId?: string | null,
): Promise<PortalAttendanceRow[]> {
  const [rows] = await sequelize.query(`
    SELECT date, clock_in, clock_out, status, notes, work_hours, late_minutes, clock_in_location, clock_out_location
    FROM ${ATTENDANCE_TABLE}
    WHERE employee_id IN (${employeeIdSubquery()})
      AND date >= :monthStart AND date < :monthEnd
    ORDER BY date DESC
  `, { replacements: { userId, monthStart, monthEnd, tenantId: tenantId || null } });
  return (rows as any[]).map((r) => {
    const mapped = mapCanonicalToPortal(r)!;
    if (mapped.work_hours == null && r.clock_in && r.clock_out) {
      const diff = (new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime()) / 3600000;
      mapped.work_hours = diff > 0 ? Math.round(diff * 100) / 100 : null;
    }
    return mapped;
  });
}

export async function ensureAttendancePhotoColumns(sequelize: any) {
  if (!sequelize || attendancePhotoColsReady) return;
  const ok = await withAutocommitQuery(sequelize, async (query) => {
    await query(`ALTER TABLE ${ATTENDANCE_TABLE} ADD COLUMN IF NOT EXISTS clock_in_photo TEXT`);
    await query(`ALTER TABLE ${ATTENDANCE_TABLE} ADD COLUMN IF NOT EXISTS clock_out_photo TEXT`);
    await query(`ALTER TABLE ${ATTENDANCE_TABLE} ADD COLUMN IF NOT EXISTS geofence_id UUID`);
    return true;
  }, 'att_photo_cols');
  if (ok) attendancePhotoColsReady = true;
}

export async function portalClockIn(
  sequelize: any,
  userId: string,
  tenantId: string,
  locationJson: string | null,
  method = 'gps_mobile',
  photo: string | null = null,
  geofenceId: string | null = null,
  face?: { matchScore?: number | null; livenessOk?: boolean; matchStatus?: string | null } | null,
) {
  await ensureAttendancePhotoColumns(sequelize);
  const today = businessDateInTimeZone();
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const ctx = await resolveEmployeeContext(sequelize, userId, tenantId);
  if (!ctx.employeeId) throw new Error('Employee record not found');

  const scopedTenant = tenantId || ctx.tenantId;
  const policy = await loadWorkTimePolicy(sequelize, scopedTenant, ctx.branchId);
  const window = await resolveShiftWindow(sequelize, scopedTenant, ctx.employeeId, policy, today);
  const punch = evaluateClockIn(policy, nowDate, { shiftStart: window.shiftStart });
  const scheduledStart = window.shiftStart || punch.expectedStart;
  const scheduledEnd = window.shiftEnd || policy.workEndTime;

  await sequelize.query(`
    INSERT INTO ${ATTENDANCE_TABLE} (
      id, tenant_id, employee_id, branch_id, date, clock_in, status, late_minutes,
      scheduled_start, scheduled_end,
      clock_in_location, clock_in_method, clock_in_photo, geofence_id,
      face_match_score, face_liveness_ok, face_match_status,
      created_at, updated_at
    ) VALUES (
      uuid_generate_v4(), :tenantId, :employeeId, :branchId, :today, :now, :status, :lateMinutes,
      :scheduledStart, :scheduledEnd,
      :locationJson::jsonb, :method, :photo, :geofenceId,
      :faceScore, :faceLive, :faceStatus,
      NOW(), NOW()
    )
    ON CONFLICT (employee_id, date) DO UPDATE SET
      clock_in = COALESCE(${ATTENDANCE_TABLE}.clock_in, EXCLUDED.clock_in),
      clock_in_location = COALESCE(EXCLUDED.clock_in_location, ${ATTENDANCE_TABLE}.clock_in_location),
      clock_in_method = COALESCE(EXCLUDED.clock_in_method, ${ATTENDANCE_TABLE}.clock_in_method),
      clock_in_photo = COALESCE(EXCLUDED.clock_in_photo, ${ATTENDANCE_TABLE}.clock_in_photo),
      geofence_id = COALESCE(EXCLUDED.geofence_id, ${ATTENDANCE_TABLE}.geofence_id),
      face_match_score = COALESCE(EXCLUDED.face_match_score, ${ATTENDANCE_TABLE}.face_match_score),
      face_liveness_ok = COALESCE(EXCLUDED.face_liveness_ok, ${ATTENDANCE_TABLE}.face_liveness_ok),
      face_match_status = COALESCE(EXCLUDED.face_match_status, ${ATTENDANCE_TABLE}.face_match_status),
      late_minutes = CASE WHEN ${ATTENDANCE_TABLE}.clock_in IS NULL THEN EXCLUDED.late_minutes ELSE ${ATTENDANCE_TABLE}.late_minutes END,
      scheduled_start = COALESCE(${ATTENDANCE_TABLE}.scheduled_start, EXCLUDED.scheduled_start),
      scheduled_end = COALESCE(${ATTENDANCE_TABLE}.scheduled_end, EXCLUDED.scheduled_end),
      status = CASE
        WHEN ${ATTENDANCE_TABLE}.clock_in IS NULL THEN EXCLUDED.status
        WHEN ${ATTENDANCE_TABLE}.status = 'absent' THEN 'present'
        ELSE ${ATTENDANCE_TABLE}.status
      END,
      updated_at = NOW()
  `, {
    replacements: {
      tenantId: scopedTenant,
      employeeId: ctx.employeeId,
      branchId: ctx.branchId,
      today,
      now,
      status: punch.status,
      lateMinutes: punch.lateMinutes,
      scheduledStart,
      scheduledEnd,
      locationJson,
      method,
      photo,
      geofenceId,
      faceScore: face?.matchScore ?? null,
      faceLive: face?.livenessOk ?? null,
      faceStatus: face?.matchStatus ?? null,
    },
  });
}

export async function portalClockOut(
  sequelize: any,
  userId: string,
  tenantId: string,
  locationJson: string | null,
  method = 'gps_mobile',
  photo: string | null = null,
  geofenceId: string | null = null,
  face?: { matchScore?: number | null; livenessOk?: boolean; matchStatus?: string | null } | null,
) {
  await ensureAttendancePhotoColumns(sequelize);
  const today = businessDateInTimeZone();
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const ctx = await resolveEmployeeContext(sequelize, userId, tenantId);
  if (!ctx.employeeId) throw new Error('Employee record not found');

  const scopedTenant = tenantId || ctx.tenantId;
  let workHours: number | null = null;
  let overtimeMinutes = 0;
  let earlyLeaveMinutes = 0;
  try {
    const [existing] = await sequelize.query(
      `SELECT clock_in FROM ${ATTENDANCE_TABLE} WHERE employee_id = :employeeId AND date = :today LIMIT 1`,
      { replacements: { employeeId: ctx.employeeId, today } },
    );
    const clockInAt = (existing as any[])?.[0]?.clock_in;
    if (clockInAt) {
      const policy = await loadWorkTimePolicy(sequelize, scopedTenant, ctx.branchId);
      const window = await resolveShiftWindow(sequelize, scopedTenant, ctx.employeeId, policy, today);
      const punch = evaluateClockOut(policy, new Date(clockInAt), nowDate, { shiftEnd: window.shiftEnd });
      workHours = punch.workHours;
      overtimeMinutes = punch.overtimeMinutes;
      earlyLeaveMinutes = punch.earlyLeaveMinutes;
    }
  } catch (err: any) {
    console.warn('[attendance] clock-out policy eval skipped', err?.message);
  }

  const [updated] = await sequelize.query(`
    UPDATE ${ATTENDANCE_TABLE} SET
      clock_out = :now,
      clock_out_location = COALESCE(:locationJson::jsonb, clock_out_location),
      clock_out_method = COALESCE(:method, clock_out_method),
      clock_out_photo = COALESCE(:photo, clock_out_photo),
      geofence_id = COALESCE(:geofenceId, geofence_id),
      face_match_score = COALESCE(:faceScore, face_match_score),
      face_liveness_ok = COALESCE(:faceLive, face_liveness_ok),
      face_match_status = COALESCE(:faceStatus, face_match_status),
      work_hours = CASE
        WHEN :workHours::numeric IS NOT NULL THEN :workHours
        WHEN clock_in IS NOT NULL THEN ROUND(EXTRACT(EPOCH FROM (:now::timestamptz - clock_in)) / 3600, 2)
        ELSE work_hours
      END,
      overtime_minutes = :overtimeMinutes,
      early_leave_minutes = :earlyLeaveMinutes,
      updated_at = NOW()
    WHERE employee_id = :employeeId AND date = :today
    RETURNING id
  `, {
    replacements: {
      employeeId: ctx.employeeId,
      today,
      now,
      locationJson,
      method,
      photo,
      geofenceId,
      faceScore: face?.matchScore ?? null,
      faceLive: face?.livenessOk ?? null,
      faceStatus: face?.matchStatus ?? null,
      workHours,
      overtimeMinutes,
      earlyLeaveMinutes,
    },
  });

  if (!(updated as any[])?.length) {
    await sequelize.query(`
      INSERT INTO ${ATTENDANCE_TABLE} (
        id, tenant_id, employee_id, branch_id, date, clock_out, status,
        clock_out_location, clock_out_method, clock_out_photo, geofence_id,
        face_match_score, face_liveness_ok, face_match_status,
        created_at, updated_at
      ) VALUES (
        uuid_generate_v4(), :tenantId, :employeeId, :branchId, :today, :now, 'present',
        :locationJson::jsonb, :method, :photo, :geofenceId,
        :faceScore, :faceLive, :faceStatus,
        NOW(), NOW()
      )
    `, {
      replacements: {
        tenantId: tenantId || ctx.tenantId,
        employeeId: ctx.employeeId,
        branchId: ctx.branchId,
        today,
        now,
        locationJson,
        method,
        photo,
        geofenceId,
        faceScore: face?.matchScore ?? null,
        faceLive: face?.livenessOk ?? null,
        faceStatus: face?.matchStatus ?? null,
      },
    });
  }
}
