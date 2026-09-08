/**
 * Admin Total — finance / transaction control (spec §8, §12 promo stays in Billing).
 */
import { logAdminAction } from '@/lib/saas/admin-audit';
import { ensureBillingOrdersTable } from '@/lib/saas/humanify-billing';
import {
  createApproval,
  LARGE_REFUND_IDR,
  markApprovalExecuted,
  refundNeedsApproval,
} from '@/lib/saas/platform-approvals';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export type FinanceTx = {
  id: string;
  orderCode: string | null;
  tenantId: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  plan: string | null;
  amountIdr: number;
  status: string;
  provider: string | null;
  paidAt: string | null;
  createdAt: string | null;
};

function mapTx(r: any): FinanceTx {
  return {
    id: String(r.id),
    orderCode: r.order_code || null,
    tenantId: r.tenant_id || null,
    tenantName: r.tenant_name || r.tenant_slug || null,
    tenantSlug: r.tenant_slug || null,
    plan: r.plan || null,
    amountIdr: Number(r.amount_idr || 0),
    status: String(r.status || '').toLowerCase(),
    provider: r.provider || null,
    paidAt: r.paid_at || null,
    createdAt: r.created_at || null,
  };
}

export async function listFinanceTransactions(limit = 120): Promise<{
  rows: FinanceTx[];
  counts: { paid: number; pending: number; failed: number; refunded: number; revenueIdr: number };
}> {
  if (!sequelize) {
    return { rows: [], counts: { paid: 0, pending: 0, failed: 0, refunded: 0, revenueIdr: 0 } };
  }
  await ensureBillingOrdersTable();
  const lim = Math.min(300, Math.max(1, limit));
  const [rows] = await sequelize.query(`
    SELECT o.id, o.order_code, o.tenant_id, o.plan, o.amount_idr, o.status, o.provider,
           o.paid_at, o.created_at, t.slug AS tenant_slug, t.slug AS tenant_name
    FROM saas_billing_orders o
    LEFT JOIN tenants t ON t.id = o.tenant_id
    ORDER BY COALESCE(o.paid_at, o.created_at) DESC NULLS LAST
    LIMIT :lim
  `, { replacements: { lim } });
  const mapped = (rows || []).map(mapTx);
  const paid = mapped.filter((r) => r.status === 'paid');
  const pending = mapped.filter((r) => ['pending', 'unpaid', 'challenge'].includes(r.status));
  const failed = mapped.filter((r) => ['failed', 'expire', 'deny', 'cancel'].includes(r.status));
  const refunded = mapped.filter((r) => r.status === 'refunded');
  return {
    rows: mapped,
    counts: {
      paid: paid.length,
      pending: pending.length,
      failed: failed.length,
      refunded: refunded.length,
      revenueIdr: paid.reduce((n, r) => n + r.amountIdr, 0),
    },
  };
}

async function markOrderRefunded(orderId: string) {
  await sequelize.query(`
    UPDATE saas_billing_orders
    SET status = 'refunded', updated_at = NOW()
    WHERE (id::text = :id OR order_code = :id)
      AND LOWER(status) = 'paid'
  `, { replacements: { id: orderId } });
}

export async function requestRefund(input: {
  orderId: string;
  actorEmail: string;
  actorUserId?: string | null;
  ip?: string | null;
}): Promise<{ immediate: boolean; approvalId?: string; message: string }> {
  if (!sequelize) throw new Error('Database unavailable');
  const orderId = String(input.orderId || '').trim();
  if (!orderId) throw new Error('orderId required');
  await ensureBillingOrdersTable();
  const [rows] = await sequelize.query(`
    SELECT id, order_code, amount_idr, status, tenant_id
    FROM saas_billing_orders
    WHERE id::text = :id OR order_code = :id
    LIMIT 1
  `, { replacements: { id: orderId } });
  const order = rows?.[0];
  if (!order) throw new Error('Transaksi tidak ditemukan');
  if (String(order.status).toLowerCase() !== 'paid') {
    throw new Error('Refund hanya untuk transaksi paid');
  }
  const amount = Number(order.amount_idr || 0);
  if (refundNeedsApproval(amount)) {
    const approval = await createApproval({
      kind: 'refund',
      title: `Refund ${order.order_code || order.id}`,
      detail: `Nominal Rp ${amount.toLocaleString('id-ID')} ≥ ambang ${LARGE_REFUND_IDR.toLocaleString('id-ID')}`,
      amountIdr: amount,
      resourceType: 'billing_order',
      resourceId: String(order.id),
      requestedBy: input.actorEmail,
      actorUserId: input.actorUserId,
      ip: input.ip,
      meta: { orderCode: order.order_code, tenantId: order.tenant_id },
    });
    return {
      immediate: false,
      approvalId: approval.id,
      message: 'Refund besar menunggu persetujuan di modul Approval',
    };
  }
  await markOrderRefunded(String(order.id));
  await logAdminAction({
    tenantId: order.tenant_id || null,
    actorEmail: input.actorEmail,
    actorUserId: input.actorUserId,
    action: 'finance.refund',
    resourceType: 'billing_order',
    resourceId: String(order.id),
    ip: input.ip,
    meta: { amount, immediate: true },
  });
  return { immediate: true, message: 'Refund diproses' };
}

export async function executeApprovedRefund(approvalId: string, actorEmail: string) {
  if (!sequelize) throw new Error('Database unavailable');
  const [rows] = await sequelize.query(
    `SELECT * FROM saas_platform_approvals WHERE id = :id LIMIT 1`,
    { replacements: { id: approvalId } },
  );
  const row = rows?.[0];
  if (!row) throw new Error('Approval tidak ditemukan');
  if (String(row.kind) !== 'refund') throw new Error('Bukan approval refund');
  if (!['approved', 'executed'].includes(String(row.status))) {
    throw new Error('Approval belum disetujui');
  }
  if (row.resource_id) await markOrderRefunded(String(row.resource_id));
  await markApprovalExecuted(approvalId);
  await logAdminAction({
    actorEmail,
    action: 'finance.refund',
    resourceType: 'billing_order',
    resourceId: String(row.resource_id || ''),
    meta: { approvalId, amount: Number(row.amount_idr || 0) },
  });
}

export { LARGE_REFUND_IDR, refundNeedsApproval };
