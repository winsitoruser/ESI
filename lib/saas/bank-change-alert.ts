/**
 * SEC-ABU-018 — flag bank-account changes pending next payroll run.
 */
import crypto from 'crypto';
import { logAdminAction } from '@/lib/saas/admin-audit';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;

export async function ensureBankChangeAlertTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_bank_change_alerts (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL,
      employee_id UUID,
      actor_user_id VARCHAR(64),
      before_account VARCHAR(64),
      after_account VARCHAR(64),
      bank_name VARCHAR(120),
      acknowledged BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_bank_change_tenant
    ON saas_bank_change_alerts (tenant_id, acknowledged, created_at DESC)
  `);
  ready = true;
}

function maskAcc(v: string | null | undefined): string {
  const s = String(v || '').replace(/\s/g, '');
  if (s.length < 4) return '****';
  return `${'*'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
}

export async function recordBankAccountChange(opts: {
  tenantId: string;
  employeeId?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  beforeAccount?: string | null;
  afterAccount?: string | null;
  bankName?: string | null;
}): Promise<void> {
  if (!sequelize) return;
  const before = String(opts.beforeAccount || '').trim();
  const after = String(opts.afterAccount || '').trim();
  if (!after || before === after) return;

  try {
    await ensureBankChangeAlertTable();
    const id = crypto.randomUUID();
    await sequelize.query(`
      INSERT INTO saas_bank_change_alerts
        (id, tenant_id, employee_id, actor_user_id, before_account, after_account, bank_name)
      VALUES
        (:id, :tid, :eid, :uid, :before, :after, :bank)
    `, {
      replacements: {
        id,
        tid: opts.tenantId,
        eid: opts.employeeId || null,
        uid: opts.actorUserId || null,
        before: maskAcc(before),
        after: maskAcc(after),
        bank: opts.bankName || null,
      },
    });
    await logAdminAction({
      tenantId: opts.tenantId,
      actorUserId: opts.actorUserId,
      actorEmail: opts.actorEmail,
      action: 'payroll.bank_change_alert',
      resourceType: 'employee_salary',
      resourceId: opts.employeeId || null,
      meta: { before: maskAcc(before), after: maskAcc(after), bank: opts.bankName },
    });
  } catch (e: any) {
    console.warn('[bank-change-alert]', e?.message || e);
  }
}

export async function listUnackedBankChanges(tenantId: string, limit = 50) {
  if (!sequelize) return [];
  await ensureBankChangeAlertTable();
  const [rows] = await sequelize.query(`
    SELECT id, employee_id, before_account, after_account, bank_name, created_at
    FROM saas_bank_change_alerts
    WHERE tenant_id = :tid AND acknowledged = false
    ORDER BY created_at DESC
    LIMIT :lim
  `, { replacements: { tid: tenantId, lim: Math.min(100, Math.max(1, limit)) } });
  return rows || [];
}
