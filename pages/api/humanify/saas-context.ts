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
import { buildEntitlementSnapshot } from '@/lib/saas/plan-entitlements';
import { getSeatUsage } from '@/lib/saas/seat-metering';
import { getTenantColumns } from '@/lib/saas/tenant-schema';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const tenantId = (session.user as any).tenantId || null;
  const role = String((session.user as any).role || '').toLowerCase();
  const isPlatform = ['super_admin', 'superadmin', 'platform_admin'].includes(role);

  if (!tenantId || !sequelize) {
    return res.json({
      success: true,
      data: {
        tenantId: null,
        slug: null,
        careersUrl: null,
        name: null,
        entitlements: isPlatform
          ? buildEntitlementSnapshot('enterprise')
          : buildEntitlementSnapshot('trial'),
      },
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

    const plan = isPlatform ? 'enterprise' : (tenant?.subscriptionPlan || 'trial');
    const entitlements = buildEntitlementSnapshot(plan);
    const seats = isPlatform ? null : await getSeatUsage(tenantId, plan);

    let trialEndsAt: string | null = null;
    let daysLeftInTrial: number | null = null;
    try {
      const cols = await getTenantColumns();
      if (cols.has('trial_ends_at')) {
        const [rows] = await sequelize.query(
          `SELECT trial_ends_at,
             EXTRACT(DAY FROM (trial_ends_at - NOW()))::int AS days_left
           FROM tenants WHERE id = :id LIMIT 1`,
          { replacements: { id: tenantId } },
        );
        if (rows?.[0]?.trial_ends_at) {
          trialEndsAt = rows[0].trial_ends_at;
          daysLeftInTrial = rows[0].days_left;
        }
      }
    } catch { /* */ }

    return res.json({
      success: true,
      data: {
        tenantId,
        slug: tenant?.slug || null,
        name: tenant?.name || null,
        status: tenant?.status || null,
        subscriptionPlan: plan,
        careersUrl: tenant?.slug ? `/c/${tenant.slug}/careers` : null,
        entitlements,
        seats,
        trialEndsAt,
        daysLeftInTrial,
        subdomainHint: tenant?.slug ? `https://${tenant.slug}.humanify.id` : null,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
