/**
 * Wave 6 — SEC-ABU-019 duplicate reimbursement/claim detection
 */
let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export type DuplicateClaimHit = {
  id: string;
  amount: number;
  claim_type: string;
  created_at: string;
};

export async function findDuplicateClaims(opts: {
  tenantId: string;
  employeeId: string;
  amount: number;
  claimType: string;
  windowHours?: number;
}): Promise<DuplicateClaimHit[]> {
  if (!sequelize) return [];
  const hours = Math.max(1, Math.min(168, opts.windowHours ?? 48));
  try {
    const [rows] = await sequelize.query(`
      SELECT id::text AS id, amount::float AS amount, claim_type, created_at::text AS created_at
      FROM employee_claims
      WHERE tenant_id = :tid
        AND employee_id = :eid
        AND claim_type = :ctype
        AND ABS(amount - :amt) < 0.01
        AND status NOT IN ('rejected', 'cancelled')
        AND created_at > NOW() - (:hours * INTERVAL '1 hour')
      ORDER BY created_at DESC
      LIMIT 5
    `, {
      replacements: {
        tid: opts.tenantId,
        eid: opts.employeeId,
        ctype: opts.claimType,
        amt: Number(opts.amount),
        hours,
      },
    });
    return (rows || []) as DuplicateClaimHit[];
  } catch {
    return [];
  }
}

export function isDuplicateBlocked(): boolean {
  return String(process.env.HUMANIFY_CLAIM_DUP_BLOCK || 'true').toLowerCase() !== 'false';
}
