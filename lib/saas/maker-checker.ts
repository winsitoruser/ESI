/**
 * Maker-checker for critical HR mutations (salary / bank).
 * SEC-ABU-016 / SEC-ABU-017
 *
 * Flow:
 * 1. Maker submits → row status=pending (no live apply)
 * 2. Checker (different user, elevated role) approves → apply callback runs
 * 3. Audit before/after stored on the request + saas_admin_audit
 */
import crypto from 'crypto';
import { logAdminAction } from './admin-audit';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;

export async function ensureMakerCheckerTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_maker_checker (
      id UUID PRIMARY KEY,
      tenant_id UUID,
      kind VARCHAR(64) NOT NULL,
      resource_type VARCHAR(40),
      resource_id VARCHAR(80),
      status VARCHAR(24) NOT NULL DEFAULT 'pending',
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      before_value JSONB,
      after_value JSONB,
      maker_user_id VARCHAR(64),
      maker_email VARCHAR(255),
      checker_user_id VARCHAR(64),
      checker_email VARCHAR(255),
      reject_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      decided_at TIMESTAMPTZ
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_maker_checker_tenant_status
    ON saas_maker_checker (tenant_id, status, created_at DESC)
  `);
  ready = true;
}

const CHECKER_ROLES = new Set([
  'owner', 'hq_admin', 'hr_admin', 'super_admin', 'superadmin', 'platform_admin', 'finance',
]);

export function canActAsChecker(role?: string | null): boolean {
  return CHECKER_ROLES.has(String(role || '').toLowerCase());
}

export async function submitMakerRequest(opts: {
  tenantId?: string | null;
  kind: string;
  resourceType?: string;
  resourceId?: string;
  payload: Record<string, unknown>;
  beforeValue?: Record<string, unknown> | null;
  makerUserId?: string | null;
  makerEmail?: string | null;
}): Promise<{ id: string; status: 'pending' }> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureMakerCheckerTable();
  const id = crypto.randomUUID();
  await sequelize.query(`
    INSERT INTO saas_maker_checker
      (id, tenant_id, kind, resource_type, resource_id, status, payload, before_value, maker_user_id, maker_email)
    VALUES
      (:id, :tid, :kind, :rtype, :rid, 'pending', CAST(:payload AS jsonb), CAST(:before AS jsonb), :uid, :email)
  `, {
    replacements: {
      id,
      tid: opts.tenantId || null,
      kind: opts.kind,
      rtype: opts.resourceType || null,
      rid: opts.resourceId || null,
      payload: JSON.stringify(opts.payload || {}),
      before: JSON.stringify(opts.beforeValue || null),
      uid: opts.makerUserId ? String(opts.makerUserId) : null,
      email: opts.makerEmail || null,
    },
  });
  await logAdminAction({
    tenantId: opts.tenantId,
    actorUserId: opts.makerUserId,
    actorEmail: opts.makerEmail,
    action: 'maker_checker.submit',
    resourceType: opts.resourceType,
    resourceId: opts.resourceId || id,
    meta: { kind: opts.kind, requestId: id },
  });
  return { id, status: 'pending' };
}

export async function decideMakerRequest(opts: {
  requestId: string;
  approve: boolean;
  checkerUserId?: string | null;
  checkerEmail?: string | null;
  checkerRole?: string | null;
  rejectReason?: string;
  apply?: (payload: Record<string, unknown>, before: Record<string, unknown> | null) => Promise<Record<string, unknown> | void>;
}): Promise<{ ok: boolean; status: string; error?: string; after?: unknown }> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureMakerCheckerTable();
  if (!canActAsChecker(opts.checkerRole)) {
    return { ok: false, status: 'forbidden', error: 'Role tidak berwenang sebagai checker' };
  }

  const [rows] = await sequelize.query(
    `SELECT * FROM saas_maker_checker WHERE id = :id LIMIT 1`,
    { replacements: { id: opts.requestId } },
  );
  const row = rows?.[0];
  if (!row) return { ok: false, status: 'missing', error: 'Request tidak ditemukan' };
  if (row.status !== 'pending') return { ok: false, status: row.status, error: 'Request sudah diputuskan' };
  if (opts.checkerUserId && String(row.maker_user_id) === String(opts.checkerUserId)) {
    return { ok: false, status: 'forbidden', error: 'Maker tidak boleh menjadi checker untuk request yang sama' };
  }

  if (!opts.approve) {
    await sequelize.query(`
      UPDATE saas_maker_checker
      SET status = 'rejected', reject_reason = :reason, checker_user_id = :uid, checker_email = :email, decided_at = NOW()
      WHERE id = :id AND status = 'pending'
    `, {
      replacements: {
        id: opts.requestId,
        reason: opts.rejectReason || null,
        uid: opts.checkerUserId ? String(opts.checkerUserId) : null,
        email: opts.checkerEmail || null,
      },
    });
    await logAdminAction({
      tenantId: row.tenant_id,
      actorUserId: opts.checkerUserId,
      actorEmail: opts.checkerEmail,
      action: 'maker_checker.reject',
      resourceType: row.resource_type,
      resourceId: row.resource_id || opts.requestId,
      meta: { kind: row.kind, requestId: opts.requestId, reason: opts.rejectReason },
    });
    return { ok: true, status: 'rejected' };
  }

  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {});
  const before = row.before_value
    ? (typeof row.before_value === 'string' ? JSON.parse(row.before_value) : row.before_value)
    : null;
  let after: Record<string, unknown> | null = null;
  if (opts.apply) {
    const applied = await opts.apply(payload, before);
    after = (applied as Record<string, unknown>) || payload;
  }

  await sequelize.query(`
    UPDATE saas_maker_checker
    SET status = 'approved', after_value = CAST(:after AS jsonb),
        checker_user_id = :uid, checker_email = :email, decided_at = NOW()
    WHERE id = :id AND status = 'pending'
  `, {
    replacements: {
      id: opts.requestId,
      after: JSON.stringify(after),
      uid: opts.checkerUserId ? String(opts.checkerUserId) : null,
      email: opts.checkerEmail || null,
    },
  });
  await logAdminAction({
    tenantId: row.tenant_id,
    actorUserId: opts.checkerUserId,
    actorEmail: opts.checkerEmail,
    action: 'maker_checker.approve',
    resourceType: row.resource_type,
    resourceId: row.resource_id || opts.requestId,
    meta: { kind: row.kind, requestId: opts.requestId, before, after },
  });
  return { ok: true, status: 'approved', after };
}

export async function listPendingMakerRequests(tenantId?: string | null, limit = 50) {
  if (!sequelize) return [];
  await ensureMakerCheckerTable();
  const [rows] = await sequelize.query(`
    SELECT * FROM saas_maker_checker
    WHERE status = 'pending'
      AND (:tid::uuid IS NULL OR tenant_id = :tid)
    ORDER BY created_at DESC
    LIMIT :lim
  `, { replacements: { tid: tenantId || null, lim: Math.min(100, Math.max(1, limit)) } });
  return rows || [];
}
