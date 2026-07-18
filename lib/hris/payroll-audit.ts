/**
 * Payroll event audit — approve / release / paid trail for fiscal GA.
 */
let sequelize: any;
try { sequelize = require('../sequelize'); } catch { /* */ }

let ready = false;

export async function ensurePayrollAuditTable(db?: any): Promise<boolean> {
  const seq = db || sequelize;
  if (!seq) return false;
  if (ready) return true;
  try {
    await seq.query(`
      CREATE TABLE IF NOT EXISTS payroll_audit_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        payroll_run_id UUID,
        event_type VARCHAR(40) NOT NULL,
        actor_id VARCHAR(64),
        actor_name VARCHAR(200),
        actor_email VARCHAR(200),
        details JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await seq.query(`CREATE INDEX IF NOT EXISTS idx_payroll_audit_tenant ON payroll_audit_events (tenant_id, created_at DESC)`);
    await seq.query(`CREATE INDEX IF NOT EXISTS idx_payroll_audit_run ON payroll_audit_events (payroll_run_id)`);
    ready = true;
    return true;
  } catch (e: any) {
    console.warn('[payroll-audit] ensure table:', e?.message || e);
    return false;
  }
}

export async function logPayrollAudit(opts: {
  tenantId: string | null;
  runId: string;
  eventType: 'approved' | 'status_change' | 'released' | 'paid' | 'payslip_view' | 'payslip_unlock' | 'fiscal_note';
  actorId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  details?: Record<string, unknown>;
  db?: any;
}): Promise<boolean> {
  const seq = opts.db || sequelize;
  if (!seq) return false;
  await ensurePayrollAuditTable(seq);
  try {
    await seq.query(
      `INSERT INTO payroll_audit_events
        (tenant_id, payroll_run_id, event_type, actor_id, actor_name, actor_email, details, created_at)
       VALUES (:tid, :runId, :etype, :aid, :aname, :aemail, :details::jsonb, NOW())`,
      {
        replacements: {
          tid: opts.tenantId,
          runId: opts.runId,
          etype: opts.eventType,
          aid: opts.actorId || null,
          aname: opts.actorName || null,
          aemail: opts.actorEmail || null,
          details: JSON.stringify(opts.details || {}),
        },
      }
    );
    return true;
  } catch (e: any) {
    console.warn('[payroll-audit] insert:', e?.message || e);
    return false;
  }
}

export const FISCAL_ENGINE = {
  version: '1.0.0',
  pph21: 'UU HPP progressive annual / 12 (lib/hris/pph21-calc.ts)',
  ptkp: 'TK/0–K/3 annual PTKP table',
  disclaimer: 'Engine fixtures ≠ DJP e-Bupot certification. Finance sign-off required for fiscal GA.',
  checklistDoc: '/docs/humanify-payroll-fiscal-signoff.md',
  smoke: 'npm run smoke:payroll-fiscal',
};
