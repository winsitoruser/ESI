/**
 * Month-to-date presence mix: Masuk / Izin / Cuti for the HR dashboard pie.
 * Person-days are exclusive per employee+day (cuti > izin > masuk).
 */

export const MASUK_ATTENDANCE_STATUSES = [
  'present', 'late', 'hadir', 'terlambat', 'work_from_home', 'wfh', 'on_time', 'ok',
] as const;

export const IZIN_ATTENDANCE_STATUSES = [
  'izin', 'permit', 'permission', 'personal',
] as const;

export const CUTI_ATTENDANCE_STATUSES = [
  'leave', 'cuti', 'on_leave', 'sick', 'annual',
] as const;

export const IZIN_LEAVE_TYPES = [
  'personal', 'izin', 'permit', 'permission', 'unpaid', 'special',
] as const;

export type PresenceBucketKey = 'masuk' | 'izin' | 'cuti';

export type PresenceBucket = {
  key: PresenceBucketKey;
  label: string;
  color: string;
  people: number;
  days: number;
  peoplePct: number;
  daysPct: number;
};

export type MonthPresenceMix = {
  period: string;
  periodLabel: string;
  monthStart: string;
  monthEnd: string;
  totalPeople: number;
  uniqueEmployees: number;
  totalDays: number;
  buckets: PresenceBucket[];
};

export const PRESENCE_BUCKET_META: Record<PresenceBucketKey, { label: string; color: string }> = {
  masuk: { label: 'Masuk', color: '#10B981' },
  izin: { label: 'Izin', color: '#F59E0B' },
  cuti: { label: 'Cuti', color: '#7c3aed' },
};

const BUCKET_ORDER: PresenceBucketKey[] = ['masuk', 'izin', 'cuti'];

export function sqlStringList(values: readonly string[]): string {
  return values.map((v) => `'${v.replace(/'/g, "''")}'`).join(',');
}

export function classifyAttendanceStatus(status: unknown): PresenceBucketKey | null {
  const s = String(status || '').trim().toLowerCase();
  if (!s) return null;
  if ((MASUK_ATTENDANCE_STATUSES as readonly string[]).includes(s)) return 'masuk';
  if ((IZIN_ATTENDANCE_STATUSES as readonly string[]).includes(s)) return 'izin';
  if ((CUTI_ATTENDANCE_STATUSES as readonly string[]).includes(s)) return 'cuti';
  return null;
}

export function classifyLeaveType(leaveType: unknown): PresenceBucketKey {
  const s = String(leaveType || '').trim().toLowerCase();
  if ((IZIN_LEAVE_TYPES as readonly string[]).includes(s)) return 'izin';
  return 'cuti';
}

export function monthPresenceWindow(now = new Date()): {
  period: string;
  periodLabel: string;
  monthStart: string;
  monthEnd: string;
} {
  const monthEnd = now.toISOString().slice(0, 10);
  const period = monthEnd.slice(0, 7);
  const monthStart = `${period}-01`;
  const periodLabel = new Date(`${period}-01T00:00:00`).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });
  return { period, periodLabel, monthStart, monthEnd };
}

