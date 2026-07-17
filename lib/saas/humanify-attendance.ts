/**
 * Lean attendance summary for public API v1
 */
let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

function defaultPeriod() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export async function getTenantAttendanceSummary(
  tenantId: string,
  opts?: { startDate?: string; endDate?: string },
): Promise<{
  period: { start: string; end: string };
  totals: { present: number; late: number; absent: number; records: number };
  byDay: Array<{ date: string; present: number; late: number }>;
}> {
  const period = {
    start: opts?.startDate || defaultPeriod().start,
    end: opts?.endDate || defaultPeriod().end,
  };
  const empty = {
    period,
    totals: { present: 0, late: 0, absent: 0, records: 0 },
    byDay: [] as Array<{ date: string; present: number; late: number }>,
  };
  if (!sequelize) return empty;

  try {
    const [totals] = await sequelize.query(`
      SELECT
        COUNT(*)::int AS records,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(status::text, '')) IN ('present','hadir','ok','on_time'))::int AS present,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(status::text, '')) IN ('late','terlambat'))::int AS late,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(status::text, '')) IN ('absent','alpha','tidak_hadir'))::int AS absent
      FROM attendances
      WHERE tenant_id = :tid
        AND COALESCE(attendance_date, date, created_at::date) BETWEEN :start::date AND :end::date
    `, { replacements: { tid: tenantId, start: period.start, end: period.end } });

    const [byDay] = await sequelize.query(`
      SELECT
        COALESCE(attendance_date, date, created_at::date)::text AS date,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(status::text, '')) IN ('present','hadir','ok','on_time'))::int AS present,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(status::text, '')) IN ('late','terlambat'))::int AS late
      FROM attendances
      WHERE tenant_id = :tid
        AND COALESCE(attendance_date, date, created_at::date) BETWEEN :start::date AND :end::date
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 60
    `, { replacements: { tid: tenantId, start: period.start, end: period.end } });

    const t = totals?.[0] || {};
    return {
      period,
      totals: {
        present: t.present || 0,
        late: t.late || 0,
        absent: t.absent || 0,
        records: t.records || 0,
      },
      byDay: byDay || [],
    };
  } catch {
    // Schema drift — try alternate table name
    try {
      const [totals] = await sequelize.query(`
        SELECT COUNT(*)::int AS records
        FROM attendance_records
        WHERE tenant_id = :tid
          AND COALESCE(work_date, created_at::date) BETWEEN :start::date AND :end::date
      `, { replacements: { tid: tenantId, start: period.start, end: period.end } });
      return {
        period,
        totals: {
          present: 0,
          late: 0,
          absent: 0,
          records: totals?.[0]?.records || 0,
        },
        byDay: [],
      };
    } catch {
      return empty;
    }
  }
}
