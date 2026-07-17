/**
 * Tenant admin audit log — payroll-sensitive, export, role, plan changes
 */
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;

export async function ensureAdminAuditTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_admin_audit (
      id UUID PRIMARY KEY,
      tenant_id UUID,
      actor_user_id VARCHAR(64),
      actor_email VARCHAR(255),
      action VARCHAR(64) NOT NULL,
      resource_type VARCHAR(40),
      resource_id VARCHAR(80),
      meta JSONB,
      ip VARCHAR(64),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_admin_audit_tenant_created
    ON saas_admin_audit (tenant_id, created_at DESC)
  `);
  ready = true;
}

export type AdminAuditAction =
  | 'account.export'
  | 'account.offboard_request'
  | 'billing.plan_change'
  | 'billing.checkout'
  | 'employee.delete'
  | 'employee.create'
  | 'role.change'
  | 'api_key.create'
  | 'api_key.revoke';

export async function logAdminAction(opts: {
  tenantId?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: AdminAuditAction | string;
  resourceType?: string | null;
  resourceId?: string | null;
  meta?: Record<string, unknown>;
  ip?: string | null;
}) {
  if (!sequelize) return;
  try {
    await ensureAdminAuditTable();
    await sequelize.query(`
      INSERT INTO saas_admin_audit
        (id, tenant_id, actor_user_id, actor_email, action, resource_type, resource_id, meta, ip)
      VALUES
        (:id, :tid, :uid, :email, :action, :rtype, :rid, CAST(:meta AS jsonb), :ip)
    `, {
      replacements: {
        id: crypto.randomUUID(),
        tid: opts.tenantId || null,
        uid: opts.actorUserId ? String(opts.actorUserId) : null,
        email: opts.actorEmail || null,
        action: String(opts.action),
        rtype: opts.resourceType || null,
        rid: opts.resourceId || null,
        meta: JSON.stringify(opts.meta || {}),
        ip: opts.ip || null,
      },
    });
  } catch (e: any) {
    console.warn('[admin-audit]', e?.message || e);
  }
}

export async function listAdminAudit(tenantId: string, limit = 50) {
  if (!sequelize) return [];
  await ensureAdminAuditTable();
  const lim = Math.min(200, Math.max(1, limit));
  const [rows] = await sequelize.query(`
    SELECT id, action, resource_type AS "resourceType", resource_id AS "resourceId",
      actor_email AS "actorEmail", meta, ip, created_at AS "createdAt"
    FROM saas_admin_audit
    WHERE tenant_id = :tid
    ORDER BY created_at DESC
    LIMIT :lim
  `, { replacements: { tid: tenantId, lim } });
  return rows || [];
}
