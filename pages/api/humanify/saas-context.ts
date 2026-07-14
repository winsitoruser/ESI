/**
 * Current tenant SaaS context for HR users (careers URL, slug, plan)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import {
  backfillTenantSlugs,
  ensureTenantSlugColumn,
  ensureUniqueTenantSlug,
  resolveTenantById,
} from '@/lib/saas/tenant-slug';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const tenantId = (session.user as any).tenantId || null;
  if (!tenantId || !sequelize) {
    return res.json({
      success: true,
      data: { tenantId: null, slug: null, careersUrl: null, name: null },
    });
  }

  try {
    await ensureTenantSlugColumn();
    let tenant = await resolveTenantById(tenantId);
    if (tenant && !tenant.slug) {
      await backfillTenantSlugs();
      tenant = await resolveTenantById(tenantId);
    }
    if (tenant && !tenant.slug) {
      const slug = await ensureUniqueTenantSlug(tenant.name || 'company', tenantId);
      await sequelize.query(`UPDATE tenants SET slug = :slug WHERE id = :id`, {
        replacements: { slug, id: tenantId },
      });
      tenant = { ...tenant, slug };
    }

    return res.json({
      success: true,
      data: {
        tenantId,
        slug: tenant?.slug || null,
        name: tenant?.name || null,
        status: tenant?.status || null,
        subscriptionPlan: tenant?.subscriptionPlan || null,
        careersUrl: tenant?.slug ? `/c/${tenant.slug}/careers` : null,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
