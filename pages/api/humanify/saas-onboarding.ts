/**
 * Humanify SaaS Phase 1 — setup wizard API
 * GET  — status
 * POST — { action: 'save'|'complete', step?, data? }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import {
  SAAS_ONBOARDING_STEPS,
  completeSaasOnboarding,
  getSaasOnboardingStatus,
  saveSaasOnboardingStep,
  type SaasOnboardingStepKey,
} from '@/lib/saas/humanify-onboarding';

const OWNER_ROLES = new Set(['owner', 'hq_admin', 'super_admin', 'superadmin']);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session?.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const tenantId = (session.user as any).tenantId as string | null;
  const role = String((session.user as any).role || '').toLowerCase();

  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'Tidak ada tenant pada akun ini' });
  }

  if (!OWNER_ROLES.has(role)) {
    return res.status(403).json({ success: false, error: 'Hanya owner yang dapat menyelesaikan setup' });
  }

  try {
    if (req.method === 'GET') {
      const data = await getSaasOnboardingStatus(tenantId);
      return res.json({
        success: true,
        data: {
          ...data,
          steps: SAAS_ONBOARDING_STEPS,
        },
      });
    }

    if (req.method === 'POST') {
      const { action, step, data } = req.body || {};

      if (action === 'complete') {
        const result = await completeSaasOnboarding(tenantId);
        return res.json({
          success: true,
          message: 'Setup selesai — selamat datang di Humanify!',
          data: result,
        });
      }

      if (action === 'save') {
        const stepKey = String(step || '') as SaasOnboardingStepKey;
        const valid = SAAS_ONBOARDING_STEPS.some((s) => s.key === stepKey);
        if (!valid) {
          return res.status(400).json({ success: false, error: 'Step tidak valid' });
        }
        const result = await saveSaasOnboardingStep(tenantId, stepKey, data || {});
        return res.json({ success: true, data: result });
      }

      return res.status(400).json({ success: false, error: 'Action tidak dikenal' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[saas-onboarding]', e);
    return res.status(500).json({ success: false, error: e.message || 'Gagal memproses onboarding' });
  }
}

export default withHQAuth(handler);