function pct(part: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function emptyMonthPresence(now = new Date()): MonthPresenceMix {
  const window = monthPresenceWindow(now);
  return {
    ...window,
    totalPeople: 0,
    uniqueEmployees: 0,
    totalDays: 0,
    buckets: BUCKET_ORDER.map((key) => ({
      key,
      label: PRESENCE_BUCKET_META[key].label,
      color: PRESENCE_BUCKET_META[key].color,
      people: 0,
      days: 0,
      peoplePct: 0,
      daysPct: 0,
    })),
  };
}

export function buildMonthPresenceMix(
  rows: Array<{ bucket?: string; people?: number | string; days?: number | string; unique_employees?: number | string }>,
  now = new Date(),
): MonthPresenceMix {
  const window = monthPresenceWindow(now);
  const byKey: Record<PresenceBucketKey, { people: number; days: number }> = {
    masuk: { people: 0, days: 0 },
    izin: { people: 0, days: 0 },
    cuti: { people: 0, days: 0 },
  };
  let uniqueEmployees = 0;
  for (const row of rows || []) {
    const key = String(row.bucket || '') as PresenceBucketKey;
    if (!byKey[key]) continue;
    byKey[key].people += Number(row.people || 0);
    byKey[key].days += Number(row.days || 0);
    const uniq = Number(row.unique_employees || 0);
    if (uniq > uniqueEmployees) uniqueEmployees = uniq;
  }
  const totalPeople = byKey.masuk.people + byKey.izin.people + byKey.cuti.people;
  const totalDays = byKey.masuk.days + byKey.izin.days + byKey.cuti.days;
  if (!uniqueEmployees) uniqueEmployees = totalPeople;
  return {
    ...window,
    totalPeople,
    uniqueEmployees,
    totalDays,
    buckets: BUCKET_ORDER.map((key) => ({
      key,
      label: PRESENCE_BUCKET_META[key].label,
      color: PRESENCE_BUCKET_META[key].color,
      people: byKey[key].people,
      days: byKey[key].days,
      peoplePct: pct(byKey[key].people, totalPeople),
      daysPct: pct(byKey[key].days, totalDays),
    })),
  };
}

export async function queryMonthPresenceMix(
  sequelize: { query: (sql: string, opts?: any) => Promise<any> },
  tenantId: string,
  now = new Date(),
): Promise<MonthPresenceMix> {
  const empty = emptyMonthPresence(now);
  if (!sequelize || !tenantId) return empty;

  const masuk = sqlStringList(MASUK_ATTENDANCE_STATUSES);
  const izinAtt = sqlStringList(IZIN_ATTENDANCE_STATUSES);
  const cutiAtt = sqlStringList(CUTI_ATTENDANCE_STATUSES);
  const izinLeave = sqlStringList(IZIN_LEAVE_TYPES);

  const sql = `
    WITH raw_days AS (
      SELECT ea.employee_id::text AS employee_id,
             ea.date::date AS day,
             CASE
               WHEN LOWER(COALESCE(ea.status::text, '')) IN (${masuk}) THEN 'masuk'
               WHEN LOWER(COALESCE(ea.status::text, '')) IN (${izinAtt}) THEN 'izin'
               WHEN LOWER(COALESCE(ea.status::text, '')) IN (${cutiAtt}) THEN 'cuti'
               ELSE NULL
             END AS bucket
      FROM employee_attendance ea
      WHERE ea.tenant_id = :tenantId
        AND ea.date >= :monthStart::date
        AND ea.date <= :monthEnd::date
      UNION ALL
      SELECT lr.employee_id::text,
             gs::date,
             CASE
               WHEN LOWER(COALESCE(lr.leave_type::text, '')) IN (${izinLeave}) THEN 'izin'
               ELSE 'cuti'
             END
      FROM leave_requests lr
      CROSS JOIN LATERAL generate_series(lr.start_date::date, lr.end_date::date, interval '1 day') AS gs
      WHERE lr.tenant_id = :tenantId
        AND LOWER(COALESCE(lr.status::text, '')) IN ('approved', 'taken', 'completed')
        AND lr.start_date IS NOT NULL
        AND lr.end_date IS NOT NULL
        AND lr.end_date::date >= lr.start_date::date
        AND lr.start_date::date <= :monthEnd::date
        AND lr.end_date::date >= :monthStart::date
        AND gs::date BETWEEN :monthStart::date AND :monthEnd::date
    ),
    exclusive_days AS (
      SELECT employee_id, day,
        CASE
          WHEN BOOL_OR(bucket = 'cuti') THEN 'cuti'
          WHEN BOOL_OR(bucket = 'izin') THEN 'izin'
          WHEN BOOL_OR(bucket = 'masuk') THEN 'masuk'
          ELSE NULL
        END AS bucket
      FROM raw_days
      WHERE bucket IS NOT NULL
      GROUP BY employee_id, day
    )
    SELECT bucket,
           COUNT(*)::int AS days,
           COUNT(DISTINCT employee_id)::int AS people,
           (SELECT COUNT(DISTINCT employee_id)::int FROM exclusive_days) AS unique_employees
    FROM exclusive_days
    WHERE bucket IS NOT NULL
    GROUP BY bucket
  `;

  try {
    const [rows] = await sequelize.query(sql, {
      replacements: {
        tenantId,
        monthStart: empty.monthStart,
        monthEnd: empty.monthEnd,
      },
    });
    return buildMonthPresenceMix(rows || [], now);
  } catch {
    try {
      const [rows] = await sequelize.query(`
        SELECT bucket, days, people
        FROM (
          SELECT
            CASE
              WHEN LOWER(COALESCE(status::text, '')) IN (${masuk}) THEN 'masuk'
              WHEN LOWER(COALESCE(status::text, '')) IN (${izinAtt}) THEN 'izin'
              WHEN LOWER(COALESCE(status::text, '')) IN (${cutiAtt}) THEN 'cuti'
              ELSE NULL
            END AS bucket,
            COUNT(*)::int AS days,
            COUNT(DISTINCT employee_id)::int AS people
          FROM employee_attendance
          WHERE tenant_id = :tenantId
            AND date >= :monthStart::date
            AND date <= :monthEnd::date
          GROUP BY 1
        ) t
        WHERE bucket IS NOT NULL
      `, {
        replacements: {
          tenantId,
          monthStart: empty.monthStart,
          monthEnd: empty.monthEnd,
        },
      });
      return buildMonthPresenceMix(rows || [], now);
    } catch {
      return empty;
    }
  }
}
