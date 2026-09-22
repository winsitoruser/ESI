/**
 * POST /api/humanify/step-up — mint short-lived re-auth token (SEC-IAM-008)
 * Body: { password, purpose? }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { getStepUpTtlMs, mintStepUpToken } from '@/lib/saas/step-up-auth';
import { logAdminAction } from '@/lib/saas/admin-audit';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = (req as any).session;
  const userId = String(session?.user?.id || '');
  const tenantId = String(session?.user?.tenantId || '');
  const email = session?.user?.email;
  if (!userId || !tenantId) {
    return res.status(403).json({ success: false, error: 'NO_TENANT', code: 'NO_TENANT' });
  }

  const password = String(req.body?.password || '').trim();
  if (!password) {
    return res.status(400).json({ success: false, error: 'password required', code: 'STEP_UP_PASSWORD_REQUIRED' });
  }

  try {
    let User: any;
    try { User = require('../../../models/User'); } catch { /* */ }
    if (!User) return res.status(500).json({ success: false, error: 'User model unavailable' });

    const user = await User.findOne({ where: email ? { email } : { id: userId } });
    if (!user?.password) {
      return res.status(400).json({ success: false, error: 'Akun tidak mendukung step-up', code: 'STEP_UP_UNAVAILABLE' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Password salah', code: 'STEP_UP_PASSWORD_INVALID' });
    }

    const purpose = String(req.body?.purpose || 'sensitive').slice(0, 40);
    const token = mintStepUpToken({ userId, tenantId, purpose });

    try {
      await logAdminAction({
        tenantId,
        actorUserId: userId,
        actorEmail: email,
        action: 'auth.step_up',
        resourceType: 'session',
        meta: { purpose, ttlMin: Math.round(getStepUpTtlMs() / 60_000) },
        ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress,
      });
    } catch { /* non-blocking */ }

    return res.json({
      success: true,
      data: {
        stepUpToken: token,
        expiresInMs: getStepUpTtlMs(),
        purpose,
      },
    });
  } catch (e: any) {
    console.warn('[step-up]', e?.message || e);
    return res.status(500).json({ success: false, error: e?.message || 'Step-up failed' });
  }
}

export default withHQAuth(handler);
