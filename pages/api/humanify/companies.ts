/**
 * Humanify multi-company
 * GET  — list companies the current user may switch into
 * POST { action: 'switch', tenantId }
 * POST { action: 'create', companyName, industry?, employeeRange? }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { checkLimit } from '@/lib/middleware/rateLimit';
import {
  canManageCompanies,
  createCompanyForUser,
  isTenantUuid,
  listCompaniesForUser,
  shouldShowCompanySwitcher,
  userCanAccessCompany,
} from '@/lib/saas/company-membership';
import { resolveTenantById } from '@/lib/saas/tenant-slug';
import { isSaasOnboardingComplete } from '@/lib/saas/humanify-onboarding';
import { newCompanySetupHref } from '@/lib/saas/company-onboarding-flow';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session?.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const userId = (session.user as any).id;
  const role = String((session.user as any).role || '');
  const activeTenantId = tenantIdFromSession(session);
  const impersonating = Boolean((session.user as any).impersonating);

  try {
    if (req.method === 'GET') {
      const data = await listCompaniesForUser({
        userId,
        role,
        homeTenantId: impersonating ? null : activeTenantId,
        activeTenantId,
        skipBackfill: impersonating,
      });
      const active = data.companies.find((c) => c.isActive) || data.companies.find((c) => c.isDefault);
      return res.json({
        success: true,
        data: {
          ...data,
          showSwitcher: shouldShowCompanySwitcher({
            canCreate: data.canCreate,
            companyCount: data.companies.length,
          }),
          activeName: active?.name || (session.user as any).tenantName || (session.user as any).businessName || null,
          impersonating,
        },
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const action = String(req.body?.action || req.query.action || '').toLowerCase();

    if (action === 'switch') {
      if (impersonating) {
        return res.status(403).json({
          success: false,
          error: 'Keluar dari support mode sebelum mengganti perusahaan',
        });
      }
      const tenantId = String(req.body?.tenantId || '').trim();
      if (!isTenantUuid(tenantId)) {
        return res.status(400).json({ success: false, error: 'tenantId tidak valid' });
      }
      const allowed = await userCanAccessCompany(userId, tenantId);
      if (!allowed) {
        return res.status(403).json({ success: false, error: 'Anda tidak terdaftar pada perusahaan ini' });
      }
      const tenant = await resolveTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ success: false, error: 'Perusahaan tidak ditemukan' });
      }
      const setupCompleted = await isSaasOnboardingComplete(tenantId);
      return res.json({
        success: true,
        message: `Beralih ke ${tenant.name}`,
        data: {
          tenantId: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          setupCompleted,
          sessionPatch: { switchCompanyId: tenant.id },
          redirectTo: setupCompleted ? '/humanify' : '/humanify/setup',
        },
      });
    }

    if (action === 'create') {
      if (impersonating) {
        return res.status(403).json({ success: false, error: 'Tidak dapat menambah perusahaan saat support mode' });
      }
      if (!canManageCompanies(role)) {
        return res.status(403).json({ success: false, error: 'Hanya owner/admin yang dapat menambah perusahaan' });
      }
      if (!(await checkLimit(req, res, {
        windowMs: 10 * 60 * 1000,
        maxRequests: 8,
        message: 'Terlalu banyak percobaan menambah perusahaan. Coba lagi nanti.',
      }))) return;

      const result = await createCompanyForUser({
        userId,
        role,
        homeTenantId: activeTenantId,
        ownerName: session.user.name || null,
        email: session.user.email || null,
        companyName: String(req.body?.companyName || req.body?.name || ''),
        industry: req.body?.industry ? String(req.body.industry) : undefined,
        employeeRange: req.body?.employeeRange ? String(req.body.employeeRange) : undefined,
      });

      return res.status(201).json({
        success: true,
        message: 'Perusahaan baru dibuat. Lanjutkan setup workspace.',
        data: {
          ...result,
          sessionPatch: { switchCompanyId: result.tenantId },
          redirectTo: newCompanySetupHref(result.tenantId),
        },
      });
    }

    return res.status(400).json({ success: false, error: 'action tidak dikenali (switch|create)' });
  } catch (e: any) {
    const status = Number(e?.status) || 500;
    return res.status(status).json({
      success: false,
      error: e?.message || 'Gagal memproses perusahaan',
    });
  }
}

export default withHQAuth(handler);
