/**
 * Humanify SaaS Phase 1 — setup wizard API
 * GET  — status (?companyId= for new-company tab, no JWT switch required)
 * POST — { action: 'save'|'complete', step?, data?, companyId? }
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
import { userCanAccessCompany } from '@/lib/saas/company-membership';
import { requestedSetupCompanyId } from '@/lib/saas/setup-tenant';
import { resolveTenantById } from '@/lib/saas/tenant-slug';

const OWNER_ROLES = new Set([
  'owner', 'admin', 'hq_admin', 'hr_admin', 'super_admin', 'superadmin',
]);

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function resolveSetupTenantId(req: NextApiRequest, session: any): Promise<string> {
  const sessionTid = String(session?.user?.tenantId || '').trim();
  const requested = requestedSetupCompanyId(
    req.query as Record<string, unknown>,
    (req.body || {}) as Record<string, unknown>,
  );
  if (!requested && !sessionTid) {
    throw new HttpError(400, 'Tidak ada tenant pada akun ini');
  }
  const tenantId = requested || sessionTid;
  const role = String(session?.user?.role || '').toLowerCase();
  const isSuperAdmin = ['super_admin', 'superadmin', 'platform_admin'].includes(role);

  try {
    const { setDbTenantContext } = require('@/lib/saas/tenant-slug');
    await setDbTenantContext(tenantId, isSuperAdmin);
  } catch {
    /* ignore */
  }

  if (requested && requested !== sessionTid) {
    const allowed = await userCanAccessCompany(session?.user?.id, requested);
    if (!allowed && !isSuperAdmin) {
      throw new HttpError(403, 'Anda tidak terdaftar pada perusahaan ini');
    }
  }

  const tenant = await resolveTenantById(tenantId);
  if (!tenant) throw new HttpError(404, 'Perusahaan tidak ditemukan');
  return tenantId;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session?.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const role = String((session.user as any).role || '').toLowerCase();
  if (!OWNER_ROLES.has(role)) {
    return res.status(403).json({ success: false, error: 'Hanya owner yang dapat menyelesaikan setup' });
  }

  try {
    const tenantId = await resolveSetupTenantId(req, session);

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
    const status = Number(e?.status) || 500;
    if (status >= 500) console.error('[saas-onboarding]', e);
    return res.status(status).json({ success: false, error: e.message || 'Gagal memproses onboarding' });
  }
}

export default withHQAuth(handler);
