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
import { isTenantEmailVerified } from '@/lib/saas/email-verify';
import { getGoLiveStatus } from '@/lib/saas/go-live';
import { buildAccountAlerts, summarizeAlerts } from '@/lib/saas/account-alerts';

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
    const emailVerified = isPlatform ? true : await isTenantEmailVerified(tenantId);
    let goLivePct: number | null = null;
    if (!isPlatform) {
      try {
        goLivePct = (await getGoLiveStatus(tenantId)).pct;
      } catch { /* */ }
    }

    let trialEndsAt: string | null = null;
    let daysLeftInTrial: number | null = null;
    let subscriptionEnd: string | null = null;
    try {
      const cols = await getTenantColumns();
      const select: string[] = [];
      if (cols.has('trial_ends_at')) {
        select.push('trial_ends_at');
        select.push('EXTRACT(DAY FROM (trial_ends_at - NOW()))::int AS days_left');
      }
      if (cols.has('subscription_end')) select.push('subscription_end');
      if (select.length) {
        const [rows] = await sequelize.query(
          `SELECT ${select.join(', ')} FROM tenants WHERE id = :id LIMIT 1`,
          { replacements: { id: tenantId } },
        );
        const r = rows?.[0];
        if (r?.trial_ends_at) {
          trialEndsAt = r.trial_ends_at;
          daysLeftInTrial = r.days_left;
        }
        if (r?.subscription_end) subscriptionEnd = r.subscription_end;
      }
    } catch { /* */ }

    const alerts = isPlatform
      ? []
      : buildAccountAlerts({
          planId: entitlements.planId,
          status: tenant?.status || null,
          subscriptionEnd,
          trialEndsAt,
          daysLeftInTrial,
          seats,
          emailVerified,
          goLivePct,
        });

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
        emailVerified,
        goLivePct,
        trialEndsAt,
        daysLeftInTrial,
        subscriptionEnd,
        alerts,
        alertCounts: summarizeAlerts(alerts),
        subdomainHint: tenant?.slug ? `https://${tenant.slug}.humanify.id` : null,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
