/**
 * Platform Control Plane API — Humanify SaaS ops
 * GET ?action=overview|tenants|tenant|metrics
 * PATCH ?action=tenant-status|tenant-plan
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';
import { backfillTenantSlugs, ensureTenantSlugColumn } from '@/lib/saas/tenant-slug';
import {
  computeTenantHealth,
  estimateMrrFromTenants,
  formatIdr,
} from '@/lib/saas/platform-metrics';
import { HUMANIFY_PLANS } from '@/lib/saas/plan-entitlements';

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
          ${setupExpr}
        FROM tenants
      `);

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

      // MRR / health — list-price estimate until billing live
      const [metricRows] = await sequelize.query(`
        SELECT t.id, t.slug, t.status,
          ${cols.has('subscription_plan') ? 't.subscription_plan' : 'NULL AS subscription_plan'},
          ${cols.has('setup_completed') ? 't.setup_completed' : 'NULL AS setup_completed'},
          t.created_at,
          (SELECT COUNT(*)::int FROM users u WHERE u.tenant_id = t.id) AS user_count,
          (SELECT COUNT(*)::int FROM employees e WHERE e.tenant_id = t.id AND COALESCE(e.is_active, true)) AS employee_count
        FROM tenants t
      `);

      const revenue = estimateMrrFromTenants(metricRows || []);
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
            mrrIdr: revenue.mrrIdr,
            arrIdr: revenue.arrIdr,
            mrrFormatted: formatIdr(revenue.mrrIdr),
            arrFormatted: formatIdr(revenue.arrIdr),
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
            pricingNote: 'Estimated from list prices × paying tenants (billing live di Phase 4)',
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

    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
