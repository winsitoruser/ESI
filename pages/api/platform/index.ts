/**
 * Platform Control Plane API — Humanify SaaS ops
 * GET ?action=overview|tenants|tenant
 * PATCH ?action=tenant-status  { id, status }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';
import { backfillTenantSlugs, ensureTenantSlugColumn } from '@/lib/saas/tenant-slug';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

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

    if (req.method === 'GET' && action === 'overview') {
      await backfillTenantSlugs();

      const [summary] = await sequelize.query(`
        SELECT
          COUNT(*)::int AS total_tenants,
          COUNT(*) FILTER (WHERE COALESCE(status, 'trial') = 'active')::int AS active,
          COUNT(*) FILTER (WHERE COALESCE(status, 'trial') = 'trial')::int AS trial,
          COUNT(*) FILTER (WHERE COALESCE(status, '') = 'suspended')::int AS suspended,
          COUNT(*) FILTER (WHERE setup_completed = true)::int AS setup_done
        FROM tenants
      `);

      const [plans] = await sequelize.query(`
        SELECT COALESCE(subscription_plan, 'none') AS plan, COUNT(*)::int AS count
        FROM tenants
        GROUP BY 1 ORDER BY count DESC
      `);

      const [employees] = await sequelize.query(`
        SELECT COUNT(*)::int AS total FROM employees WHERE COALESCE(is_active, true) = true
      `);

      const [recent] = await sequelize.query(`
        SELECT id, slug, COALESCE(business_name, name, code) AS name,
          status, subscription_plan, setup_completed, created_at
        FROM tenants
        ORDER BY created_at DESC NULLS LAST
        LIMIT 8
      `);

      return res.json({
        success: true,
        data: {
          summary: {
            ...summary[0],
            activeEmployees: employees[0]?.total || 0,
          },
          plans,
          recentTenants: recent,
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
        conditions.push('COALESCE(t.status, \'trial\') = :status');
        repl.status = status;
      }
      if (search) {
        conditions.push(`(
          t.business_name ILIKE :q OR t.name ILIKE :q OR t.slug ILIKE :q
          OR t.code ILIKE :q OR t.business_email ILIKE :q
        )`);
        repl.q = `%${search}%`;
      }

      const where = conditions.join(' AND ');
      const [countRows] = await sequelize.query(
        `SELECT COUNT(*)::int AS c FROM tenants t WHERE ${where}`,
        { replacements: repl },
      );
      const [rows] = await sequelize.query(`
        SELECT t.id, t.slug, COALESCE(t.business_name, t.name, t.code) AS name,
          t.business_email, t.status, t.subscription_plan, t.setup_completed,
          t.kyb_status, t.max_users, t.created_at, t.activated_at,
          (SELECT COUNT(*)::int FROM users u WHERE u.tenant_id = t.id) AS user_count,
          (SELECT COUNT(*)::int FROM employees e WHERE e.tenant_id = t.id AND COALESCE(e.is_active, true)) AS employee_count
        FROM tenants t
        WHERE ${where}
        ORDER BY t.created_at DESC NULLS LAST
        LIMIT :lim OFFSET :offset
      `, { replacements: repl });

      return res.json({
        success: true,
        data: {
          tenants: rows,
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
          (SELECT COUNT(*)::int FROM employees e WHERE e.tenant_id = t.id) AS employee_count,
          (SELECT COUNT(*)::int FROM hris_job_openings j WHERE j.tenant_id = t.id AND j.status = 'open') AS open_jobs
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
      await sequelize.query(`
        UPDATE tenants SET status = :status, updated_at = NOW(),
          is_active = CASE WHEN :status = 'suspended' OR :status = 'inactive' THEN false ELSE true END
        WHERE id = :id
      `, { replacements: { id, status } });
      return res.json({ success: true, message: `Tenant status → ${status}` });
    }

    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
