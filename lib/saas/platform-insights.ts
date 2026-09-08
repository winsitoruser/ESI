/**
 * Admin Total — rule-based business insights (spec §21 Phase 4 lite, no LLM).
 */
import { listSubscriptions } from '@/lib/saas/platform-subscriptions';
import { getSupportQueue } from '@/lib/saas/platform-ops-modules';
import { listApprovals } from '@/lib/saas/platform-approvals';
import { pipelineTotals, listSalesLeads } from '@/lib/saas/sales-leads';
import { listPlatformAudit } from '@/lib/saas/admin-audit';

export type InsightCard = {
  id: string;
  tone: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  detail: string;
  href: string;
};

export function forecastRevenue(mrrIdr: number, months: number, growthPct: number): number {
  const g = Number.isFinite(growthPct) ? growthPct : 0;
  const m = Math.max(1, Math.round(months) || 1);
  return Math.round(Number(mrrIdr || 0) * m * (1 + g / 100));
}

export function growthFromCounts(previous: number, current: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function getBusinessInsights(): Promise<{
  mrrIdr: number;
  forecast30Idr: number;
  forecast90Idr: number;
  growthPct: number;
  churnRisk: number;
  pipelineIdr: number;
  recommendations: InsightCard[];
  recentActions: Array<{ action: string; actorEmail: string | null; createdAt: string }>;
}> {
  const subs = await listSubscriptions();
  const mrrIdr = subs.rows
    .filter((r) => r.status === 'active')
    .reduce((n, r) => n + r.mrrIdr, 0);
  const paying = subs.counts.active;
  const trial = subs.counts.trial;
  const growthPct = growthFromCounts(trial + paying, paying);
  const forecast30Idr = forecastRevenue(mrrIdr, 1, Math.min(20, Math.max(-10, growthPct)));
  const forecast90Idr = forecastRevenue(mrrIdr, 3, Math.min(20, Math.max(-10, growthPct)));

  const recommendations: InsightCard[] = [];
  if (subs.counts.churnRisk) {
    recommendations.push({
      id: 'churn',
      tone: 'danger',
      title: `${subs.counts.churnRisk} langganan berisiko churn`,
      detail: 'CS follow-up atau perpanjang trial sebelum pelanggan hilang.',
      href: '/platform/subscriptions',
    });
  }
  if (subs.counts.renewal14) {
    recommendations.push({
      id: 'renewal',
      tone: 'warning',
      title: `${subs.counts.renewal14} renewal dalam 14 hari`,
      detail: 'Sales/CS konfirmasi pembayaran sebelum jatuh tempo.',
      href: '/platform/subscriptions',
    });
  }

  try {
    const queue = await getSupportQueue();
    if (queue.counts.unpaid) {
      recommendations.push({
        id: 'unpaid',
        tone: 'danger',
        title: `${queue.counts.unpaid} tagihan belum lunas`,
        detail: 'Finance rekonsiliasi atau kirim dunning.',
        href: '/platform/finance',
      });
    }
  } catch { /* */ }

  try {
    const approvals = await listApprovals({ status: 'pending', limit: 10 });
    if (approvals.pendingCount) {
      recommendations.push({
        id: 'approvals',
        tone: 'warning',
        title: `${approvals.pendingCount} approval menunggu`,
        detail: 'Refund atau penyesuaian keuangan belum diputuskan.',
        href: '/platform/approvals',
      });
    }
  } catch { /* */ }

  let pipelineIdr = 0;
  try {
    const crm = await listSalesLeads(200);
    pipelineIdr = pipelineTotals(crm.leads).expectedClosingIdr;
    if (pipelineIdr > 0) {
      recommendations.push({
        id: 'pipeline',
        tone: 'info',
        title: `Expected closing ${pipelineIdr.toLocaleString('id-ID')}`,
        detail: 'Dorong proposal/negotiation minggu ini.',
        href: '/platform/crm',
      });
    }
  } catch { /* */ }

  if (!recommendations.length) {
    recommendations.push({
      id: 'ok',
      tone: 'success',
      title: 'Tidak ada sinyal kritis',
      detail: 'MRR dan antrean operasional dalam batas aman.',
      href: '/platform',
    });
  }

  let recentActions: Array<{ action: string; actorEmail: string | null; createdAt: string }> = [];
  try {
    const audit = await listPlatformAudit({ limit: 8 });
    recentActions = (audit as any[]).map((r) => ({
      action: String(r.action || ''),
      actorEmail: r.actorEmail || null,
      createdAt: r.createdAt,
    }));
  } catch { /* */ }

  return {
    mrrIdr,
    forecast30Idr,
    forecast90Idr,
    growthPct,
    churnRisk: subs.counts.churnRisk,
    pipelineIdr,
    recommendations,
    recentActions,
  };
}
