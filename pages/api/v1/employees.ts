/**
 * Public Humanify API v1 — Bearer API key auth
 * GET /api/v1/employees
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateBearer } from '@/lib/saas/humanify-api-keys';
import { resolveTenantPlan } from '@/lib/saas/assert-feature';
import { planHasFeature } from '@/lib/saas/plan-entitlements';
import { listTenantEmployeesLean } from '@/lib/saas/humanify-employees';
import { checkLimit, RateLimitTier } from '@/lib/middleware/rateLimit';
import { withObservability } from '@/lib/observability';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Rate limit public API (per IP) — applied before auth so headers are present
  // even on 401/403 and abusive unauthenticated traffic is throttled.
  if (!checkLimit(req, res, RateLimitTier.STANDARD)) return;

  const auth = await authenticateBearer(
    req.headers.authorization,
    'employees:read',
  );
  if (!auth) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API key',
      hint: 'Authorization: Bearer hfy_live_…',
    });
  }

  const plan = await resolveTenantPlan(auth.tenantId);
  if (!planHasFeature(plan, 'api')) {
    return res.status(403).json({
      success: false,
      error: 'FEATURE_NOT_IN_PLAN',
      message: 'API keys hanya tersedia di paket Enterprise / Trial.',
    });
  }

  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const rows = await listTenantEmployeesLean(auth.tenantId, limit);
    return res.json({
      success: true,
      data: rows,
      meta: { count: rows.length, tenantId: auth.tenantId, keyName: auth.name },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Error' });
  }
}

export default withObservability(handler, 'api/v1/employees');
