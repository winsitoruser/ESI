/**
 * Admin Total — approval workflow for sensitive commercial actions (spec §16).
 */
import { randomUUID } from 'crypto';
import { logAdminAction } from '@/lib/saas/admin-audit';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;

export const APPROVAL_KINDS = [
  'refund', 'discount', 'price_change', 'data_deletion', 'subscription_adjust', 'manual_finance',
] as const;
export type ApprovalKind = (typeof APPROVAL_KINDS)[number];

export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'executed'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

/** Refunds at or above this amount require a second operator. */
export const LARGE_REFUND_IDR = 5_000_000;

export type PlatformApproval = {
  id: string;
  kind: ApprovalKind;
  status: ApprovalStatus;
  title: string;
  detail: string | null;
  amountIdr: number;
  resourceType: string | null;
  resourceId: string | null;
  requestedBy: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
  meta: Record<string, unknown>;
};

function pick<T extends string>(raw: unknown, allowed: readonly T[], fallback: T): T {
  const v = String(raw || '').toLowerCase() as T;
  return allowed.includes(v) ? v : fallback;
}

export function refundNeedsApproval(amountIdr: number): boolean {
  return Number(amountIdr || 0) >= LARGE_REFUND_IDR;
}

export async function ensureApprovalsTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_platform_approvals (
      id UUID PRIMARY KEY,
      kind VARCHAR(40) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      title VARCHAR(200) NOT NULL,
      detail TEXT,
      amount_idr BIGINT NOT NULL DEFAULT 0,
      resource_type VARCHAR(40),
      resource_id VARCHAR(80),
      requested_by VARCHAR(160),
      decided_by VARCHAR(160),
      decided_at TIMESTAMPTZ,
      meta JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_platform_approvals_status
    ON saas_platform_approvals (status, created_at DESC)
  `);
  ready = true;
}

function mapRow(r: any): PlatformApproval {
  let meta: Record<string, unknown> = {};
  try {
    meta = typeof r.meta === 'string' ? JSON.parse(r.meta) : (r.meta || {});
  } catch { /* */ }
  return {
    id: String(r.id),
    kind: pick(r.kind, APPROVAL_KINDS, 'manual_finance'),
    status: pick(r.status, APPROVAL_STATUSES, 'pending'),
    title: r.title || '',
    detail: r.detail || null,
    amountIdr: Number(r.amount_idr || 0),
    resourceType: r.resource_type || null,
    resourceId: r.resource_id || null,
    requestedBy: r.requested_by || null,
    decidedBy: r.decided_by || null,
    decidedAt: r.decided_at || null,
    createdAt: r.created_at,
    meta,
  };
}

export async function listApprovals(opts?: {
  status?: string;
  limit?: number;
}): Promise<{ items: PlatformApproval[]; pendingCount: number }> {
  if (!sequelize) return { items: [], pendingCount: 0 };
  await ensureApprovalsTable();
  const lim = Math.min(200, Math.max(1, Number(opts?.limit) || 80));
  const status = opts?.status && opts.status !== 'all'
    ? pick(opts.status, APPROVAL_STATUSES, 'pending')
    : null;
  const [rows] = await sequelize.query(`
    SELECT * FROM saas_platform_approvals
    WHERE (:status::text IS NULL OR status = :status)
    ORDER BY
      CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
      created_at DESC
    LIMIT :lim
  `, { replacements: { status, lim } });
  const [open] = await sequelize.query(`
    SELECT COUNT(*)::int AS c FROM saas_platform_approvals WHERE status = 'pending'
  `);
  return { items: (rows || []).map(mapRow), pendingCount: open?.[0]?.c || 0 };
}

export async function createApproval(input: {
  kind: string;
  title: string;
  detail?: string | null;
  amountIdr?: number;
  resourceType?: string | null;
  resourceId?: string | null;
  requestedBy?: string | null;
  meta?: Record<string, unknown>;
  actorUserId?: string | null;
  ip?: string | null;
}): Promise<PlatformApproval> {
  if (!sequelize) throw new Error('Database unavailable');
  const title = String(input.title || '').trim().slice(0, 200);
  if (!title) throw new Error('Judul approval wajib');
  await ensureApprovalsTable();
  const id = randomUUID();
  const kind = pick(input.kind, APPROVAL_KINDS, 'manual_finance');
  await sequelize.query(`
    INSERT INTO saas_platform_approvals
      (id, kind, title, detail, amount_idr, resource_type, resource_id, requested_by, meta)
    VALUES
      (:id, :kind, :title, :detail, :amount, :rtype, :rid, :req, CAST(:meta AS jsonb))
  `, {
    replacements: {
      id,
      kind,
      title,
      detail: String(input.detail || '').trim().slice(0, 4000) || null,
      amount: Math.max(0, Math.round(Number(input.amountIdr) || 0)),
      rtype: input.resourceType || null,
      rid: input.resourceId || null,
      req: input.requestedBy || null,
      meta: JSON.stringify(input.meta || {}),
    },
  });
  await logAdminAction({
    actorEmail: input.requestedBy,
    actorUserId: input.actorUserId,
    action: 'approval.create',
    resourceType: 'approval',
    resourceId: id,
    ip: input.ip,
    meta: { kind, title },
  });
  const [rows] = await sequelize.query(`SELECT * FROM saas_platform_approvals WHERE id = :id`, { replacements: { id } });
  return mapRow(rows[0]);
}

export async function decideApproval(input: {
  id: string;
  decision: 'approved' | 'rejected';
  decidedBy: string;
  actorUserId?: string | null;
  ip?: string | null;
}): Promise<PlatformApproval | null> {
  if (!sequelize) throw new Error('Database unavailable');
  const id = String(input.id || '').trim();
  const decision = input.decision === 'rejected' ? 'rejected' : 'approved';
  await ensureApprovalsTable();
  const [rows] = await sequelize.query(`
    UPDATE saas_platform_approvals
    SET status = :decision, decided_by = :by, decided_at = NOW(), updated_at = NOW()
    WHERE id = :id AND status = 'pending'
    RETURNING *
  `, { replacements: { id, decision, by: input.decidedBy } });
  if (!rows?.[0]) return null;
  await logAdminAction({
    actorEmail: input.decidedBy,
    actorUserId: input.actorUserId,
    action: decision === 'approved' ? 'approval.approve' : 'approval.reject',
    resourceType: 'approval',
    resourceId: id,
    ip: input.ip,
  });
  return mapRow(rows[0]);
}

export async function markApprovalExecuted(id: string) {
  if (!sequelize || !id) return;
  await sequelize.query(`
    UPDATE saas_platform_approvals
    SET status = 'executed', updated_at = NOW()
    WHERE id = :id AND status = 'approved'
  `, { replacements: { id } });
}
