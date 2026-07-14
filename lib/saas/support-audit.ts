/**
 * Humanify SaaS Phase 5b — support impersonation audit log
 */
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;

export async function ensureSupportAuditTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_support_audit (
      id UUID PRIMARY KEY,
      operator_user_id VARCHAR(64) NOT NULL,
      operator_email VARCHAR(255),
      action VARCHAR(40) NOT NULL,
      tenant_id UUID,
      tenant_slug VARCHAR(64),
      meta JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_support_audit_created
    ON saas_support_audit (created_at DESC)
  `);
  ready = true;
}

export async function logSupportAction(opts: {
  operatorUserId: string;
  operatorEmail?: string | null;
  action: 'impersonate_start' | 'impersonate_end';
  tenantId?: string | null;
  tenantSlug?: string | null;
  meta?: Record<string, unknown>;
}) {
  if (!sequelize) return;
  await ensureSupportAuditTable();
  await sequelize.query(`
    INSERT INTO saas_support_audit
      (id, operator_user_id, operator_email, action, tenant_id, tenant_slug, meta)
    VALUES
      (:id, :uid, :email, :action, :tid, :slug, CAST(:meta AS jsonb))
  `, {
    replacements: {
      id: crypto.randomUUID(),
      uid: String(opts.operatorUserId),
      email: opts.operatorEmail || null,
      action: opts.action,
      tid: opts.tenantId || null,
      slug: opts.tenantSlug || null,
      meta: JSON.stringify(opts.meta || {}),
    },
  });
}
