/**
 * Industrial work-time systems for Humanify attendance policy.
 * Client-safe — no sequelize.
 *
 * Models used in Indonesian HR / UU Ketenagakerjaan practice:
 *  - fixed: jam kantor tetap
 *  - shift: multi-shift / rotasi
 *  - flexible: flextime + jam inti
 *  - hours_bank: target jam per minggu/bulan (timesheet)
 *  - compressed: 4x10 / 9-80
 *  - split: dua sesi dalam sehari
 *  - field: lapangan / GPS, jadwal longgar
 *  - remote_hybrid: WFH + jam inti opsional
 */

export type WorkTimeSystem =
  | 'fixed'
  | 'shift'
  | 'flexible'
  | 'hours_bank'
  | 'compressed'
  | 'split'
  | 'field'
  | 'remote_hybrid';

export type HoursBankPeriod = 'weekly' | 'monthly';
export type CompressedPattern = '4x10' | '9x80';

export type WorkTimePolicy = {
  workTimeSystem: WorkTimeSystem;
  workStartTime: string;
  workEndTime: string;
  breakStartTime: string;
  breakEndTime: string;
  breakDurationMinutes: number;
  workDays: number[];
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  autoAbsentAfterMinutes: number;
  overtimeEnabled: boolean;
  overtimeMinMinutes: number;
  overtimeRequiresApproval: boolean;
  weeklyHoursTarget: number;
  dailyHoursTarget: number;
  coreHoursStart: string;
  coreHoursEnd: string;
  flexWindowStart: string;
  flexWindowEnd: string;
  compressedPattern: CompressedPattern;
  hoursBankPeriod: HoursBankPeriod;
  defaultShiftId: string;
  splitSecondStart: string;
  splitSecondEnd: string;
  restBetweenShiftsHours: number;
  maxConsecutiveWorkDays: number;
  requireCoreHours: boolean;
  nightShiftCrossDay: boolean;
};

export const WORK_TIME_SYSTEMS: Array<{
  code: WorkTimeSystem;
  label: string;
  summary: string;
  hint: string;
}> = [
  { code: 'fixed', label: 'Jam tetap', summary: 'Masuk–pulang sama setiap hari kerja', hint: 'Kantor, administrasi, 5×8 jam.' },
  { code: 'shift', label: 'Sistem shift', summary: 'Pagi / siang / malam, bisa rotasi & lintas hari', hint: 'Pabrik, rumah sakit, retail, security.' },
  { code: 'flexible', label: 'Flextime', summary: 'Jendela masuk + jam inti wajib hadir', hint: 'Knowledge work; telat dihitung dari batas jendela.' },
  { code: 'hours_bank', label: 'Bank jam', summary: 'Target jam per minggu/bulan, bukan jam masuk kaku', hint: 'Kontrak jam, konsultan, timesheet.' },
  { code: 'compressed', label: 'Minggu padat', summary: '4×10 jam atau 9/80', hint: 'Lebih sedikit hari hadir, jam harian lebih panjang.' },
  { code: 'split', label: 'Split shift', summary: 'Dua sesi kerja dengan jeda panjang', hint: 'F&B, transport, layanan dua peak.' },
  { code: 'field', label: 'Lapangan', summary: 'GPS / kunjungan, jadwal longgar', hint: 'Surveyor, sales lapangan, teknisi.' },
  { code: 'remote_hybrid', label: 'Hybrid / WFH', summary: 'Remote dengan jam inti opsional', hint: 'Campuran kantor dan rumah.' },
];

const DEFAULT_DAYS = [1, 2, 3, 4, 5];

export function toTimeInput(value?: string | null): string {
  const raw = String(value || '08:00').trim();
  const m = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '08:00';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

export function parseHm(value?: string | null): number {
  const t = toTimeInput(value);
  const [h, m] = t.split(':').map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

export function minutesInTimeZone(date: Date, timeZone = 'Asia/Jakarta'): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  return h * 60 + m;
}

export function weekdayInTimeZone(date: Date, timeZone = 'Asia/Jakarta'): number {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wd] ?? date.getDay();
}

export function isWorkDay(policy: Pick<WorkTimePolicy, 'workDays'>, date: Date, timeZone = 'Asia/Jakarta'): boolean {
  const days = Array.isArray(policy.workDays) && policy.workDays.length ? policy.workDays : DEFAULT_DAYS;
  return days.includes(weekdayInTimeZone(date, timeZone));
}

