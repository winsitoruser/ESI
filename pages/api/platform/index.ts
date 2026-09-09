/**
 * Platform Control Plane API — Humanify SaaS ops
 * GET   ?action=overview|tenants|tenant|tenant-detail|billing-orders|expiring-trials|partners|partner-leads|partner-leads-export|partner-commission-export|partner-commission-summary|commission-preview|audit-log|support-queue|users|system-status|banners
 * PATCH ?action=tenant-status|tenant-plan|tenant-mfa-policy|tenant-email-verify|tenant-profile|user-status|banner
 * POST  ?action=dunning-scan|partner-create|partner-lead-status|cleanup-qa|archive-qa|impersonate|end-impersonate|tenant-email-resend|tenant-create|banner
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { assertOpsApiHost } from '@/lib/humanify/assert-ops-host';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';
import {
  operatorMay,
  permissionForAction,
  listStaffDesks,
  setStaffDesk,
} from '@/lib/saas/platform-desks';
import { backfillTenantSlugs, ensureTenantSlugColumn, ensureUniqueTenantSlug } from '@/lib/saas/tenant-slug';
import {
  computePaidOrdersMrr,
  computeTenantHealth,
  estimateMrrFromTenants,
  formatIdr,
} from '@/lib/saas/platform-metrics';
import { HUMANIFY_PLANS, HUMANIFY_FEATURE_LABELS, HUMANIFY_FEATURE_ORDER, type HumanifyFeature } from '@/lib/saas/plan-entitlements';
import { listExpiringTrials, runDunningScan, activatePaidOrder, ensureBillingOrdersTable, getMidtransPublicConfig } from '@/lib/saas/humanify-billing';
import {
  createBillingVoucher,
  listBillingVouchers,
  setBillingVoucherActive,
  computeVoucherDiscount,
} from '@/lib/saas/billing-vouchers';
import {
  listPlanCatalog,
  upsertPlanCatalog,
  refreshPlanCatalogCache,
} from '@/lib/saas/plan-pricing-store';
import {
  archiveSuspendedQaTenants,
  attachPartnerToTenant,
  cleanupQaTenants,
  createPartner,
  estimatePartnerCommission,
  listPartners,
  previewPartnerCommission,
  QA_TENANT_SLUG_REGEX,
  resolvePartnerByCode,
} from '@/lib/saas/partners';
import {
  createPartnerPayoutDraft,
  ensurePartnerPayoutsTable,
  listPartnerPayouts,
  markPartnerPayoutPaid,
  partnerPayoutsToCsv,
  queuePartnerPayoutDisbursement,
} from '@/lib/saas/partner-payouts';
import { getSeatUsage } from '@/lib/saas/seat-metering';
import { isTenantMfaRequired, setTenantMfaRequired } from '@/lib/saas/mfa-policy';
import { parseTenantSettings } from '@/lib/saas/tenant-schema';
import {
  createEmailVerification,
  isTenantEmailVerified,
  markTenantEmailVerified,
} from '@/lib/saas/email-verify';
import { provisionHumanifyTenant } from '@/lib/saas/humanify-provision';
import { getGoLiveStatus } from '@/lib/saas/go-live';
import {
  exportPartnerLeadsCsv,
  listPartnerLeads,
  updatePartnerLeadStatus,
} from '@/lib/hris/partner-leads';
import { randomBytes } from 'crypto';
import { listPlatformAudit } from '@/lib/saas/admin-audit';
import {
  getPlatformNotifications,
  getSupportQueue,
  getSystemStatus,
  listPlatformUsers,
  setPlatformUserActive,
} from '@/lib/saas/platform-ops-modules';
import {
  createLandingBanner,
  deleteLandingBanner,
  listLandingBanners,
  updateLandingBanner,
} from '@/lib/saas/landing-banners';
import {
  createSupportTicket,
  listSupportTickets,
  updateSupportTicket,
} from '@/lib/saas/support-tickets';
import {
  extendTenantTrial,
  listSubscriptions,
  overviewPeriodBounds,
} from '@/lib/saas/platform-subscriptions';
import {
  createSalesLead,
  listSalesLeads,
  updateSalesLead,
} from '@/lib/saas/sales-leads';
import { listFinanceTransactions, requestRefund, executeApprovedRefund } from '@/lib/saas/platform-finance';
import { decideApproval, listApprovals } from '@/lib/saas/platform-approvals';
import { getMarketingFunnel, listCampaigns, upsertCampaign } from '@/lib/saas/marketing-campaigns';
import { advanceCmsFaq, listCmsFaqs, unpublishCmsFaq, upsertCmsFaq } from '@/lib/saas/cms-content';
import { getAnalyticsReport } from '@/lib/saas/platform-analytics';
import {
  advanceCmsArticle,
  listCmsArticles,
  unpublishCmsArticle,
  upsertCmsArticle,
} from '@/lib/saas/cms-articles';
import { getBusinessInsights } from '@/lib/saas/platform-insights';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

async function tenantCols(): Promise<Set<string>> {
  const [cols] = await sequelize.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'tenants' AND table_schema = 'public'
  `);
  return new Set((cols || []).map((c: any) => c.column_name));
}

function nameSql(cols: Set<string>, alias = 't') {
  const a = alias ? `${alias}.` : '';
  const parts = [
    cols.has('business_name') ? `${a}business_name` : null,
    cols.has('name') ? `${a}name` : null,
    cols.has('code') ? `${a}code` : null,
    `'tenant'`,
  ].filter(Boolean);
  return `COALESCE(${parts.join(', ')})`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!assertOpsApiHost(req, res)) return;
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const role = (session.user as any).role;
  if (!isPlatformOperator(role)) {
    return res.status(403).json({ success: false, error: 'Platform operator only' });
  }

  const { mutationOriginAllowed } = await import('@/lib/security/csrf-origin');
  if (!mutationOriginAllowed({
    method: req.method,
    origin: String(req.headers.origin || ''),
    host: String(req.headers.host || ''),
    forwardedHost: String(req.headers['x-forwarded-host'] || ''),
  })) {
    return res.status(403).json({ success: false, error: 'CSRF_ORIGIN' });
  }

  if (!sequelize) return res.status(503).json({ success: false, error: 'Database unavailable' });

  const action = String(req.query.action || 'overview');
  const needPerm = permissionForAction(action, req.method || 'GET');
  if (needPerm) {
    const allowed = await operatorMay(session.user as any, needPerm);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Desk Anda tidak punya izin untuk aksi ini' });
    }
  }

  try {
    await ensureTenantSlugColumn();
    const cols = await tenantCols();
    const nsql = nameSql(cols);

    if (req.method === 'GET' && action === 'overview') {
      await backfillTenantSlugs();
      const bounds = overviewPeriodBounds(
        String(req.query.period || '30d'),
        String(req.query.from || ''),
        String(req.query.to || ''),
      );

      const setupExpr = cols.has('setup_completed')
        ? `COUNT(*) FILTER (WHERE setup_completed = true)::int AS setup_done`
        : `0::int AS setup_done`;

      const [summary] = await sequelize.query(`
        SELECT
          COUNT(*)::int AS total_tenants,
          COUNT(*) FILTER (WHERE COALESCE(status::text, 'trial') = 'active')::int AS active,
          COUNT(*) FILTER (WHERE COALESCE(status::text, 'trial') = 'trial')::int AS trial,
          COUNT(*) FILTER (WHERE status::text = 'suspended')::int AS suspended,
          COUNT(*) FILTER (WHERE status::text = 'archived')::int AS archived,
          COUNT(*) FILTER (WHERE COALESCE(slug, '') ~* :qaRegex)::int AS qa_noise,
          ${setupExpr}
        FROM tenants
      `, { replacements: { qaRegex: QA_TENANT_SLUG_REGEX } });

      const planExpr = cols.has('subscription_plan')
        ? `COALESCE(subscription_plan, 'none')`
        : `'none'`;
      const [plans] = await sequelize.query(`
        SELECT ${planExpr} AS plan, COUNT(*)::int AS count
        FROM tenants GROUP BY 1 ORDER BY count DESC
      `);

      let activeEmployees = 0;
      try {
        const [employees] = await sequelize.query(`
          SELECT COUNT(*)::int AS total FROM employees WHERE COALESCE(is_active, true) = true
        `);
        activeEmployees = employees[0]?.total || 0;
      } catch { /* */ }

      const [recent] = await sequelize.query(`
        SELECT id, slug, ${nameSql(cols, '')} AS name,
          status,
          ${cols.has('subscription_plan') ? 'subscription_plan' : 'NULL AS subscription_plan'},
          ${cols.has('setup_completed') ? 'setup_completed' : 'NULL AS setup_completed'},
          created_at
        FROM tenants
        ORDER BY created_at DESC NULLS LAST
        LIMIT 8
      `);

      // MRR / health — list-price estimate until billing live.
      // Excludes archived + QA/smoke noise so ops metrics reflect real tenants only.
      const [metricRows] = await sequelize.query(`
        SELECT t.id, t.slug, t.status,
          ${cols.has('subscription_plan') ? 't.subscription_plan' : 'NULL AS subscription_plan'},
          ${cols.has('setup_completed') ? 't.setup_completed' : 'NULL AS setup_completed'},
          t.created_at,
          (SELECT COUNT(*)::int FROM users u WHERE u.tenant_id = t.id) AS user_count,
          (SELECT COUNT(*)::int FROM employees e WHERE e.tenant_id = t.id AND COALESCE(e.is_active, true)) AS employee_count
        FROM tenants t
        WHERE COALESCE(t.status::text, 'trial') <> 'archived'
          AND COALESCE(t.slug, '') !~* :qaRegex
      `, { replacements: { qaRegex: QA_TENANT_SLUG_REGEX } });

      const revenue = estimateMrrFromTenants(metricRows || []);
      const paid = await computePaidOrdersMrr();
      const healthDist = { healthy: 0, watch: 0, at_risk: 0 };
      for (const row of metricRows || []) {
        healthDist[computeTenantHealth(row).label] += 1;
      }

      const totalForConv = revenue.payingTenants + revenue.trialTenants;
      const trialToPaidPct = totalForConv > 0
        ? Math.round((revenue.payingTenants / totalForConv) * 1000) / 10
        : 0;

      // Signups last 7 / 30 days
      let signups7 = 0;
      let signups30 = 0;
      let signupsPeriod = 0;
      let signupSeries: Array<{ day: string; count: number }> = [];
      let statusSeries: Array<{ status: string; count: number }> = [];
      try {
        const [sig] = await sequelize.query(`
          SELECT
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS d7,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS d30,
            COUNT(*) FILTER (WHERE created_at >= :fromTs AND created_at <= :toTs)::int AS period
          FROM tenants
        `, { replacements: { fromTs: bounds.from, toTs: bounds.to } });
        signups7 = sig[0]?.d7 || 0;
        signups30 = sig[0]?.d30 || 0;
        signupsPeriod = sig[0]?.period || 0;
      } catch { /* */ }
      try {
        const [series] = await sequelize.query(`
          SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
                 COUNT(*)::int AS count
          FROM tenants
          WHERE created_at >= :fromTs AND created_at <= :toTs
          GROUP BY 1 ORDER BY 1 ASC
        `, { replacements: { fromTs: bounds.from, toTs: bounds.to } });
        signupSeries = series || [];
      } catch { /* */ }
      try {
        const [st] = await sequelize.query(`
          SELECT COALESCE(status::text, 'trial') AS status, COUNT(*)::int AS count
          FROM tenants
          WHERE COALESCE(status::text, 'trial') <> 'archived'
            AND COALESCE(slug, '') !~* :qaRegex
          GROUP BY 1 ORDER BY count DESC
        `, { replacements: { qaRegex: QA_TENANT_SLUG_REGEX } });
        statusSeries = st || [];
      } catch { /* */ }

      let revenueSeries: Array<{ month: string; amountIdr: number; orders: number }> = [];
      try {
        const [exists] = await sequelize.query(`
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'saas_billing_orders' LIMIT 1
        `);
        if (exists?.length) {
          const [rev] = await sequelize.query(`
            SELECT to_char(date_trunc('month', COALESCE(paid_at, created_at)), 'YYYY-MM') AS month,
                   COALESCE(SUM(amount_idr), 0)::bigint AS "amountIdr",
                   COUNT(*)::int AS orders
            FROM saas_billing_orders
            WHERE LOWER(status) = 'paid'
              AND COALESCE(paid_at, created_at) >= NOW() - INTERVAL '12 months'
            GROUP BY 1 ORDER BY 1 ASC
          `);
          revenueSeries = rev || [];
        }
      } catch { /* */ }

      const displayMrr = paid.available && paid.paidTenantCount > 0 ? paid.paidMrrIdr : revenue.mrrIdr;
      const displayArr = displayMrr * 12;

      return res.json({
        success: true,
        data: {
          summary: {
            ...summary[0],
            activeEmployees,
            signups7,
            signups30,
            signupsPeriod,
          },
          period: {
            key: bounds.key,
            label: bounds.label,
            from: bounds.from.toISOString(),
            to: bounds.to.toISOString(),
          },
          plans,
          recentTenants: recent,
          charts: {
            signupSeries,
            statusSeries,
            revenueSeries,
            healthDist,
            byPlan: revenue.byPlan,
          },
          metrics: {
            mrrIdr: displayMrr,
            arrIdr: displayArr,
            mrrFormatted: formatIdr(displayMrr),
            arrFormatted: formatIdr(displayArr),
            listPriceMrrIdr: revenue.mrrIdr,
            paidMrrIdr: paid.paidMrrIdr,
            paidTenantCount: paid.paidTenantCount,
            paidOrdersCount: paid.paidOrdersCount,
            mrrSource: paid.available && paid.paidTenantCount > 0 ? 'paid_orders' : 'list_price',
            payingTenants: revenue.payingTenants,
            trialTenants: revenue.trialTenants,
            trialToPaidPct,
            byPlan: revenue.byPlan.map((p) => ({
              ...p,
              name: HUMANIFY_PLANS[p.plan].name,
              listPriceIdr: HUMANIFY_PLANS[p.plan].priceMonthlyIdr,
              mrrFormatted: formatIdr(p.mrrIdr),
            })),
            health: healthDist,
            pricingNote: paid.available && paid.paidTenantCount > 0
              ? 'MRR dari order berbayar (saas_billing_orders)'
              : 'Estimated from list prices × paying tenants',
          },
        },
      });
    }

    if (req.method === 'GET' && action === 'tenants') {
      await backfillTenantSlugs();
      const { search, status, page = '1', limit = '25' } = req.query;
      const p = Math.max(1, parseInt(String(page), 10) || 1);
      const lim = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 25));
      const offset = (p - 1) * lim;

      const conditions: string[] = ['1=1'];
      const repl: Record<string, unknown> = { lim, offset };

      if (status && status !== 'all') {
        conditions.push(`COALESCE(t.status::text, 'trial') = :status`);
        repl.status = status;
      }
      if (search) {
        const searchParts = [
          `${nsql} ILIKE :q`,
          cols.has('slug') ? `t.slug ILIKE :q` : null,
          cols.has('code') ? `t.code ILIKE :q` : null,
          cols.has('business_email') ? `t.business_email ILIKE :q` : null,
          cols.has('contact_email') ? `t.contact_email ILIKE :q` : null,
        ].filter(Boolean);
        conditions.push(`(${searchParts.join(' OR ')})`);
        repl.q = `%${search}%`;
      }

      const where = conditions.join(' AND ');
      const [countRows] = await sequelize.query(
        `SELECT COUNT(*)::int AS c FROM tenants t WHERE ${where}`,
        { replacements: repl },
      );
      const [rows] = await sequelize.query(`
        SELECT t.id, t.slug, ${nsql} AS name,
          ${cols.has('business_email') ? 't.business_email' : cols.has('contact_email') ? 't.contact_email AS business_email' : 'NULL AS business_email'},
          t.status,
          ${cols.has('subscription_plan') ? 't.subscription_plan' : 'NULL AS subscription_plan'},
          ${cols.has('setup_completed') ? 't.setup_completed' : 'NULL AS setup_completed'},
          ${cols.has('kyb_status') ? 't.kyb_status' : 'NULL AS kyb_status'},
          ${cols.has('max_users') ? 't.max_users' : 'NULL AS max_users'},
          t.created_at,
          ${cols.has('activated_at') ? 't.activated_at' : 'NULL AS activated_at'},
          (SELECT COUNT(*)::int FROM users u WHERE u.tenant_id = t.id) AS user_count,
          (SELECT COUNT(*)::int FROM employees e WHERE e.tenant_id = t.id AND COALESCE(e.is_active, true)) AS employee_count
        FROM tenants t
        WHERE ${where}
        ORDER BY t.created_at DESC NULLS LAST
        LIMIT :lim OFFSET :offset
      `, { replacements: repl });

      const tenantsWithHealth = (rows || []).map((row: any) => {
        const health = computeTenantHealth(row);
        return { ...row, health };
      });

      return res.json({
        success: true,
        data: {
          tenants: tenantsWithHealth,
          pagination: {
            total: countRows[0]?.c || 0,
            page: p,
            limit: lim,
            totalPages: Math.ceil((countRows[0]?.c || 0) / lim),
          },
        },
      });
    }

    if (req.method === 'GET' && action === 'tenant') {
      const id = String(req.query.id || '');
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      const [rows] = await sequelize.query(`
        SELECT t.*,
          (SELECT COUNT(*)::int FROM users u WHERE u.tenant_id = t.id) AS user_count,
          (SELECT COUNT(*)::int FROM employees e WHERE e.tenant_id = t.id) AS employee_count
        FROM tenants t WHERE t.id = :id LIMIT 1
      `, { replacements: { id } });
      if (!rows?.[0]) return res.status(404).json({ success: false, error: 'Tenant not found' });
      return res.json({
        success: true,
        data: {
          ...rows[0],
          careersUrl: rows[0].slug ? `/c/${rows[0].slug}/careers` : null,
        },
      });
    }

    if (req.method === 'PATCH' && action === 'tenant-status') {
      const { id, status } = req.body || {};
      const allowed = ['active', 'trial', 'suspended', 'inactive'];
      if (!id || !allowed.includes(status)) {
        return res.status(400).json({ success: false, error: 'id and valid status required' });
      }
      const isActiveSql = cols.has('is_active')
        ? `, is_active = CASE WHEN :status IN ('suspended','inactive') THEN false ELSE true END`
        : '';
      await sequelize.query(`
        UPDATE tenants SET status = :status, updated_at = NOW() ${isActiveSql}
        WHERE id = :id
      `, { replacements: { id, status } });
      return res.json({ success: true, message: `Tenant status → ${status}` });
    }

    if (req.method === 'PATCH' && action === 'tenant-plan') {
      const { id, plan } = req.body || {};
      const allowed = ['trial', 'starter', 'growth', 'enterprise'];
      if (!id || !allowed.includes(String(plan || '').toLowerCase())) {
        return res.status(400).json({
          success: false,
          error: 'id and plan (trial|starter|growth|enterprise) required',
        });
      }
      if (!cols.has('subscription_plan')) {
        return res.status(400).json({ success: false, error: 'subscription_plan column missing' });
      }
      const planNorm = String(plan).toLowerCase();
      await sequelize.query(`
        UPDATE tenants SET subscription_plan = :plan, updated_at = NOW() WHERE id = :id
      `, { replacements: { id, plan: planNorm } });
      return res.json({ success: true, message: `Tenant plan → ${planNorm}` });
    }

    if (req.method === 'PATCH' && action === 'tenant-mfa-policy') {
      const id = String(req.body?.id || req.query.id || '');
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      const requireMfa = Boolean(req.body?.requireMfa);
      try {
        const result = await setTenantMfaRequired(id, requireMfa);
        return res.json({
          success: true,
          data: result,
          message: requireMfa ? 'MFA wajib diaktifkan untuk tenant' : 'Kebijakan MFA dinonaktifkan',
        });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e?.message || 'Gagal update MFA policy' });
      }
    }

    if (req.method === 'PATCH' && action === 'tenant-email-verify') {
      const id = String(req.body?.id || req.query.id || '');
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      const reason = String(req.body?.reason || 'platform_ops_mark').slice(0, 240);
      const byEmail = String((session.user as any).email || 'platform_ops');
      try {
        const result = await markTenantEmailVerified({ tenantId: id, byEmail, reason });
        return res.json({
          success: true,
          data: result,
          message: 'Email pemilik ditandai terverifikasi',
        });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e?.message || 'Gagal mark email verified' });
      }
    }

    if (req.method === 'POST' && action === 'tenant-email-resend') {
      const id = String(req.body?.id || req.query.id || '');
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      try {
        const [ownerRows] = await sequelize.query(`
          SELECT id, email FROM users WHERE tenant_id = :id
          ORDER BY (CASE WHEN role IN ('owner', 'admin', 'super_admin') THEN 0 ELSE 1 END), "createdAt" ASC NULLS LAST
          LIMIT 1
        `, { replacements: { id } });
        const owner = ownerRows?.[0];
        if (!owner?.email || !owner?.id) {
          return res.status(404).json({ success: false, error: 'Owner email tidak ditemukan' });
        }
        const origin = (req.headers.origin as string) || process.env.NEXTAUTH_URL || 'https://humanify.id';
        const created = await createEmailVerification({
          userId: owner.id,
          tenantId: id,
          email: String(owner.email).toLowerCase(),
          baseUrl: origin,
        });
        const exposeToken =
          process.env.NODE_ENV !== 'production'
          || process.env.HUMANIFY_EMAIL_VERIFY_RETURN_TOKEN === 'true'
          || !created.emailed;
        return res.json({
          success: true,
          message: created.emailed
            ? `Link verifikasi dikirim ke ${owner.email}`
            : `Link verifikasi dibuat untuk ${owner.email}`,
          data: {
            emailed: created.emailed,
            email: owner.email,
            verifyUrl: exposeToken ? created.verifyUrl : undefined,
          },
        });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e?.message || 'Gagal resend verifikasi' });
      }
    }

    if (req.method === 'POST' && action === 'dunning-scan') {
      const result = await runDunningScan();
      return res.json({ success: true, data: result, message: `Suspended ${result.suspended}, trials expired ${result.trialsExpired}` });
    }

    if (req.method === 'GET' && action === 'expiring-trials') {
      const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
      const data = await listExpiringTrials(days);
      return res.json({ success: true, data });
    }

    if (req.method === 'GET' && action === 'partners') {
      const data = await listPartners();
      return res.json({ success: true, data });
    }

    if (req.method === 'GET' && action === 'partner-leads') {
      const limit = Number(req.query.limit) || 50;
      const status = req.query.status ? String(req.query.status) : undefined;
      const data = await listPartnerLeads({ limit, status });
      return res.json({ success: true, data });
    }

    if (req.method === 'GET' && action === 'partner-leads-export') {
      const status = req.query.status ? String(req.query.status) : undefined;
      const limit = Number(req.query.limit) || 500;
      const csv = await exportPartnerLeadsCsv({ status, limit });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="partner-leads.csv"');
      return res.status(200).send(csv);
    }

    if (req.method === 'GET' && action === 'commission-preview') {
      const partnerCode = String(req.query.partnerCode || req.query.code || '');
      const amountIdr = Number(req.query.amountIdr || req.query.amount || 0);
      const data = await previewPartnerCommission({ partnerCode, amountIdr });
      if (data.error) return res.status(404).json({ success: false, error: data.error, data });
      return res.json({ success: true, data });
    }

    if (req.method === 'POST' && action === 'partner-create') {
      const created = await createPartner({
        code: req.body?.code,
        name: req.body?.name,
        contactEmail: req.body?.contactEmail,
        commissionPct: req.body?.commissionPct,
        notes: req.body?.notes,
      });
      return res.status(201).json({ success: true, data: created });
    }

    if (req.method === 'POST' && action === 'partner-lead-status') {
      const id = String(req.body?.id || '');
      const status = String(req.body?.status || '');
      if (!id || !status) {
        return res.status(400).json({ success: false, error: 'id and status required' });
      }
      const result = await updatePartnerLeadStatus({ id, status });
      if (!result.ok) return res.status(404).json({ success: false, error: 'Lead not found' });
      return res.json({ success: true, data: result });
    }

    if (req.method === 'POST' && action === 'cleanup-qa') {
      const dryRun = req.body?.dryRun !== false;
      const olderThanHours = Number(req.body?.olderThanHours) || 1;
      const result = await cleanupQaTenants({ dryRun, olderThanHours });
      return res.json({
        success: true,
        data: result,
        message: dryRun
          ? `Dry-run: ${result.matched} QA tenants`
          : `Suspended ${result.suspended} QA tenants`,
      });
    }

    if (req.method === 'POST' && action === 'archive-qa') {
      const dryRun = req.body?.dryRun !== false;
      const olderThanHours = Number(req.body?.olderThanHours) || 24;
      const result = await archiveSuspendedQaTenants({ dryRun, olderThanHours });
      return res.json({
        success: true,
        data: result,
        message: dryRun
          ? `Dry-run: ${result.matched} tenant QA suspended siap diarsipkan`
          : `Diarsipkan ${result.archived} tenant QA`,
      });
    }

    if (req.method === 'GET' && action === 'tenant-detail') {
      const id = String(req.query.id || '');
      if (!id) return res.status(400).json({ success: false, error: 'id required' });

      const [rows] = await sequelize.query(`
        SELECT t.*, ${nsql} AS name,
          (SELECT COUNT(*)::int FROM users u WHERE u.tenant_id = t.id) AS user_count,
          (SELECT COUNT(*)::int FROM employees e WHERE e.tenant_id = t.id AND COALESCE(e.is_active, true)) AS employee_count
        FROM tenants t WHERE t.id = :id LIMIT 1
      `, { replacements: { id } });
      const tenant = rows?.[0];
      if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });

      let owner: any = null;
      try {
        const [ownerRows] = await sequelize.query(`
          SELECT id, name, email, role, "createdAt" AS created_at
          FROM users WHERE tenant_id = :id
          ORDER BY (CASE WHEN role IN ('owner', 'admin', 'super_admin') THEN 0 ELSE 1 END), "createdAt" ASC NULLS LAST
          LIMIT 1
        `, { replacements: { id } });
        owner = ownerRows?.[0] || null;
      } catch { /* users schema may vary */ }

      let leaveRequests30d = 0;
      try {
        const [lv] = await sequelize.query(`
          SELECT COUNT(*)::int AS c FROM leave_requests
          WHERE tenant_id = :id AND created_at >= NOW() - INTERVAL '30 days'
        `, { replacements: { id } });
        leaveRequests30d = lv?.[0]?.c || 0;
      } catch { /* leave_requests may be missing */ }

      let overtimeRequests30d = 0;
      try {
        const [ot] = await sequelize.query(`
          SELECT COUNT(*)::int AS c FROM overtime_requests
          WHERE tenant_id = :id AND created_at >= NOW() - INTERVAL '30 days'
        `, { replacements: { id } });
        overtimeRequests30d = ot?.[0]?.c || 0;
      } catch { /* overtime_requests may be missing */ }

      const settings = parseTenantSettings(tenant.settings);
      const health = computeTenantHealth(tenant);
      const trialEndsAt = cols.has('trial_ends_at') ? tenant.trial_ends_at : null;
      const partnerCode = settings.partner_code || settings.partner?.code || null;
      let partnerCommission: {
        code: string;
        name?: string;
        commissionPct: number;
        sampleAmountIdr: number;
        sampleCommissionIdr: number;
      } | null = null;
      if (partnerCode) {
        const partner = await resolvePartnerByCode(String(partnerCode));
        if (partner) {
          const pct = Number(partner.commission_pct ?? 10);
          const sampleAmountIdr = 1_000_000;
          partnerCommission = {
            code: partner.code,
            name: partner.name,
            commissionPct: pct,
            sampleAmountIdr,
            sampleCommissionIdr: estimatePartnerCommission(sampleAmountIdr, pct).commissionIdr,
          };
        }
      }

      const seats = await getSeatUsage(id, tenant.plan || tenant.subscription_plan).catch(() => null);
      let requireMfa = false;
      let mfaEnrolled = 0;
      try {
        requireMfa = await isTenantMfaRequired(id);
        const [mfaRows] = await sequelize.query(`
          SELECT COUNT(*)::int AS c FROM users u
          WHERE u.tenant_id = :id
            AND (
              COALESCE((u.settings->>'mfaEnabled')::boolean, false) = true
              OR COALESCE(u.mfa_enabled, false) = true
            )
        `, { replacements: { id } });
        mfaEnrolled = mfaRows?.[0]?.c || 0;
      } catch {
        try {
          requireMfa = await isTenantMfaRequired(id);
        } catch { /* */ }
      }

      const emailVerified = await isTenantEmailVerified(id).catch(() => Boolean(settings.email_verified));
      const goLive = await getGoLiveStatus(id).catch(() => null);
      const company = settings.saas_onboarding?.company || settings.company || {};

      return res.json({
        success: true,
        data: {
          ...tenant,
          health,
          owner,
          leaveRequests30d,
          overtimeRequests30d,
          partnerCode,
          partnerCommission,
          trialEndsAt,
          careersUrl: tenant.slug ? `/c/${tenant.slug}/careers` : null,
          seats,
          mfa: { requireMfa, enrolledUsers: mfaEnrolled },
          emailVerified,
          emailVerifiedAt: settings.email_verified_at || null,
          emailVerifiedBy: settings.email_verified_by || null,
          goLive,
          profile: {
            name: tenant.name || tenant.business_name || '',
            slug: tenant.slug || '',
            contactName: tenant.contact_name || owner?.name || '',
            contactEmail: tenant.contact_email || tenant.business_email || owner?.email || '',
            contactPhone: tenant.contact_phone || '',
            industry: company.industry || '',
            employeeRange: company.employeeRange || '',
          },
        },
      });
    }

    if (req.method === 'POST' && action === 'tenant-create') {
      const body = req.body || {};
      const companyName = String(body.companyName || body.name || '').trim();
      const ownerName = String(body.ownerName || body.contactName || '').trim();
      const email = String(body.email || body.contactEmail || '').trim().toLowerCase();
      let password = String(body.password || '').trim();
      if (!password) password = `Hf${randomBytes(6).toString('base64url')}!a1`;
      if (!companyName || !ownerName || !email) {
        return res.status(400).json({
          success: false,
          error: 'companyName, ownerName, dan email wajib',
        });
      }

      const result = await provisionHumanifyTenant({
        companyName,
        ownerName,
        email,
        password,
        phone: body.phone ? String(body.phone).trim() : undefined,
        industry: body.industry ? String(body.industry) : undefined,
        employeeRange: body.employeeRange ? String(body.employeeRange) : undefined,
      });

      const refCode = String(body.partnerCode || body.ref || '').trim();
      let partner: { attached: boolean; code?: string } = { attached: false };
      if (refCode) {
        partner = await attachPartnerToTenant(result.tenantId, refCode);
      }

      if (body.markEmailVerified === true || body.verifyEmail === true) {
        await markTenantEmailVerified({
          tenantId: result.tenantId,
          byEmail: String((session.user as any)?.email || 'platform_ops'),
          reason: 'platform_provision',
        }).catch(() => null);
      } else {
        const origin = (req.headers.origin as string) || process.env.NEXTAUTH_URL || 'https://humanify.id';
        await createEmailVerification({
          userId: result.userId,
          tenantId: result.tenantId,
          email: result.email,
          baseUrl: origin,
        }).catch(() => null);
      }

      if (body.plan && String(body.plan).toLowerCase() !== 'trial' && cols.has('subscription_plan')) {
        const plan = String(body.plan).toLowerCase();
        if (['starter', 'growth', 'enterprise'].includes(plan)) {
          await sequelize.query(
            `UPDATE tenants SET subscription_plan = :plan, updated_at = NOW() WHERE id = :id`,
            { replacements: { id: result.tenantId, plan } },
          );
        }
      }

      return res.status(201).json({
        success: true,
        message: `Tenant ${companyName} dibuat`,
        data: {
          ...result,
          passwordGenerated: !body.password,
          temporaryPassword: !body.password ? password : undefined,
          partner,
          redirectTo: `/platform/tenants/${result.tenantId}`,
        },
      });
    }

    if (req.method === 'PATCH' && action === 'tenant-profile') {
      const id = String(req.body?.id || '');
      if (!id) return res.status(400).json({ success: false, error: 'id required' });

      const [rows] = await sequelize.query(
        `SELECT * FROM tenants WHERE id = :id LIMIT 1`,
        { replacements: { id } },
      );
      const tenant = rows?.[0];
      if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });

      const settings = parseTenantSettings(tenant.settings);
      const sets: string[] = ['updated_at = NOW()'];
      const repl: Record<string, unknown> = { id };

      const name = req.body?.name != null ? String(req.body.name).trim() : null;
      if (name) {
        if (cols.has('name')) { sets.push('name = :name'); repl.name = name; }
        if (cols.has('business_name')) { sets.push('business_name = :business_name'); repl.business_name = name; }
      }

      if (req.body?.contactName != null && cols.has('contact_name')) {
        sets.push('contact_name = :contact_name');
        repl.contact_name = String(req.body.contactName).trim() || null;
      }
      if (req.body?.contactEmail != null && cols.has('contact_email')) {
        sets.push('contact_email = :contact_email');
        repl.contact_email = String(req.body.contactEmail).trim().toLowerCase() || null;
      }
      if (req.body?.contactPhone != null && cols.has('contact_phone')) {
        sets.push('contact_phone = :contact_phone');
        repl.contact_phone = String(req.body.contactPhone).trim() || null;
      }
      if (req.body?.businessEmail != null && cols.has('business_email')) {
        sets.push('business_email = :business_email');
        repl.business_email = String(req.body.businessEmail).trim().toLowerCase() || null;
      }

      if (req.body?.slug != null && cols.has('slug')) {
        const rawSlug = String(req.body.slug).trim();
        if (rawSlug && rawSlug !== tenant.slug) {
          const slug = await ensureUniqueTenantSlug(rawSlug, id);
          sets.push('slug = :slug');
          repl.slug = slug;
        }
      }

      const industry = req.body?.industry != null ? String(req.body.industry).trim() : null;
      const employeeRange = req.body?.employeeRange != null ? String(req.body.employeeRange).trim() : null;
      if (industry != null || employeeRange != null) {
        settings.saas_onboarding = {
          ...(settings.saas_onboarding || {}),
          company: {
            ...((settings.saas_onboarding || {}).company || {}),
            ...(industry != null ? { industry } : {}),
            ...(employeeRange != null ? { employeeRange } : {}),
          },
        };
        if (cols.has('settings')) {
          sets.push('settings = CAST(:settings AS jsonb)');
          repl.settings = JSON.stringify(settings);
        }
      }

      if (sets.length <= 1) {
        return res.status(400).json({ success: false, error: 'Tidak ada field untuk diubah' });
      }

      await sequelize.query(
        `UPDATE tenants SET ${sets.join(', ')} WHERE id = :id`,
        { replacements: repl },
      );

      return res.json({ success: true, message: 'Profil perusahaan diperbarui', data: { id } });
    }

    if (req.method === 'GET' && action === 'billing-orders') {
      const [exists] = await sequelize.query(`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'saas_billing_orders' LIMIT 1
      `);
      if (!exists?.length) {
        return res.json({ success: true, data: { orders: [], available: false } });
      }

      const [bColRows] = await sequelize.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'saas_billing_orders' AND table_schema = 'public'
      `);
      const bCols = new Set((bColRows || []).map((c: any) => c.column_name));

      const tenantId = req.query.tenantId ? String(req.query.tenantId) : '';
      const partnerCode = String(req.query.partnerCode || req.query.code || '').trim().toUpperCase();
      const statusFilter = String(req.query.status || '').trim().toLowerCase();
      const lim = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));

      const selectParts = [
        'id',
        bCols.has('tenant_id') ? 'tenant_id' : 'NULL AS tenant_id',
        bCols.has('order_code') ? 'order_code' : (bCols.has('midtrans_order_id') ? 'midtrans_order_id AS order_code' : `NULL AS order_code`),
        bCols.has('plan') ? 'plan' : `NULL AS plan`,
        bCols.has('interval') ? '"interval"' : `NULL AS interval`,
        bCols.has('amount_idr') ? 'amount_idr' : (bCols.has('amount') ? 'amount AS amount_idr' : `NULL AS amount_idr`),
        bCols.has('status') ? 'status' : `NULL AS status`,
        bCols.has('provider') ? 'provider' : `NULL AS provider`,
        bCols.has('midtrans_order_id') ? 'midtrans_order_id' : `NULL AS midtrans_order_id`,
        bCols.has('paid_at') ? 'paid_at' : `NULL AS paid_at`,
        bCols.has('created_at') ? 'created_at' : `NULL AS created_at`,
        bCols.has('partner_code') ? 'partner_code' : `NULL AS partner_code`,
        bCols.has('commission_pct') ? 'commission_pct' : `NULL AS commission_pct`,
        bCols.has('commission_idr') ? 'commission_idr' : `NULL AS commission_idr`,
      ].join(', ');

      const conditions = ['1=1'];
      const repl: Record<string, unknown> = { lim };
      if (tenantId && bCols.has('tenant_id')) {
        conditions.push('tenant_id = :tenantId');
        repl.tenantId = tenantId;
      }
      if (partnerCode && bCols.has('partner_code')) {
        conditions.push('UPPER(COALESCE(partner_code,\'\')) = :partnerCode');
        repl.partnerCode = partnerCode;
      }
      if (statusFilter && bCols.has('status')) {
        conditions.push('LOWER(status) = :statusFilter');
        repl.statusFilter = statusFilter;
      }

      const [orders] = await sequelize.query(`
        SELECT ${selectParts}
        FROM saas_billing_orders
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${bCols.has('created_at') ? 'created_at' : 'id'} DESC
        LIMIT :lim
      `, { replacements: repl });

      return res.json({ success: true, data: { orders: orders || [], available: true } });
    }

    if (req.method === 'GET' && action === 'partner-commission-summary') {
      const [exists] = await sequelize.query(`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'saas_billing_orders' LIMIT 1
      `);
      if (!exists?.length) {
        return res.json({ success: true, data: { months: [], available: false } });
      }
      const [bColRows] = await sequelize.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'saas_billing_orders' AND table_schema = 'public'
      `);
      const bCols = new Set((bColRows || []).map((c: any) => c.column_name));
      if (!bCols.has('commission_idr') || !bCols.has('partner_code')) {
        return res.json({ success: true, data: { months: [], available: false } });
      }
      const partnerCode = String(req.query.partnerCode || req.query.code || '').trim().toUpperCase();
      const conditions = [
        `LOWER(status) = 'paid'`,
        `partner_code IS NOT NULL`,
        `partner_code <> ''`,
        `paid_at >= NOW() - INTERVAL '6 months'`,
      ];
      const repl: Record<string, unknown> = {};
      if (partnerCode) {
        conditions.push('UPPER(partner_code) = :partnerCode');
        repl.partnerCode = partnerCode;
      }
      const [rows] = await sequelize.query(
        `SELECT to_char(date_trunc('month', paid_at), 'YYYY-MM') AS month,
                partner_code,
                COUNT(*)::int AS orders,
                COALESCE(SUM(commission_idr), 0)::bigint AS commission_idr,
                COALESCE(SUM(amount_idr), 0)::bigint AS amount_idr
         FROM saas_billing_orders
         WHERE ${conditions.join(' AND ')}
         GROUP BY 1, 2
         ORDER BY 1 DESC, 4 DESC
         LIMIT 48`,
        { replacements: repl },
      );
      return res.json({ success: true, data: { months: rows || [], available: true } });
    }

    if (req.method === 'GET' && action === 'partner-commission-export') {
      const [exists] = await sequelize.query(`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'saas_billing_orders' LIMIT 1
      `);
      if (!exists?.length) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        return res.status(200).send('paid_at,order_code,tenant_id,plan,amount_idr,partner_code,commission_pct,commission_idr\n');
      }
      const [bColRows] = await sequelize.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'saas_billing_orders' AND table_schema = 'public'
      `);
      const bCols = new Set((bColRows || []).map((c: any) => c.column_name));
      if (!bCols.has('partner_code') || !bCols.has('commission_idr')) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        return res.status(200).send('paid_at,order_code,tenant_id,plan,amount_idr,partner_code,commission_pct,commission_idr\n');
      }
      const partnerCode = String(req.query.partnerCode || req.query.code || '').trim().toUpperCase();
      const lim = Math.min(5000, Math.max(1, Number(req.query.limit) || 2000));
      const fromRaw = String(req.query.from || '').trim();
      const toRaw = String(req.query.to || '').trim();
      const fromMatch = fromRaw.match(/^(\d{4}-\d{2}-\d{2})/);
      const toMatch = toRaw.match(/^(\d{4}-\d{2}-\d{2})/);
      const conditions = [`LOWER(status) = 'paid'`, `partner_code IS NOT NULL`, `partner_code <> ''`];
      const repl: Record<string, unknown> = { lim };
      if (partnerCode) {
        conditions.push('UPPER(partner_code) = :partnerCode');
        repl.partnerCode = partnerCode;
      }
      if (fromMatch) {
        conditions.push('paid_at >= :fromTs::timestamptz');
        repl.fromTs = `${fromMatch[1]}T00:00:00.000Z`;
      }
      if (toMatch) {
        conditions.push('paid_at < (:toTs::date + INTERVAL \'1 day\')');
        repl.toTs = toMatch[1];
      }
      const [rows] = await sequelize.query(
        `SELECT paid_at, order_code, tenant_id, plan, amount_idr, partner_code, commission_pct, commission_idr
         FROM saas_billing_orders
         WHERE ${conditions.join(' AND ')}
         ORDER BY paid_at DESC NULLS LAST, created_at DESC
         LIMIT :lim`,
        { replacements: repl },
      );
      const esc = (v: unknown) => {
        const s = v == null ? '' : String(v);
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const lines = ['paid_at,order_code,tenant_id,plan,amount_idr,partner_code,commission_pct,commission_idr'];
      for (const r of rows || []) {
        lines.push([
          r.paid_at, r.order_code, r.tenant_id, r.plan, r.amount_idr,
          r.partner_code, r.commission_pct, r.commission_idr,
        ].map(esc).join(','));
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="partner-commission-paid.csv"');
      return res.status(200).send(lines.join('\n'));
    }

    if (req.method === 'POST' && action === 'impersonate') {
      const { tenantId } = req.body || {};
      if (!tenantId) return res.status(400).json({ success: false, error: 'tenantId required' });
      const [rows] = await sequelize.query(`
        SELECT id, slug, ${nsql} AS name, status
        FROM tenants t WHERE t.id = :id LIMIT 1
      `, { replacements: { id: tenantId } });
      const t = rows?.[0];
      if (!t) return res.status(404).json({ success: false, error: 'Tenant not found' });
      if (String(t.status) === 'suspended') {
        return res.status(400).json({ success: false, error: 'Tenant suspended — aktifkan dulu' });
      }
      return res.json({
        success: true,
        data: {
          tenantId: t.id,
          slug: t.slug,
          name: t.name,
          /** Client: session.update({ impersonateTenantId }) */
          sessionPatch: { impersonateTenantId: t.id },
          redirectTo: '/humanify',
        },
        message: `Support mode → ${t.name}`,
      });
    }

    if (req.method === 'POST' && action === 'end-impersonate') {
      return res.json({
        success: true,
        data: {
          sessionPatch: { endImpersonation: true },
          redirectTo: '/platform',
        },
        message: 'Support mode ended',
      });
    }

    // Wave-55 — partner payout ledger (ops mark-paid; not Midtrans)
    if (req.method === 'GET' && action === 'partner-payouts') {
      await ensurePartnerPayoutsTable();
      const rows = await listPartnerPayouts({
        partnerCode: String(req.query.partnerCode || req.query.code || ''),
        limit: Number(req.query.limit) || 50,
      });
      return res.json({ success: true, data: { payouts: rows, available: true } });
    }

    if (req.method === 'GET' && action === 'partner-payout-export') {
      await ensurePartnerPayoutsTable();
      const rows = await listPartnerPayouts({
        partnerCode: String(req.query.partnerCode || req.query.code || ''),
        limit: Number(req.query.limit) || 2000,
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="partner-payouts.csv"');
      return res.status(200).send(partnerPayoutsToCsv(rows));
    }

    if (req.method === 'POST' && action === 'partner-payout-create') {
      const body = req.body || {};
      const created = await createPartnerPayoutDraft({
        partnerCode: String(body.partnerCode || body.code || ''),
        amountIdr: Number(body.amountIdr || body.amount || 0),
        periodFrom: body.periodFrom || null,
        periodTo: body.periodTo || null,
        note: body.note || null,
        createdBy: String((session.user as any)?.email || ''),
      });
      return res.status(201).json({ success: true, data: created });
    }

    if (req.method === 'POST' && action === 'partner-payout-mark-paid') {
      const id = String(req.body?.id || '');
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      const row = await markPartnerPayoutPaid(id, req.body?.note || null);
      if (!row) return res.status(404).json({ success: false, error: 'Payout not found' });
      return res.json({ success: true, data: row });
    }

    if (req.method === 'POST' && action === 'partner-payout-disburse') {
      const id = String(req.body?.id || '');
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      const row = await queuePartnerPayoutDisbursement(id, { note: req.body?.note || null });
      return res.json({ success: true, data: row });
    }

    // ── Billing ops ──────────────────────────────────────────────
    if (req.method === 'GET' && action === 'billing-summary') {
      await ensureBillingOrdersTable();
      const cols = await tenantCols();
      const tenantName = nameSql(cols, 't');
      const [byStatus] = await sequelize.query(`
        SELECT LOWER(status) AS status,
               COUNT(*)::int AS count,
               COALESCE(SUM(amount_idr), 0)::bigint AS amount_idr
        FROM saas_billing_orders
        GROUP BY 1 ORDER BY count DESC
      `);
      const [recentPaid] = await sequelize.query(`
        SELECT o.id, o.order_code, o.tenant_id, o.plan, o.interval, o.amount_idr, o.status,
               o.provider, o.paid_at, o.created_at, o.partner_code,
               t.slug AS tenant_slug,
               ${tenantName} AS tenant_name
        FROM saas_billing_orders o
        LEFT JOIN tenants t ON t.id = o.tenant_id
        WHERE LOWER(o.status) = 'paid'
        ORDER BY COALESCE(o.paid_at, o.created_at) DESC NULLS LAST
        LIMIT 100
      `);
      const [unpaid] = await sequelize.query(`
        SELECT o.id, o.order_code, o.tenant_id, o.plan, o.interval, o.amount_idr, o.status,
               o.provider, o.created_at, o.partner_code,
               t.slug AS tenant_slug,
               ${tenantName} AS tenant_name
        FROM saas_billing_orders o
        LEFT JOIN tenants t ON t.id = o.tenant_id
        WHERE LOWER(o.status) IN ('pending', 'unpaid', 'challenge', 'expire', 'failed', 'deny', 'cancel')
        ORDER BY o.created_at DESC NULLS LAST
        LIMIT 100
      `);
      const [revSeries] = await sequelize.query(`
        SELECT to_char(date_trunc('month', COALESCE(paid_at, created_at)), 'YYYY-MM') AS month,
               COALESCE(SUM(amount_idr), 0)::bigint AS amount_idr,
               COUNT(*)::int AS orders
        FROM saas_billing_orders
        WHERE LOWER(status) = 'paid'
          AND COALESCE(paid_at, created_at) >= NOW() - INTERVAL '12 months'
        GROUP BY 1 ORDER BY 1 ASC
      `);
      const [planMix] = await sequelize.query(`
        SELECT LOWER(plan) AS plan, COUNT(*)::int AS count,
               COALESCE(SUM(amount_idr), 0)::bigint AS amount_idr
        FROM saas_billing_orders
        WHERE LOWER(status) = 'paid'
        GROUP BY 1 ORDER BY amount_idr DESC
      `);
      return res.json({
        success: true,
        data: {
          byStatus: byStatus || [],
          recentPaid: recentPaid || [],
          unpaid: unpaid || [],
          revenueSeries: revSeries || [],
          planMix: planMix || [],
          midtrans: getMidtransPublicConfig(),
        },
      });
    }

    if (req.method === 'POST' && action === 'billing-mark-paid') {
      const code = String(req.body?.orderCode || req.body?.id || '').trim();
      if (!code) return res.status(400).json({ success: false, error: 'orderCode required' });
      const result = await activatePaidOrder(code, {
        raw: { activatedBy: (session.user as any)?.email, source: 'ops-manual' },
      });
      return res.json({ success: true, data: result, message: result.alreadyPaid ? 'Sudah paid' : 'Ditandai paid & plan diaktifkan' });
    }

    if (req.method === 'POST' && action === 'billing-cancel') {
      const id = String(req.body?.id || req.body?.orderCode || '').trim();
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      await ensureBillingOrdersTable();
      await sequelize.query(
        `UPDATE saas_billing_orders
         SET status = 'cancel', updated_at = NOW()
         WHERE (id::text = :id OR order_code = :id)
           AND LOWER(status) <> 'paid'`,
        { replacements: { id } },
      );
      return res.json({ success: true, message: 'Order dibatalkan' });
    }

    if (req.method === 'POST' && action === 'billing-sync-midtrans') {
      const code = String(req.body?.orderCode || req.body?.id || '').trim();
      if (!code) return res.status(400).json({ success: false, error: 'orderCode required' });
      try {
        const { syncOrderFromMidtrans } = await import('@/lib/saas/humanify-billing');
        const result = await syncOrderFromMidtrans(code);
        return res.json({
          success: true,
          data: result,
          message: (result as any)?.paid || (result as any)?.alreadyPaid
            ? 'Status Midtrans: lunas'
            : (result as any)?.failed
              ? 'Status Midtrans: gagal/kadaluarsa'
              : 'Status Midtrans disinkronkan',
        });
      } catch (e: any) {
        return res.status(e.statusCode || 400).json({ success: false, error: e.message });
      }
    }

    if (req.method === 'GET' && action === 'midtrans-status') {
      const { getMidtransPublicConfig, probeMidtransHealth } = await import('@/lib/saas/midtrans');
      const probe = req.query.probe === '1' ? await probeMidtransHealth() : null;
      return res.json({
        success: true,
        data: { ...getMidtransPublicConfig(), probe },
      });
    }

    if (req.method === 'GET' && action === 'billing-vouchers') {
      const vouchers = await listBillingVouchers(100);
      return res.json({ success: true, data: { vouchers } });
    }

    if (req.method === 'POST' && action === 'billing-voucher-create') {
      const body = req.body || {};
      const voucher = await createBillingVoucher({
        code: body.code,
        label: body.label,
        discountType: body.discountType === 'fixed' ? 'fixed' : 'percent',
        discountValue: Number(body.discountValue),
        maxDiscountIdr: body.maxDiscountIdr != null ? Number(body.maxDiscountIdr) : null,
        minAmountIdr: body.minAmountIdr != null ? Number(body.minAmountIdr) : 0,
        applicablePlans: Array.isArray(body.applicablePlans) ? body.applicablePlans : null,
        maxRedemptions: body.maxRedemptions != null ? Number(body.maxRedemptions) : null,
        validFrom: body.validFrom || null,
        validUntil: body.validUntil || null,
        note: body.note || null,
        createdBy: String((session.user as any)?.email || ''),
      });
      return res.status(201).json({ success: true, data: voucher });
    }

    if (req.method === 'POST' && action === 'billing-voucher-toggle') {
      const id = String(req.body?.id || '');
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      const isActive = Boolean(req.body?.isActive);
      const row = await setBillingVoucherActive(id, isActive);
      if (!row) return res.status(404).json({ success: false, error: 'Voucher not found' });
      return res.json({ success: true, data: row });
    }

    if (req.method === 'POST' && action === 'billing-voucher-preview') {
      const code = String(req.body?.code || '').trim().toUpperCase();
      const amountIdr = Number(req.body?.amountIdr || 0);
      const plan = req.body?.plan || null;
      const vouchers = await listBillingVouchers(200);
      const voucher = vouchers.find((v) => String(v.code).toUpperCase() === code);
      if (!voucher) return res.status(404).json({ success: false, error: 'Kode tidak ditemukan' });
      const preview = computeVoucherDiscount(voucher, amountIdr, plan);
      return res.json({ success: true, data: { voucher, ...preview, netIdr: Math.max(0, amountIdr - preview.discountIdr) } });
    }

    if (req.method === 'GET' && action === 'plan-catalog') {
      await refreshPlanCatalogCache(true);
      const plans = await listPlanCatalog();
      const { getSeatPricingRates } = await import('@/lib/saas/seat-pricing');
      const seatPricing = await getSeatPricingRates();
      return res.json({
        success: true,
        data: {
          plans,
          seatPricing,
          featureOrder: HUMANIFY_FEATURE_ORDER,
          featureLabels: HUMANIFY_FEATURE_LABELS,
        },
      });
    }

    if (req.method === 'GET' && action === 'audit-log') {
      const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '80'), 10) || 80));
      const search = String(req.query.search || '').trim();
      const tenantId = String(req.query.tenantId || '').trim();
      const events = await listPlatformAudit({
        limit,
        search: search || undefined,
        tenantId: tenantId || undefined,
      });
      return res.json({ success: true, data: { events } });
    }

    if (req.method === 'GET' && action === 'support-queue') {
      const data = await getSupportQueue();
      return res.json({ success: true, data });
    }

    if (req.method === 'GET' && action === 'users') {
      const search = String(req.query.search || '').trim();
      const scopeRaw = String(req.query.scope || 'all').toLowerCase();
      const scope = scopeRaw === 'platform' || scopeRaw === 'tenant' ? scopeRaw : 'all';
      const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '80'), 10) || 80));
      const data = await listPlatformUsers({
        search: search || undefined,
        scope,
        limit,
      });
      return res.json({ success: true, data });
    }

    if (req.method === 'PATCH' && action === 'user-status') {
      const body = req.body || {};
      const userId = String(body.id || body.userId || '').trim();
      if (!userId) return res.status(400).json({ success: false, error: 'id required' });
      const isActive = body.isActive === true || body.is_active === true
        || body.isActive === 'true' || body.status === 'active';
      const deactivate = body.isActive === false || body.is_active === false
        || body.isActive === 'false' || body.status === 'inactive' || body.status === 'disabled';
      if (!isActive && !deactivate) {
        return res.status(400).json({ success: false, error: 'isActive required' });
      }
      try {
        const data = await setPlatformUserActive({
          userId,
          isActive: deactivate ? false : true,
          actorUserId: (session.user as any)?.id != null ? String((session.user as any).id) : null,
          actorEmail: String((session.user as any)?.email || 'platform_ops'),
          ip: String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || null,
        });
        return res.json({
          success: true,
          data,
          message: data.isActive ? 'Pengguna diaktifkan' : 'Pengguna dinonaktifkan',
        });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e?.message || 'Gagal mengubah status pengguna' });
      }
    }

    if (req.method === 'GET' && action === 'system-status') {
      const data = await getSystemStatus();
      return res.json({ success: true, data });
    }

    if (req.method === 'GET' && action === 'notifications') {
      const data = await getPlatformNotifications();
      return res.json({ success: true, data });
    }

    if (req.method === 'GET' && action === 'subscriptions') {
      const data = await listSubscriptions();
      return res.json({ success: true, data });
    }

    if (req.method === 'POST' && action === 'extend-trial') {
      const tenantId = String(req.body?.id || req.body?.tenantId || '').trim();
      const days = Number(req.body?.days || 14);
      try {
        const data = await extendTenantTrial({
          tenantId,
          days,
          actorEmail: String((session.user as any)?.email || 'platform_ops'),
          actorUserId: (session.user as any)?.id != null ? String((session.user as any).id) : null,
          ip: String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || null,
        });
        return res.json({ success: true, data, message: `Trial diperpanjang ${days} hari` });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e?.message || 'Gagal perpanjang trial' });
      }
    }

    if (req.method === 'GET' && action === 'tickets') {
      const data = await listSupportTickets(Number(req.query.limit) || 80);
      return res.json({ success: true, data });
    }

    if (req.method === 'POST' && action === 'ticket') {
      try {
        const row = await createSupportTicket({
          subject: req.body?.subject,
          body: req.body?.body,
          tenantId: req.body?.tenantId || req.body?.tenant_id || null,
          source: req.body?.source,
          priority: req.body?.priority,
          requesterEmail: req.body?.requesterEmail || req.body?.requester_email,
          createdBy: String((session.user as any)?.email || 'platform_ops'),
          actorUserId: (session.user as any)?.id != null ? String((session.user as any).id) : null,
          ip: String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || null,
        });
        return res.json({ success: true, data: row, message: 'Tiket dibuat' });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e?.message || 'Gagal membuat tiket' });
      }
    }

    if (req.method === 'PATCH' && action === 'ticket') {
      const id = String(req.body?.id || '').trim();
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      try {
        const row = await updateSupportTicket({
          id,
          status: req.body?.status,
          priority: req.body?.priority,
          assigneeEmail: req.body?.assigneeEmail ?? req.body?.assignee_email,
          actorEmail: String((session.user as any)?.email || 'platform_ops'),
          actorUserId: (session.user as any)?.id != null ? String((session.user as any).id) : null,
          ip: String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || null,
        });
        return res.json({ success: true, data: row, message: 'Tiket diperbarui' });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e?.message || 'Gagal memperbarui tiket' });
      }
    }

    if (req.method === 'GET' && action === 'banners') {
      const banners = await listLandingBanners();
      return res.json({ success: true, data: { banners } });
    }

    if (req.method === 'POST' && action === 'banner') {
      const body = req.body || {};
      try {
        const row = await createLandingBanner({
          title: body.title,
          subtitle: body.subtitle,
          imageUrl: body.imageUrl || body.image_url,
          ctaLabel: body.ctaLabel || body.cta_label,
          ctaHref: body.ctaHref || body.cta_href,
          placement: body.placement,
          sortOrder: body.sortOrder ?? body.sort_order,
          isActive: body.isActive ?? body.is_active,
          startsAt: body.startsAt || body.starts_at || null,
          endsAt: body.endsAt || body.ends_at || null,
          createdBy: String((session.user as any)?.email || 'platform_ops'),
          actorUserId: (session.user as any)?.id != null ? String((session.user as any).id) : null,
          ip: String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || null,
        });
        return res.json({ success: true, data: row, message: 'Banner dibuat' });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e?.message || 'Gagal membuat banner' });
      }
    }

    if (req.method === 'PATCH' && action === 'banner') {
      const body = req.body || {};
      const id = String(body.id || '').trim();
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      try {
        const row = await updateLandingBanner({
          id,
          title: body.title,
          subtitle: body.subtitle,
          imageUrl: body.imageUrl || body.image_url,
          ctaLabel: body.ctaLabel ?? body.cta_label,
          ctaHref: body.ctaHref ?? body.cta_href,
          placement: body.placement,
          sortOrder: body.sortOrder ?? body.sort_order,
          isActive: body.isActive ?? body.is_active,
          startsAt: body.startsAt ?? body.starts_at,
          endsAt: body.endsAt ?? body.ends_at,
          actorEmail: String((session.user as any)?.email || 'platform_ops'),
          actorUserId: (session.user as any)?.id != null ? String((session.user as any).id) : null,
          ip: String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || null,
        });
        return res.json({ success: true, data: row, message: 'Banner diperbarui' });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e?.message || 'Gagal memperbarui banner' });
      }
    }

    if (req.method === 'DELETE' && action === 'banner') {
      const id = String(req.body?.id || req.query.id || '').trim();
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      try {
        await deleteLandingBanner({
          id,
          actorEmail: String((session.user as any)?.email || 'platform_ops'),
          actorUserId: (session.user as any)?.id != null ? String((session.user as any).id) : null,
          ip: String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || null,
        });
        return res.json({ success: true, message: 'Banner dihapus' });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e?.message || 'Gagal menghapus banner' });
      }
    }

    if (req.method === 'PATCH' && action === 'plan-catalog') {
      const body = req.body || {};
      const planId = String(body.planId || body.id || '').toLowerCase();
      if (!planId) return res.status(400).json({ success: false, error: 'planId required' });
      const features = Array.isArray(body.features)
        ? (body.features as string[]).filter((f): f is HumanifyFeature =>
            HUMANIFY_FEATURE_ORDER.includes(f as HumanifyFeature),
          )
        : undefined;
      const row = await upsertPlanCatalog({
        planId,
        name: body.name,
        description: body.description,
        priceMonthlyIdr: body.priceMonthlyIdr != null ? Number(body.priceMonthlyIdr) : undefined,
        priceYearlyIdr: body.priceYearlyIdr != null ? Number(body.priceYearlyIdr) : undefined,
        maxUsers: body.maxUsers != null ? Number(body.maxUsers) : undefined,
        maxEmployees: body.maxEmployees != null ? Number(body.maxEmployees) : undefined,
        features,
      });
      return res.json({ success: true, data: row, message: `Paket ${planId} diperbarui` });
    }

    if (req.method === 'PATCH' && action === 'seat-pricing') {
      const body = req.body || {};
      const { upsertSeatPricingRates } = await import('@/lib/saas/seat-pricing');
      const row = await upsertSeatPricingRates({
        pricePerUserIdr: body.pricePerUserIdr != null ? Number(body.pricePerUserIdr) : undefined,
        pricePerUserOver250Idr: body.pricePerUserOver250Idr != null ? Number(body.pricePerUserOver250Idr) : undefined,
        pricePerUserOver1000Idr: body.pricePerUserOver1000Idr != null ? Number(body.pricePerUserOver1000Idr) : undefined,
        lmsPerUserIdr: body.lmsPerUserIdr != null ? Number(body.lmsPerUserIdr) : undefined,
        aiMonthlyIdr: body.aiMonthlyIdr != null ? Number(body.aiMonthlyIdr) : undefined,
        yearlyDiscountPct: body.yearlyDiscountPct != null ? Number(body.yearlyDiscountPct) : undefined,
      });
      return res.json({ success: true, data: row, message: 'Harga per karyawan diperbarui' });
    }

    const actorEmail = String((session.user as any)?.email || 'platform_ops');
    const actorUserId = (session.user as any)?.id != null ? String((session.user as any).id) : null;
    const actorIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || null;

    if (req.method === 'GET' && action === 'crm-leads') {
      const data = await listSalesLeads(Number(req.query.limit) || 200);
      return res.json({ success: true, data });
    }
    if (req.method === 'POST' && action === 'crm-lead') {
      try {
        const data = await createSalesLead({
          company: req.body?.company,
          pic: req.body?.pic,
          email: req.body?.email,
          phone: req.body?.phone,
          source: req.body?.source,
          interest: req.body?.interest,
          estimatedDealIdr: Number(req.body?.estimatedDealIdr || 0),
          ownerEmail: req.body?.ownerEmail,
          nextFollowUp: req.body?.nextFollowUp,
          note: req.body?.note,
          actorEmail,
          actorUserId,
          ip: actorIp,
        });
        return res.status(201).json({ success: true, data });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e?.message || 'Gagal simpan lead' });
      }
    }
    if (req.method === 'PATCH' && action === 'crm-lead') {
      const data = await updateSalesLead({
        id: String(req.body?.id || ''),
        status: req.body?.status,
        ownerEmail: req.body?.ownerEmail,
        nextFollowUp: req.body?.nextFollowUp,
        estimatedDealIdr: req.body?.estimatedDealIdr != null ? Number(req.body.estimatedDealIdr) : undefined,
        note: req.body?.note,
        actorEmail,
        actorUserId,
        ip: actorIp,
      });
      if (!data) return res.status(404).json({ success: false, error: 'Lead tidak ditemukan' });
      return res.json({ success: true, data });
    }

    if (req.method === 'GET' && action === 'finance-tx') {
      const data = await listFinanceTransactions(Number(req.query.limit) || 120);
      return res.json({ success: true, data });
    }
    if (req.method === 'POST' && action === 'finance-refund') {
      try {
        const data = await requestRefund({
          orderId: String(req.body?.orderId || req.body?.id || ''),
          actorEmail,
          actorUserId,
          ip: actorIp,
        });
        return res.json({ success: true, data, message: data.message });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e?.message || 'Gagal refund' });
      }
    }

    if (req.method === 'GET' && action === 'approvals') {
      const data = await listApprovals({
        status: String(req.query.status || 'all'),
        limit: Number(req.query.limit) || 80,
      });
      return res.json({ success: true, data });
    }
    if (req.method === 'POST' && action === 'approval-decide') {
      const id = String(req.body?.id || '');
      const decision = req.body?.decision === 'rejected' ? 'rejected' : 'approved';
      const row = await decideApproval({
        id,
        decision,
        decidedBy: actorEmail,
        actorUserId,
        ip: actorIp,
      });
      if (!row) return res.status(404).json({ success: false, error: 'Approval tidak ditemukan atau sudah diputuskan' });
      if (decision === 'approved' && row.kind === 'refund') {
        try {
          await executeApprovedRefund(row.id, actorEmail);
        } catch (e: any) {
          return res.status(400).json({ success: false, error: e?.message || 'Gagal eksekusi refund' });
        }
      }
      return res.json({ success: true, data: row, message: decision === 'approved' ? 'Disetujui' : 'Ditolak' });
    }

    if (req.method === 'GET' && action === 'campaigns') {
      const data = await listCampaigns();
      return res.json({ success: true, data });
    }
    if (req.method === 'POST' && action === 'campaign') {
      try {
        const data = await upsertCampaign({
          id: req.body?.id,
          name: req.body?.name,
          channel: req.body?.channel,
          status: req.body?.status,
          startsAt: req.body?.startsAt,
          endsAt: req.body?.endsAt,
          impressions: req.body?.impressions,
          visitors: req.body?.visitors,
          budgetIdr: req.body?.budgetIdr,
          note: req.body?.note,
          actorEmail,
          actorUserId,
          ip: actorIp,
        });
        return res.json({ success: true, data });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e?.message || 'Gagal simpan campaign' });
      }
    }
    if (req.method === 'GET' && action === 'marketing-funnel') {
      const data = await getMarketingFunnel(String(req.query.period || '30d'));
      return res.json({ success: true, data });
    }

    if (req.method === 'GET' && action === 'faqs') {
      const data = await listCmsFaqs();
      return res.json({ success: true, data });
    }
    if (req.method === 'POST' && action === 'faq') {
      try {
        const data = await upsertCmsFaq({
          id: req.body?.id,
          question: req.body?.question,
          answer: req.body?.answer,
          category: req.body?.category,
          sortOrder: req.body?.sortOrder,
          actorEmail,
          actorUserId,
          ip: actorIp,
        });
        return res.status(201).json({ success: true, data });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e?.message || 'Gagal simpan FAQ' });
      }
    }
    if (req.method === 'POST' && action === 'faq-advance') {
      try {
        const data = await advanceCmsFaq({
          id: String(req.body?.id || ''),
          actorEmail,
          actorUserId,
          ip: actorIp,
        });
        if (!data) return res.status(404).json({ success: false, error: 'FAQ tidak ditemukan' });
        return res.json({ success: true, data });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e?.message || 'Gagal update FAQ' });
      }
    }
    if (req.method === 'POST' && action === 'faq-unpublish') {
      const data = await unpublishCmsFaq(String(req.body?.id || ''));
      if (!data) return res.status(404).json({ success: false, error: 'FAQ tidak ditemukan' });
      return res.json({ success: true, data });
    }

    if (req.method === 'GET' && action === 'analytics') {
      const data = await getAnalyticsReport(
        String(req.query.period || '30d'),
        String(req.query.from || ''),
        String(req.query.to || ''),
      );
      return res.json({ success: true, data });
    }

    if (req.method === 'GET' && action === 'staff-desks') {
      const desks = await listStaffDesks();
      return res.json({ success: true, data: { desks } });
    }
    if (req.method === 'POST' && action === 'staff-desk') {
      try {
        const data = await setStaffDesk({
          userId: String(req.body?.userId || req.body?.id || ''),
          email: req.body?.email,
          desk: String(req.body?.desk || 'cs'),
          actorEmail,
          actorUserId,
          ip: actorIp,
        });
        return res.json({ success: true, data });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e?.message || 'Gagal simpan desk' });
      }
    }

    if (req.method === 'GET' && action === 'articles') {
      const data = await listCmsArticles();
      return res.json({ success: true, data });
    }
    if (req.method === 'POST' && action === 'article') {
      try {
        const data = await upsertCmsArticle({
          id: req.body?.id,
          title: req.body?.title,
          body: req.body?.body,
          excerpt: req.body?.excerpt,
          slug: req.body?.slug,
          actorEmail,
          actorUserId,
          ip: actorIp,
        });
        return res.status(201).json({ success: true, data });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e?.message || 'Gagal simpan artikel' });
      }
    }
    if (req.method === 'POST' && action === 'article-advance') {
      try {
        const data = await advanceCmsArticle({
          id: String(req.body?.id || ''),
          actorEmail,
          actorUserId,
          ip: actorIp,
        });
        if (!data) return res.status(404).json({ success: false, error: 'Artikel tidak ditemukan' });
        return res.json({ success: true, data });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e?.message || 'Gagal update artikel' });
      }
    }
    if (req.method === 'POST' && action === 'article-unpublish') {
      const data = await unpublishCmsArticle(String(req.body?.id || ''));
      if (!data) return res.status(404).json({ success: false, error: 'Artikel tidak ditemukan' });
      return res.json({ success: true, data });
    }

    if (req.method === 'GET' && action === 'insights') {
      const data = await getBusinessInsights();
      return res.json({ success: true, data });
    }

    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
