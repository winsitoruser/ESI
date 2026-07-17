/**
 * Shared auth for Humanify public API `/api/v1/*`
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateBearer } from '@/lib/saas/humanify-api-keys';
import { resolveTenantPlan } from '@/lib/saas/assert-feature';
import { planHasFeature } from '@/lib/saas/plan-entitlements';
import { checkLimit, RateLimitTier } from '@/lib/middleware/rateLimit';

export type V1Auth = {
  tenantId: string;
  keyId: string;
  name: string;
  scopes: string[];
};

export async function requireV1Auth(
  req: NextApiRequest,
  res: NextApiResponse,
  requiredScope: string,
): Promise<V1Auth | null> {
  if (!checkLimit(req, res, RateLimitTier.STANDARD)) return null;

  const auth = await authenticateBearer(req.headers.authorization, requiredScope);
  if (!auth) {
    res.status(401).json({
      success: false,
      error: 'Invalid or missing API key',
      hint: 'Authorization: Bearer hfy_live_…',
    });
    return null;
  }

  const plan = await resolveTenantPlan(auth.tenantId);
  if (!planHasFeature(plan, 'api')) {
    res.status(403).json({
      success: false,
      error: 'FEATURE_NOT_IN_PLAN',
      message: 'API keys hanya tersedia di paket Enterprise / Trial.',
    });
    return null;
  }

  return auth as V1Auth;
}
