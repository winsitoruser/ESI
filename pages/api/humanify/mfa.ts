/**
 * Phase 19 — MFA/2FA management API (logged-in Humanify user).
 *   GET  ?action=status
 *   POST ?action=enroll             → { secret, otpauthUrl }
 *   POST ?action=confirm  { code }  → enable
 *   POST ?action=disable  { code }  → disable
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { checkLimit, RateLimitTier } from '@/lib/middleware/rateLimit';
import {
  beginEnrollment,
  confirmEnrollment,
  disableMfa,
  getMfaStatus,
} from '@/lib/saas/mfa';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const userId = (session.user as any).id as string;
  const tenantId = ((session.user as any).tenantId as string) || null;
  const email = (session.user.email as string) || '';
  if (!userId) return res.status(400).json({ success: false, error: 'No user context' });

  const action = String(req.query.action || (req.method === 'GET' ? 'status' : ''));

  try {
    if (req.method === 'GET' && action === 'status') {
      const data = await getMfaStatus(userId);
      return res.json({ success: true, data });
    }

    if (req.method === 'POST' && action === 'enroll') {
      if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
      const { secret, otpauthUrl } = await beginEnrollment({ userId, tenantId, email });
      return res.json({ success: true, data: { secret, otpauthUrl } });
    }

    if (req.method === 'POST' && action === 'confirm') {
      if (!checkLimit(req, res, RateLimitTier.AUTH)) return;
      const code = String(req.body?.code || '');
      const ok = await confirmEnrollment(userId, code);
      if (!ok) return res.status(400).json({ success: false, error: 'Kode salah atau kedaluwarsa' });
      return res.json({ success: true, message: '2FA aktif' });
    }

    if (req.method === 'POST' && action === 'disable') {
      if (!checkLimit(req, res, RateLimitTier.AUTH)) return;
      const code = String(req.body?.code || '');
      const ok = await disableMfa(userId, code);
      if (!ok) return res.status(400).json({ success: false, error: 'Kode salah — 2FA tetap aktif' });
      return res.json({ success: true, message: '2FA dinonaktifkan' });
    }

    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Error' });
  }
}
