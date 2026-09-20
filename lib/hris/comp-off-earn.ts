/**
 * Compensation leave (cuti pengganti / comp-off) — earn balance from approved OT / holiday work.
 * Aligns with FlowHCM compensatory leave accrual.
 */
import {
  leaveBalanceCreditSql,
  resolveLeaveBalanceColMode,
} from '@/lib/hris/leave-balance-columns';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch { sequelize = null; }

/** Default: 8 jam OT = 1 hari cuti pengganti */
export function hoursToCompOffDays(hours: number, hoursPerDay = 8): number {
  const h = Number(hours) || 0;
  if (h <= 0) return 0;
  return Math.round((h / hoursPerDay) * 100) / 100;
}

export async function ensureCompOffLeaveType(tenantId: string): Promise<string | null> {
  if (!sequelize || !tenantId) return null;
  const [existing] = await sequelize.query(
    `SELECT id FROM leave_types
     WHERE tenant_id = :tid AND (code = 'comp_off' OR LOWER(name) LIKE '%pengganti%')
     LIMIT 1`,
    { replacements: { tid: tenantId } },
  );
  if (existing?.[0]?.id) return String(existing[0].id);

  try {
    const [rows] = await sequelize.query(
      `INSERT INTO leave_types (id, tenant_id, code, name, category, max_days_per_year, color, is_active, sort_order, created_at, updated_at)
       VALUES (uuid_generate_v4(), :tid, 'comp_off', 'Cuti Pengganti (Comp-Off)', 'compensatory', 30, '#06b6d4', true, 50, NOW(), NOW())
       ON CONFLICT DO NOTHING
       RETURNING id`,
      { replacements: { tid: tenantId } },
    );
    if (rows?.[0]?.id) return String(rows[0].id);
  } catch {
    /* schema may lack tenant_id or unique — fall through */
  }

  const [again] = await sequelize.query(
    `SELECT id FROM leave_types WHERE code = 'comp_off' LIMIT 1`,
  ).catch(() => [[]]);
  return again?.[0]?.id ? String(again[0].id) : null;
}

/**
 * Credit comp-off balance after overtime (or holiday work) is approved.
 * Returns days credited, or 0 if skipped.
 */
export async function creditCompOffFromOvertime(opts: {
  tenantId: string;
  employeeId: string;
  hours: number;
  overtimeId?: string;
  dayType?: string;
}): Promise<{ creditedDays: number; leaveTypeId: string | null }> {
  if (!sequelize || !opts.tenantId || !opts.employeeId) {
    return { creditedDays: 0, leaveTypeId: null };
  }

  const hours = Number(opts.hours) || 0;
  // Accrue on weekend/holiday OT always; weekday OT only if >= 4h (policy default)
  const dayType = String(opts.dayType || '').toLowerCase();
  const isHolidayLike = ['weekend', 'holiday', 'off', 'libur'].some((k) => dayType.includes(k));
  if (!isHolidayLike && hours < 4) return { creditedDays: 0, leaveTypeId: null };

  const days = hoursToCompOffDays(hours);
  if (days <= 0) return { creditedDays: 0, leaveTypeId: null };

  const leaveTypeId = await ensureCompOffLeaveType(opts.tenantId);
  if (!leaveTypeId) return { creditedDays: 0, leaveTypeId: null };

  const year = new Date().getFullYear();
  const colMode = await resolveLeaveBalanceColMode();
  const sql = leaveBalanceCreditSql(colMode === 'short' ? 'short' : 'days');
  const replacements = {
    tid: opts.tenantId,
    eid: String(opts.employeeId),
    ltid: leaveTypeId,
    year,
    days,
  };
  try {
    await sequelize.query(sql.insert, { replacements });
    return { creditedDays: days, leaveTypeId };
  } catch {
    try {
      await sequelize.query(sql.update, { replacements });
      return { creditedDays: days, leaveTypeId };
    } catch {
      // Last resort: try the other column mode
      try {
        const alt = leaveBalanceCreditSql(colMode === 'short' ? 'days' : 'short');
        await sequelize.query(alt.insert, { replacements });
        return { creditedDays: days, leaveTypeId };
      } catch {
        return { creditedDays: 0, leaveTypeId };
      }
    }
  }
}