export function presetForSystem(system: WorkTimeSystem): Partial<WorkTimePolicy> {
  switch (system) {
    case 'shift':
      return { workTimeSystem: system, workStartTime: '07:00', workEndTime: '15:00', workDays: [1, 2, 3, 4, 5, 6], dailyHoursTarget: 8, weeklyHoursTarget: 40, nightShiftCrossDay: true };
    case 'flexible':
      return { workTimeSystem: system, flexWindowStart: '07:00', flexWindowEnd: '10:00', coreHoursStart: '10:00', coreHoursEnd: '15:00', workStartTime: '08:00', workEndTime: '17:00', dailyHoursTarget: 8, weeklyHoursTarget: 40 };
    case 'hours_bank':
      return { workTimeSystem: system, weeklyHoursTarget: 40, dailyHoursTarget: 8, hoursBankPeriod: 'weekly', lateGraceMinutes: 0 };
    case 'compressed':
      return { workTimeSystem: system, compressedPattern: '4x10', workDays: [1, 2, 3, 4], workStartTime: '07:30', workEndTime: '18:00', dailyHoursTarget: 10, weeklyHoursTarget: 40, breakDurationMinutes: 60 };
    case 'split':
      return { workTimeSystem: system, workStartTime: '06:00', workEndTime: '10:00', splitSecondStart: '16:00', splitSecondEnd: '21:00', dailyHoursTarget: 8, breakDurationMinutes: 0 };
    case 'field':
      return { workTimeSystem: system, workDays: [1, 2, 3, 4, 5, 6], lateGraceMinutes: 30, dailyHoursTarget: 8, weeklyHoursTarget: 40 };
    case 'remote_hybrid':
      return { workTimeSystem: system, requireCoreHours: true, coreHoursStart: '10:00', coreHoursEnd: '15:00', flexWindowStart: '07:30', flexWindowEnd: '10:00', dailyHoursTarget: 8 };
    default:
      return { workTimeSystem: 'fixed', workStartTime: '08:00', workEndTime: '17:00', workDays: DEFAULT_DAYS, dailyHoursTarget: 8, weeklyHoursTarget: 40 };
  }
}

export function normalizeWorkTimePolicy(raw?: Partial<WorkTimePolicy> | Record<string, any> | null): WorkTimePolicy {
  const src = raw && typeof raw === 'object' ? raw : {};
  const system = (WORK_TIME_SYSTEMS.some((s) => s.code === src.workTimeSystem) ? src.workTimeSystem : 'fixed') as WorkTimeSystem;
  const preset = presetForSystem(system);
  return {
    workTimeSystem: system,
    workStartTime: toTimeInput(src.workStartTime || preset.workStartTime || '08:00'),
    workEndTime: toTimeInput(src.workEndTime || preset.workEndTime || '17:00'),
    breakStartTime: toTimeInput(src.breakStartTime || '12:00'),
    breakEndTime: toTimeInput(src.breakEndTime || '13:00'),
    breakDurationMinutes: Number(src.breakDurationMinutes ?? 60) || 0,
    workDays: Array.isArray(src.workDays) && src.workDays.length ? src.workDays.map(Number) : (preset.workDays || DEFAULT_DAYS),
    lateGraceMinutes: Number(src.lateGraceMinutes ?? 15) || 0,
    earlyLeaveGraceMinutes: Number(src.earlyLeaveGraceMinutes ?? 15) || 0,
    autoAbsentAfterMinutes: Number(src.autoAbsentAfterMinutes ?? 120) || 0,
    overtimeEnabled: src.overtimeEnabled !== false,
    overtimeMinMinutes: Number(src.overtimeMinMinutes ?? 30) || 0,
    overtimeRequiresApproval: src.overtimeRequiresApproval !== false,
    weeklyHoursTarget: Number(src.weeklyHoursTarget ?? preset.weeklyHoursTarget ?? 40) || 40,
    dailyHoursTarget: Number(src.dailyHoursTarget ?? preset.dailyHoursTarget ?? 8) || 8,
    coreHoursStart: toTimeInput(src.coreHoursStart || preset.coreHoursStart || '10:00'),
    coreHoursEnd: toTimeInput(src.coreHoursEnd || preset.coreHoursEnd || '15:00'),
    flexWindowStart: toTimeInput(src.flexWindowStart || preset.flexWindowStart || '07:00'),
    flexWindowEnd: toTimeInput(src.flexWindowEnd || preset.flexWindowEnd || '10:00'),
    compressedPattern: src.compressedPattern === '9x80' ? '9x80' : '4x10',
    hoursBankPeriod: src.hoursBankPeriod === 'monthly' ? 'monthly' : 'weekly',
    defaultShiftId: String(src.defaultShiftId || ''),
    splitSecondStart: toTimeInput(src.splitSecondStart || preset.splitSecondStart || '16:00'),
    splitSecondEnd: toTimeInput(src.splitSecondEnd || preset.splitSecondEnd || '21:00'),
    restBetweenShiftsHours: Number(src.restBetweenShiftsHours ?? 11) || 11,
    maxConsecutiveWorkDays: Number(src.maxConsecutiveWorkDays ?? 6) || 6,
    requireCoreHours: src.requireCoreHours !== false,
    nightShiftCrossDay: src.nightShiftCrossDay != null ? Boolean(src.nightShiftCrossDay) : system === 'shift',
  };
}

