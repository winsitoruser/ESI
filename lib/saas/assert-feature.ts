/**
 * Assert Humanify plan feature for API handlers.
 * Platform operators always bypass.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  featureForApiPath,
  planHasFeature,
  type HumanifyFeature,
} from '@/lib/saas/plan-entitlements';
import { getTenantColumns } from '@/lib/saas/tenant-schema';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

const PLATFORM_ROLES = new Set(['super_admin', 'superadmin', 'platform_admin']);

export async function resolveTenantPlan(tenantId: string | null | undefined): Promise<string | null> {
  if (!tenantId || !sequelize) return null;
  const cols = await getTenantColumns();
  if (!cols.has('subscription_plan')) return null;
  const [rows] = await sequelize.query(
    `SELECT subscription_plan FROM tenants WHERE id = :id LIMIT 1`,
    { replacements: { id: tenantId } },
  );
  return rows?.[0]?.subscription_plan || null;
}

export async function assertHumanifyFeature(
  req: NextApiRequest,
  res: NextApiResponse,
  opts: {
    tenantId?: string | null;
    role?: string | null;
    feature?: HumanifyFeature;
    path?: string;
  },
): Promise<boolean> {
  const role = String(opts.role || '').toLowerCase();
  if (PLATFORM_ROLES.has(role)) return true;

  const feature = opts.feature || featureForApiPath(opts.path || req.url || '');
  if (feature === 'core') return true;

  const plan = await resolveTenantPlan(opts.tenantId);
  if (planHasFeature(plan, feature)) return true;

  res.status(403).json({
    success: false,
    error: 'FEATURE_NOT_IN_PLAN',
    message: `Fitur "${feature}" tidak termasuk dalam paket Anda. Silakan upgrade.`,
    feature,
    plan: plan || 'unknown',
  });
  return false;
}

/** After session is known — enforce plan feature for this API path. */
export async function enforceHumanifyPlanFeature(
  req: NextApiRequest,
  res: NextApiResponse,
  session: { user?: { tenantId?: string | null; role?: string | null } } | null | undefined,
): Promise<boolean> {
  if (!session?.user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return false;
  }
  return assertHumanifyFeature(req, res, {
    tenantId: (session.user as any).tenantId,
    role: (session.user as any).role,
    path: req.url || '',
  });
}
