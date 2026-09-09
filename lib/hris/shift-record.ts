import { toTimeInput } from '@/lib/hris/work-time-policy';

/** UI + API shape for work_shifts (snake_case). Sequelize toJSON is camelCase. */
export type WorkShiftView = {
  id: string;
  code: string;
  name: string;
  description: string;
  shift_type: string;
  start_time: string;
  end_time: string;
  break_start: string;
  break_end: string;
  break_duration_minutes: number;
  is_cross_day: boolean;
  work_hours_per_day: number;
  color: string;
  tolerance_late_minutes: number;
  overtime_after_minutes: number;
  applicable_days: number[];
  is_active: boolean;
  sort_order: number;
};

export type GeofenceView = {
  id: string;
  name: string;
  description: string;
  location_type: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  address: string;
  is_active: boolean;
};

function asBool(value: unknown, fallback = true): boolean {
  if (value === false || value === 0 || value === 'false') return false;
  if (value === true || value === 1 || value === 'true') return true;
  return fallback;
}

function asNum(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asDays(value: unknown): number[] {
  if (Array.isArray(value) && value.length) return value.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6);
  return [1, 2, 3, 4, 5];
}

export function normalizeWorkShift(raw: Record<string, any> | null | undefined): WorkShiftView {
  const r = raw || {};
  return {
    id: String(r.id || ''),
    code: String(r.code || ''),
    name: String(r.name || ''),
    description: String(r.description || ''),
    shift_type: String(r.shift_type || r.shiftType || 'regular'),
    start_time: toTimeInput(r.start_time || r.startTime),
    end_time: toTimeInput(r.end_time || r.endTime || '17:00'),
    break_start: toTimeInput(r.break_start || r.breakStart || '12:00'),
    break_end: toTimeInput(r.break_end || r.breakEnd || '13:00'),
    break_duration_minutes: asNum(r.break_duration_minutes ?? r.breakDurationMinutes, 60),
    is_cross_day: asBool(r.is_cross_day ?? r.isCrossDay, false),
    work_hours_per_day: asNum(r.work_hours_per_day ?? r.workHoursPerDay, 8),
    color: String(r.color || '#3B82F6'),
    tolerance_late_minutes: asNum(r.tolerance_late_minutes ?? r.toleranceLateMinutes, 15),
    overtime_after_minutes: asNum(r.overtime_after_minutes ?? r.overtimeAfterMinutes, 30),
    applicable_days: asDays(r.applicable_days ?? r.applicableDays),
    is_active: asBool(r.is_active ?? r.isActive, true),
    sort_order: asNum(r.sort_order ?? r.sortOrder, 0),
  };
}

export function normalizeGeofence(raw: Record<string, any> | null | undefined): GeofenceView {
  const r = raw || {};
  return {
    id: String(r.id || ''),
    name: String(r.name || ''),
    description: String(r.description || ''),
    location_type: String(r.location_type || r.locationType || 'office'),
    latitude: asNum(r.latitude, 0),
    longitude: asNum(r.longitude, 0),
    radius_meters: asNum(r.radius_meters ?? r.radiusMeters, 100),
    address: String(r.address || ''),
    is_active: asBool(r.is_active ?? r.isActive, true),
  };
}

export function normalizeRotation(raw: Record<string, any> | null | undefined) {
  const r = raw || {};
  return {
    id: String(r.id || ''),
    name: String(r.name || ''),
    description: String(r.description || ''),
    rotation_type: String(r.rotation_type || r.rotationType || 'weekly'),
    rotation_pattern: Array.isArray(r.rotation_pattern) ? r.rotation_pattern : (r.rotationPattern || []),
    employee_ids: Array.isArray(r.employee_ids) ? r.employee_ids : (r.employeeIds || []),
    is_active: asBool(r.is_active ?? r.isActive, true),
    auto_generate: asBool(r.auto_generate ?? r.autoGenerate, true),
    generate_weeks_ahead: asNum(r.generate_weeks_ahead ?? r.generateWeeksAhead, 2),
    last_generated_date: r.last_generated_date || r.lastGeneratedDate || '',
  };
}

/** Sequelize create/update attrs only — drop snake_case duplicates that can confuse inserts. */
export function workShiftWriteAttrs(body: Record<string, any>, tenantId?: string | null) {
  return {
    tenantId: tenantId || body.tenantId || null,
    code: body.code,
    name: body.name,
    description: body.description || null,
    shiftType: body.shiftType || body.shift_type || 'regular',
    startTime: body.startTime || body.start_time,
    endTime: body.endTime || body.end_time,
    breakStart: body.breakStart || body.break_start || null,
    breakEnd: body.breakEnd || body.break_end || null,
    breakDurationMinutes: body.breakDurationMinutes ?? body.break_duration_minutes ?? 60,
    isCrossDay: !!(body.isCrossDay ?? body.is_cross_day),
    workHoursPerDay: body.workHoursPerDay ?? body.work_hours_per_day ?? 8,
    color: body.color || '#3B82F6',
    toleranceLateMinutes: body.toleranceLateMinutes ?? body.tolerance_late_minutes ?? 15,
    overtimeAfterMinutes: body.overtimeAfterMinutes ?? body.overtime_after_minutes ?? 30,
    applicableDays: body.applicableDays || body.applicable_days || [1, 2, 3, 4, 5],
    isActive: body.isActive !== false && body.is_active !== false,
    sortOrder: body.sortOrder ?? body.sort_order ?? 0,
  };
}
