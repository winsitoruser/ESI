/**
 * Unified attendance data layer — canonical table: employee_attendance
 * Maps portal field names (check_in/check_out) for backward compatibility.
 */

import { resolveEmployeeContext } from '@/lib/employee-portal';

export const ATTENDANCE_TABLE = 'employee_attendance';

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

function employeeIdSubquery() {
  return `SELECT id FROM employees WHERE user_id = :userId OR email = (SELECT email FROM users WHERE id = :userId)`;
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

export async function resolveEmployeeId(sequelize: any, userId: string): Promise<string | null> {
  const ctx = await resolveEmployeeContext(sequelize, userId);
  return ctx.employeeId || null;
}

export async function getTodayAttendance(
  sequelize: any,
  userId: string,
  today: string,
): Promise<PortalAttendanceRow | null> {
  const [rows] = await sequelize.query(`
    SELECT date, clock_in, clock_out, status, clock_in_location, clock_out_location, notes, work_hours, late_minutes
    FROM ${ATTENDANCE_TABLE}
    WHERE employee_id IN (${employeeIdSubquery()}) AND date = :today
    ORDER BY clock_in DESC NULLS LAST
    LIMIT 1
  `, { replacements: { userId, today } });
  return mapCanonicalToPortal((rows as any[])?.[0]);
}

export async function getMonthStatusSummary(
  sequelize: any,
  userId: string,
  monthStart: string,
  today: string,
): Promise<Record<string, number>> {
  const [rows] = await sequelize.query(`
    SELECT status, COUNT(*)::int AS count
    FROM ${ATTENDANCE_TABLE}
    WHERE employee_id IN (${employeeIdSubquery()})
      AND date >= :monthStart AND date <= :today
    GROUP BY status
  `, { replacements: { userId, monthStart, today } });
  const summary: Record<string, number> = {};
  (rows as any[] || []).forEach((r) => { summary[r.status] = r.count; });
  return summary;
}

export async function getLastClockRow(
  sequelize: any,
  userId: string,
  type: 'in' | 'out',
): Promise<any | null> {
  const col = type === 'in' ? 'clock_in' : 'clock_out';
  const [rows] = await sequelize.query(`
    SELECT date, clock_in, clock_out, clock_in_location, clock_out_location
    FROM ${ATTENDANCE_TABLE}
    WHERE employee_id IN (${employeeIdSubquery()}) AND ${col} IS NOT NULL
    ORDER BY ${col} DESC NULLS LAST
    LIMIT 1
  `, { replacements: { userId } });
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
): Promise<PortalAttendanceRow[]> {
  const [rows] = await sequelize.query(`
    SELECT date, clock_in, clock_out, status, notes, work_hours, late_minutes, clock_in_location, clock_out_location
    FROM ${ATTENDANCE_TABLE}
    WHERE employee_id IN (${employeeIdSubquery()})
      AND date >= :monthStart AND date < :monthEnd
    ORDER BY date DESC
  `, { replacements: { userId, monthStart, monthEnd } });
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
  if (!sequelize) return;
  try {
    await sequelize.query(`ALTER TABLE ${ATTENDANCE_TABLE} ADD COLUMN IF NOT EXISTS clock_in_photo TEXT`);
    await sequelize.query(`ALTER TABLE ${ATTENDANCE_TABLE} ADD COLUMN IF NOT EXISTS clock_out_photo TEXT`);
    await sequelize.query(`ALTER TABLE ${ATTENDANCE_TABLE} ADD COLUMN IF NOT EXISTS geofence_id UUID`);
  } catch { /* noop */ }
}

export async function portalClockIn(
  sequelize: any,
  userId: string,
  tenantId: string,
  locationJson: string | null,
  method = 'gps_mobile',
  photo: string | null = null,
  geofenceId: string | null = null,
) {
  await ensureAttendancePhotoColumns(sequelize);
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  const ctx = await resolveEmployeeContext(sequelize, userId);
  if (!ctx.employeeId) throw new Error('Employee record not found');

  await sequelize.query(`
    INSERT INTO ${ATTENDANCE_TABLE} (
      id, tenant_id, employee_id, branch_id, date, clock_in, status,
      clock_in_location, clock_in_method, clock_in_photo, geofence_id, created_at, updated_at
    ) VALUES (
      uuid_generate_v4(), :tenantId, :employeeId, :branchId, :today, :now, 'present',
      :locationJson::jsonb, :method, :photo, :geofenceId, NOW(), NOW()
    )
    ON CONFLICT (employee_id, date) DO UPDATE SET
      clock_in = COALESCE(${ATTENDANCE_TABLE}.clock_in, EXCLUDED.clock_in),
      clock_in_location = COALESCE(EXCLUDED.clock_in_location, ${ATTENDANCE_TABLE}.clock_in_location),
      clock_in_method = COALESCE(EXCLUDED.clock_in_method, ${ATTENDANCE_TABLE}.clock_in_method),
      clock_in_photo = COALESCE(EXCLUDED.clock_in_photo, ${ATTENDANCE_TABLE}.clock_in_photo),
      geofence_id = COALESCE(EXCLUDED.geofence_id, ${ATTENDANCE_TABLE}.geofence_id),
      status = CASE WHEN ${ATTENDANCE_TABLE}.status = 'absent' THEN 'present' ELSE ${ATTENDANCE_TABLE}.status END,
      updated_at = NOW()
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
) {
  await ensureAttendancePhotoColumns(sequelize);
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  const ctx = await resolveEmployeeContext(sequelize, userId);
  if (!ctx.employeeId) throw new Error('Employee record not found');

  const [updated] = await sequelize.query(`
    UPDATE ${ATTENDANCE_TABLE} SET
      clock_out = :now,
      clock_out_location = COALESCE(:locationJson::jsonb, clock_out_location),
      clock_out_method = COALESCE(:method, clock_out_method),
      clock_out_photo = COALESCE(:photo, clock_out_photo),
      geofence_id = COALESCE(:geofenceId, geofence_id),
      work_hours = CASE
        WHEN clock_in IS NOT NULL THEN ROUND(EXTRACT(EPOCH FROM (:now::timestamptz - clock_in)) / 3600, 2)
        ELSE work_hours
      END,
      updated_at = NOW()
    WHERE employee_id = :employeeId AND date = :today
    RETURNING id
  `, { replacements: { employeeId: ctx.employeeId, today, now, locationJson, method, photo, geofenceId } });

  if (!(updated as any[])?.length) {
    await sequelize.query(`
      INSERT INTO ${ATTENDANCE_TABLE} (
        id, tenant_id, employee_id, branch_id, date, clock_out, status,
        clock_out_location, clock_out_method, clock_out_photo, geofence_id, created_at, updated_at
      ) VALUES (
        uuid_generate_v4(), :tenantId, :employeeId, :branchId, :today, :now, 'present',
        :locationJson::jsonb, :method, :photo, :geofenceId, NOW(), NOW()
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
      },
    });
  }
}
