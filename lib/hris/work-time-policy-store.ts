/**
 * Server-only loader for attendance work-time policy (JSON blob in attendance_settings).
 */
import { normalizeWorkTimePolicy, toTimeInput, type WorkTimePolicy } from '@/lib/hris/work-time-policy';
import { ensureShiftScheduleEmployeeIdText } from '@/lib/hris/shift-schedule-schema';
import { safeQueryWithSavepoint } from '@/lib/saas/tenant-request-bound';

export type ShiftWindow = { shiftStart?: string; shiftEnd?: string; source: 'schedule' | 'default_shift' | 'policy' };

export type AttendancePolicy = WorkTimePolicy & {
  gpsAttendanceEnabled?: boolean;
  geoFenceRadius?: number;
  allowOutsideGeofence?: boolean;
  requireSelfie?: boolean;
  punchTypeDetection?: string;
  fingerprintEnabled?: boolean;
};

function parseJsonb(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return {}; }
  }
  if (typeof value === 'object') return value as Record<string, unknown>;
  return {};
}

export async function loadWorkTimePolicy(
  sequelize: any,
  tenantId?: string | null,
  branchId?: string | null,
): Promise<AttendancePolicy> {
  if (!sequelize || !tenantId) return normalizeWorkTimePolicy({});
  const rows = await safeQueryWithSavepoint(
    sequelize,
    `SELECT setting_value
     FROM attendance_settings
     WHERE setting_key = 'policy'
       AND tenant_id = :tenantId
       AND (
         (:branchId::uuid IS NULL AND branch_id IS NULL)
         OR (:branchId::uuid IS NOT NULL AND (branch_id = :branchId::uuid OR branch_id IS NULL))
       )
     ORDER BY CASE WHEN branch_id IS NOT NULL THEN 0 ELSE 1 END
     LIMIT 1`,
    { tenantId, branchId: branchId || null },
    'att_policy',
  );
  const raw = parseJsonb(rows?.[0]?.setting_value);
  return { ...raw, ...normalizeWorkTimePolicy(raw) };
}

export async function resolveShiftWindow(
  sequelize: any,
  tenantId: string | null | undefined,
  employeeId: string | null | undefined,
  policy: WorkTimePolicy,
  dateIso: string,
): Promise<ShiftWindow> {
  const fallback: ShiftWindow = { source: 'policy' };
  if (!sequelize) return fallback;

  if (employeeId) {
    await ensureShiftScheduleEmployeeIdText(sequelize);
    const rows = await safeQueryWithSavepoint(
      sequelize,
      `SELECT COALESCE(ss.custom_start_time, ws.start_time) AS start_time,
              COALESCE(ss.custom_end_time, ws.end_time) AS end_time
       FROM shift_schedules ss
       LEFT JOIN work_shifts ws ON ws.id = ss.work_shift_id
       WHERE ss.schedule_date = :dateIso
         AND ss.employee_id::text = :employeeId
         AND (ss.tenant_id IS NULL OR :tenantId::uuid IS NULL OR ss.tenant_id = :tenantId::uuid)
       LIMIT 1`,
      { dateIso, employeeId: String(employeeId), tenantId: tenantId || null },
      'shift_window',
    );
    const row = rows?.[0];
    if (row?.start_time) {
      return { shiftStart: toTimeInput(row.start_time), shiftEnd: toTimeInput(row.end_time), source: 'schedule' };
    }
  }

  if (policy.workTimeSystem === 'shift' && policy.defaultShiftId) {
    const rows = await safeQueryWithSavepoint(
      sequelize,
      `SELECT start_time, end_time
       FROM work_shifts
       WHERE id = :id
         AND (tenant_id IS NULL OR :tenantId::uuid IS NULL OR tenant_id = :tenantId::uuid)
       LIMIT 1`,
      { id: policy.defaultShiftId, tenantId: tenantId || null },
      'default_shift',
    );
    const row = rows?.[0];
    if (row?.start_time) {
      return { shiftStart: toTimeInput(row.start_time), shiftEnd: toTimeInput(row.end_time), source: 'default_shift' };
    }
  }

  return fallback;
}
