/**
 * Phase 19 — MFA/2FA management API (logged-in Humanify user).
 *   GET  ?action=status
 *   POST ?action=enroll             → { secret, otpauthUrl, qrDataUrl }
 *   POST ?action=confirm  { code }  → enable
 *   POST ?action=disable  { code }  → disable
 *   POST ?action=policy   { requireMfa } — owner/admin only
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { checkLimit, RateLimitTier } from '@/lib/middleware/rateLimit';
import {
  beginEnrollment,
  confirmEnrollment,
  disableMfa,
  getMfaStatus,
} from '@/lib/saas/mfa';
import { isTenantMfaRequired, setTenantMfaRequired } from '@/lib/saas/mfa-policy';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

const POLICY_ROLES = new Set(['owner', 'hq_admin', 'admin']);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const userId = (session.user as any).id as string;
  const tenantId = ((session.user as any).tenantId as string) || null;
  const email = (session.user.email as string) || '';
  const role = String((session.user as any).role || '').toLowerCase();
  if (!userId) return res.status(400).json({ success: false, error: 'No user context' });

  const action = String(req.query.action || (req.method === 'GET' ? 'status' : ''));

  try {
    if (req.method === 'GET' && action === 'status') {
      const [data, requireMfa] = await Promise.all([
        getMfaStatus(userId),
        isTenantMfaRequired(tenantId),
      ]);
      return res.json({
        success: true,
        data: {
          ...data,
          tenantRequireMfa: requireMfa,
          canManagePolicy: POLICY_ROLES.has(role),
        },
      });
    }

    if (req.method === 'POST' && action === 'enroll') {
      if (!(await checkLimit(req, res, RateLimitTier.SENSITIVE))) return;
      const { secret, otpauthUrl, qrDataUrl } = await beginEnrollment({ userId, tenantId, email });
      return res.json({ success: true, data: { secret, otpauthUrl, qrDataUrl } });
    }

    if (req.method === 'POST' && action === 'confirm') {
      if (!(await checkLimit(req, res, RateLimitTier.AUTH))) return;
      const code = String(req.body?.code || '');
      const result = await confirmEnrollment(userId, code);
      if (!result.ok) return res.status(400).json({ success: false, error: 'Kode salah atau kedaluwarsa' });
      return res.json({
        success: true,
        message: '2FA aktif — simpan kode pemulihan Anda',
        data: { recoveryCodes: result.recoveryCodes || [] },
      });
    }

    if (req.method === 'POST' && action === 'regenerate-recovery') {
      if (!(await checkLimit(req, res, RateLimitTier.AUTH))) return;
      const code = String(req.body?.code || '');
      const { verifyMfaCode, issueRecoveryCodes, isMfaEnabled } = await import('@/lib/saas/mfa');
      if (!(await isMfaEnabled(userId))) {
        return res.status(400).json({ success: false, error: '2FA belum aktif' });
      }
      if (!(await verifyMfaCode(userId, code))) {
        return res.status(400).json({ success: false, error: 'Kode 2FA salah' });
      }
      const recoveryCodes = await issueRecoveryCodes(userId);
      return res.json({ success: true, data: { recoveryCodes } });
    }

    if (req.method === 'POST' && action === 'disable') {
      if (!(await checkLimit(req, res, RateLimitTier.AUTH))) return;
      if (tenantId && (await isTenantMfaRequired(tenantId))) {
        return res.status(400).json({
          success: false,
          error: 'Kebijakan tenant mewajibkan 2FA — nonaktifkan kebijakan dulu',
        });
      }
      const code = String(req.body?.code || '');
      const ok = await disableMfa(userId, code);
      if (!ok) return res.status(400).json({ success: false, error: 'Kode salah — 2FA tetap aktif' });
      return res.json({ success: true, message: '2FA dinonaktifkan' });
    }

    if (req.method === 'POST' && action === 'policy') {
      if (!POLICY_ROLES.has(role)) {
        return res.status(403).json({ success: false, error: 'Hanya owner/admin yang dapat mengubah kebijakan 2FA' });
      }
      if (!tenantId) {
        return res.status(400).json({ success: false, error: 'Tenant tidak ditemukan' });
      }
      if (!(await checkLimit(req, res, RateLimitTier.SENSITIVE))) return;
      const requireMfa = Boolean(req.body?.requireMfa);
      const data = await setTenantMfaRequired(tenantId, requireMfa);
      try {
        const { logAdminAction } = await import('@/lib/saas/admin-audit');
        await logAdminAction({
          tenantId,
          actorUserId: userId,
          actorEmail: email,
          action: 'security.mfa_policy',
          resourceType: 'tenant',
          resourceId: tenantId,
          meta: { requireMfa },
        });
      } catch { /* ignore */ }
      return res.json({ success: true, data });
    }

    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Error' });
  }
}

export default withHQAuth(handler);
