/**
 * leave_balances schema varies: model/canonical uses entitled_days/used_days/pending_days;
 * some prod rows use entitled/used/pending/remaining. Resolve once per process.
 */
let sequelize: any;
try { sequelize = require('../sequelize'); } catch { sequelize = null; }

export type LeaveBalanceColMode = 'days' | 'short' | 'unknown';

let cachedMode: LeaveBalanceColMode | null = null;

export async function resolveLeaveBalanceColMode(): Promise<LeaveBalanceColMode> {
  if (cachedMode) return cachedMode;
  if (!sequelize) return 'unknown';
  try {
    const [cols] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'leave_balances'
        AND column_name IN ('entitled_days', 'entitled', 'used_days', 'used', 'pending_days', 'pending', 'remaining')
    `);
    const names = new Set((cols || []).map((c: any) => String(c.column_name)));
    if (names.has('entitled_days') || names.has('used_days')) {
      cachedMode = 'days';
    } else if (names.has('entitled') || names.has('used')) {
      cachedMode = 'short';
    } else {
      cachedMode = 'unknown';
    }
  } catch {
    cachedMode = 'unknown';
  }
  return cachedMode;
}

/** SELECT list: total, used, pending, remaining (aliases). */
export function leaveBalanceSelectExprs(mode: LeaveBalanceColMode): string {
  if (mode === 'short') {
    return `
      COALESCE(lb.entitled, 0) AS total,
      COALESCE(lb.used, 0) AS used,
      COALESCE(lb.pending, 0) AS pending,
      COALESCE(lb.remaining,
        COALESCE(lb.entitled, 0) - COALESCE(lb.used, 0) - COALESCE(lb.pending, 0)
      ) AS remaining`;
  }
  // days (canonical) or unknown — prefer *_days
  return `
    COALESCE(lb.entitled_days, 0) AS total,
    COALESCE(lb.used_days, 0) AS used,
    COALESCE(lb.pending_days, 0) AS pending,
    (COALESCE(lb.entitled_days, 0) - COALESCE(lb.used_days, 0) - COALESCE(lb.pending_days, 0)) AS remaining`;
}

export function leaveBalanceRemainingExpr(mode: LeaveBalanceColMode): string {
  if (mode === 'short') {
    return `COALESCE(lb.remaining,
      COALESCE(lb.entitled, 0) - COALESCE(lb.used, 0) - COALESCE(lb.pending, 0))`;
  }
  return `(COALESCE(lb.entitled_days, 0) - COALESCE(lb.used_days, 0) - COALESCE(lb.pending_days, 0))`;
}

export function leaveBalanceAdjustSql(
  mode: LeaveBalanceColMode,
  modeOp: 'add' | 'remove' | 'approve',
): string {
  if (mode === 'short') {
    if (modeOp === 'add') {
      return `UPDATE leave_balances SET
        pending = COALESCE(pending, 0) + :days,
        remaining = GREATEST(0, COALESCE(remaining, entitled, 0) - COALESCE(used, 0) - (COALESCE(pending, 0) + :days)),
        updated_at = NOW()
      WHERE employee_id::text = :empId AND year = :year
        AND leave_type_id = (SELECT id FROM leave_types WHERE code = :code LIMIT 1)`;
    }
    if (modeOp === 'remove') {
      return `UPDATE leave_balances SET
        pending = GREATEST(0, COALESCE(pending, 0) - :days),
        updated_at = NOW()
      WHERE employee_id::text = :empId AND year = :year
        AND leave_type_id = (SELECT id FROM leave_types WHERE code = :code LIMIT 1)`;
    }
    return `UPDATE leave_balances SET
      pending = GREATEST(0, COALESCE(pending, 0) - :days),
      used = COALESCE(used, 0) + :days,
      remaining = GREATEST(0, COALESCE(remaining, entitled, 0) - (COALESCE(used, 0) + :days) - GREATEST(0, COALESCE(pending, 0) - :days)),
      updated_at = NOW()
    WHERE employee_id::text = :empId AND year = :year
      AND leave_type_id = (SELECT id FROM leave_types WHERE code = :code LIMIT 1)`;
  }

  // entitled_days schema
  if (modeOp === 'add') {
    return `UPDATE leave_balances SET
      pending_days = COALESCE(pending_days, 0) + :days,
      updated_at = NOW()
    WHERE employee_id::text = :empId AND year = :year
      AND leave_type_id = (SELECT id FROM leave_types WHERE code = :code LIMIT 1)`;
  }
  if (modeOp === 'remove') {
    return `UPDATE leave_balances SET
      pending_days = GREATEST(0, COALESCE(pending_days, 0) - :days),
      updated_at = NOW()
    WHERE employee_id::text = :empId AND year = :year
      AND leave_type_id = (SELECT id FROM leave_types WHERE code = :code LIMIT 1)`;
  }
  return `UPDATE leave_balances SET
    pending_days = GREATEST(0, COALESCE(pending_days, 0) - :days),
    used_days = COALESCE(used_days, 0) + :days,
    updated_at = NOW()
  WHERE employee_id::text = :empId AND year = :year
    AND leave_type_id = (SELECT id FROM leave_types WHERE code = :code LIMIT 1)`;
}

/** Credit entitled days — dual-write friendly. */
export function leaveBalanceCreditSql(mode: LeaveBalanceColMode): {
  insert: string;
  update: string;
} {
  if (mode === 'short') {
    return {
      insert: `INSERT INTO leave_balances (id, tenant_id, employee_id, leave_type_id, year, entitled, used, pending, remaining, created_at, updated_at)
        VALUES (uuid_generate_v4(), :tid, :eid, :ltid, :year, :days, 0, 0, :days, NOW(), NOW())
        ON CONFLICT (employee_id, leave_type_id, year)
        DO UPDATE SET entitled = COALESCE(leave_balances.entitled, 0) + :days,
                      remaining = COALESCE(leave_balances.remaining, leave_balances.entitled, 0) + :days,
                      updated_at = NOW()`,
      update: `UPDATE leave_balances SET
        entitled = COALESCE(entitled, 0) + :days,
        remaining = COALESCE(remaining, entitled, 0) + :days,
        updated_at = NOW()
       WHERE employee_id = :eid AND leave_type_id = :ltid AND year = :year`,
    };
  }
  return {
    insert: `INSERT INTO leave_balances (id, tenant_id, employee_id, leave_type_id, year, entitled_days, used_days, pending_days, created_at, updated_at)
      VALUES (uuid_generate_v4(), :tid, :eid, :ltid, :year, :days, 0, 0, NOW(), NOW())
      ON CONFLICT (employee_id, leave_type_id, year)
      DO UPDATE SET entitled_days = COALESCE(leave_balances.entitled_days, 0) + :days,
                    updated_at = NOW()`,
    update: `UPDATE leave_balances SET entitled_days = COALESCE(entitled_days, 0) + :days, updated_at = NOW()
     WHERE employee_id = :eid AND leave_type_id = :ltid AND year = :year`,
  };
}