export type ClockInEval = {
  status: 'present' | 'late';
  lateMinutes: number;
  expectedStart: string;
  tracksPunctuality: boolean;
  note: string;
};

export type ClockOutEval = {
  workHours: number;
  overtimeMinutes: number;
  earlyLeaveMinutes: number;
  expectedEnd: string;
  tracksPunctuality: boolean;
};

function expectedStartHm(policy: WorkTimePolicy, shiftStart?: string | null): string {
  if (shiftStart) return toTimeInput(shiftStart);
  switch (policy.workTimeSystem) {
    case 'flexible':
    case 'remote_hybrid':
      return policy.flexWindowEnd;
    case 'split':
      return policy.workStartTime;
    default:
      return policy.workStartTime;
  }
}

function expectedEndHm(policy: WorkTimePolicy, shiftEnd?: string | null): string {
  if (shiftEnd) return toTimeInput(shiftEnd);
  if (policy.workTimeSystem === 'split') return policy.splitSecondEnd;
  return policy.workEndTime;
}

function tracksPunctuality(policy: WorkTimePolicy): boolean {
  if (['hours_bank', 'field'].includes(policy.workTimeSystem)) return false;
  if (policy.workTimeSystem === 'remote_hybrid' && !policy.requireCoreHours) return false;
  return true;
}

/** Minutes after `anchor` at `current`, wrapping midnight for night shift. */
export function minutesAfter(anchorHm: number, currentHm: number, crossDay = false): number {
  let delta = currentHm - anchorHm;
  if (crossDay && delta < -6 * 60) delta += 24 * 60;
  if (crossDay && delta > 18 * 60) delta -= 24 * 60;
  return delta;
}

export function evaluateClockIn(
  policyInput: Partial<WorkTimePolicy> | null | undefined,
  at: Date,
  opts?: { shiftStart?: string | null; timeZone?: string },
): ClockInEval {
  const policy = normalizeWorkTimePolicy(policyInput);
  const tz = opts?.timeZone || 'Asia/Jakarta';
  const nowM = minutesInTimeZone(at, tz);
  const tracks = tracksPunctuality(policy);
  const expectedStart = expectedStartHm(policy, opts?.shiftStart);
  if (!tracks) {
    return { status: 'present', lateMinutes: 0, expectedStart, tracksPunctuality: false, note: 'Sistem ini tidak menandai telat dari jam masuk.' };
  }
  const over = minutesAfter(parseHm(expectedStart), nowM, policy.nightShiftCrossDay);
  const lateMinutes = over > policy.lateGraceMinutes ? over : 0;
  return {
    status: lateMinutes > 0 ? 'late' : 'present',
    lateMinutes,
    expectedStart,
    tracksPunctuality: true,
    note: lateMinutes > 0
      ? `Telat ${lateMinutes} menit dari ${expectedStart} (toleransi ${policy.lateGraceMinutes} m).`
      : `Hadir sesuai ${policy.workTimeSystem === 'flexible' || policy.workTimeSystem === 'remote_hybrid' ? 'batas jendela flextime' : 'jam masuk'} ${expectedStart}.`,
  };
}

export function evaluateClockOut(
  policyInput: Partial<WorkTimePolicy> | null | undefined,
  clockIn: Date,
  clockOut: Date,
  opts?: { shiftEnd?: string | null; timeZone?: string },
): ClockOutEval {
  const policy = normalizeWorkTimePolicy(policyInput);
  const tz = opts?.timeZone || 'Asia/Jakarta';
  const tracks = tracksPunctuality(policy);
  let rawHours = (clockOut.getTime() - clockIn.getTime()) / 3600000;
  if (rawHours < 0) rawHours += 24;
  const breakH = (policy.breakDurationMinutes || 0) / 60;
  const workHours = Math.max(0, Math.round((rawHours - (rawHours > breakH + 0.5 ? breakH : 0)) * 100) / 100);
  const expectedEnd = expectedEndHm(policy, opts?.shiftEnd);
  const outM = minutesInTimeZone(clockOut, tz);
  const endM = parseHm(expectedEnd);
  const afterEnd = minutesAfter(endM, outM, policy.nightShiftCrossDay);
  const earlyLeaveMinutes = tracks && afterEnd < -policy.earlyLeaveGraceMinutes
    ? Math.max(0, -afterEnd)
    : 0;
  let overtimeMinutes = 0;
  if (policy.overtimeEnabled) {
    if (tracks) {
      overtimeMinutes = Math.max(0, afterEnd);
    } else {
      overtimeMinutes = Math.max(0, Math.round((workHours - policy.dailyHoursTarget) * 60));
    }
    if (overtimeMinutes < policy.overtimeMinMinutes) overtimeMinutes = 0;
  }
  return {
    workHours,
    overtimeMinutes,
    earlyLeaveMinutes,
    expectedEnd,
    tracksPunctuality: tracks,
  };
}
