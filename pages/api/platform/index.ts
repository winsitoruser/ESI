/**
 * Platform Control Plane API — Humanify SaaS ops
 * GET   ?action=overview|tenants|tenant|tenant-detail|billing-orders|expiring-trials|partners|partner-leads|partner-leads-export|partner-commission-export|partner-commission-summary|commission-preview
 * PATCH ?action=tenant-status|tenant-plan
 * POST  ?action=dunning-scan|partner-create|partner-lead-status|cleanup-qa|archive-qa|impersonate|end-impersonate
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';
import { backfillTenantSlugs, ensureTenantSlugColumn } from '@/lib/saas/tenant-slug';
import {
  computePaidOrdersMrr,
  computeTenantHealth,
  estimateMrrFromTenants,
  formatIdr,
} from '@/lib/saas/platform-metrics';
import { HUMANIFY_PLANS } from '@/lib/saas/plan-entitlements';
import { listExpiringTrials, runDunningScan } from '@/lib/saas/humanify-billing';
import {
  archiveSuspendedQaTenants,
  cleanupQaTenants,
  createPartner,
  estimatePartnerCommission,
  listPartners,
  previewPartnerCommission,
  QA_TENANT_SLUG_REGEX,
  resolvePartnerByCode,
} from '@/lib/saas/partners';
import { parseTenantSettings } from '@/lib/saas/tenant-schema';
import { listPartnerLeads, updatePartnerLeadStatus, exportPartnerLeadsCsv } from '@/lib/hris/partner-leads';

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
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const role = (session.user as any).role;
  if (!isPlatformOperator(role)) {
    return res.status(403).json({ success: false, error: 'Platform operator only' });
  }

  if (!sequelize) return res.status(503).json({ success: false, error: 'Database unavailable' });

  const action = String(req.query.action || 'overview');

  try {
    await ensureTenantSlugColumn();
    const cols = await tenantCols();
    const nsql = nameSql(cols);

    if (req.method === 'GET' && action === 'overview') {
      await backfillTenantSlugs();

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
      try {
        const [sig] = await sequelize.query(`
          SELECT
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS d7,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS d30
          FROM tenants
        `);
        signups7 = sig[0]?.d7 || 0;
        signups30 = sig[0]?.d30 || 0;
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
          },
          plans,
          recentTenants: recent,
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
          SELECT id, name, email, role, created_at
          FROM users WHERE tenant_id = :id
          ORDER BY (CASE WHEN role IN ('owner', 'admin', 'super_admin') THEN 0 ELSE 1 END), created_at ASC
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
        },
      });
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
      const conditions = [`LOWER(status) = 'paid'`, `partner_code IS NOT NULL`, `partner_code <> ''`];
      const repl: Record<string, unknown> = { lim };
      if (partnerCode) {
        conditions.push('UPPER(partner_code) = :partnerCode');
        repl.partnerCode = partnerCode;
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

    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
