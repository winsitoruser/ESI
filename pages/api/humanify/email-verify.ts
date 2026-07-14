/**
 * POST ?action=verify|resend
 * GET  ?action=status (auth)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import {
  createEmailVerification,
  isTenantEmailVerified,
  verifyEmailToken,
} from '@/lib/saas/email-verify';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const action = String(req.query.action || (req.method === 'GET' ? 'status' : 'verify'));

  try {
    if (req.method === 'POST' && action === 'verify') {
      const token = String(req.body?.token || req.query.token || '');
      if (!token) return res.status(400).json({ success: false, error: 'token required' });
      const result = await verifyEmailToken(token);
      return res.json({
        success: true,
        message: 'Email terverifikasi',
        data: { email: result.email, tenantId: result.tenantId },
      });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const tenantId = (session.user as any).tenantId as string | null;
    const userId = (session.user as any).id;
    const email = String(session.user.email || '').toLowerCase();

    if (req.method === 'GET' && action === 'status') {
      const verified = await isTenantEmailVerified(tenantId);
      return res.json({ success: true, data: { verified, email } });
    }

    if (req.method === 'POST' && action === 'resend') {
      if (!email || !userId) {
        return res.status(400).json({ success: false, error: 'Session email tidak tersedia' });
      }
      const origin = (req.headers.origin as string) || process.env.NEXTAUTH_URL || 'https://humanify.id';
      const created = await createEmailVerification({
        userId,
        tenantId,
        email,
        baseUrl: origin,
      });
      const exposeToken =
        process.env.NODE_ENV !== 'production'
        || process.env.HUMANIFY_EMAIL_VERIFY_RETURN_TOKEN === 'true'
        || !created.emailed;
      return res.json({
        success: true,
        message: created.emailed ? 'Link verifikasi dikirim ke email' : 'Link verifikasi dibuat',
        data: {
          emailed: created.emailed,
          verifyUrl: exposeToken ? created.verifyUrl : undefined,
        },
      });
    }

    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (e: any) {
    console.error('[email-verify]', e);
    return res.status(400).json({ success: false, error: e.message || 'Gagal' });
  }
}
