/**
 * Humanify SaaS Phase 15 — self-service password reset API
 *
 *   POST /api/humanify/password-reset?action=request  { email }
 *   POST /api/humanify/password-reset?action=confirm  { token, password }
 *
 * Rate limited (Phase 14): request = 5/min/IP, confirm = 10/min/IP.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { checkLimit, RateLimitTier } from '@/lib/middleware/rateLimit';
import { requestPasswordReset, resetPassword } from '@/lib/saas/password-reset';
import { withObservability } from '@/lib/observability';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clientIp(req: NextApiRequest): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const action = String(req.query.action || '');

  if (action === 'request') {
    // Tight limit to curb enumeration / mail-bombing.
    if (!(await checkLimit(req, res, {
      windowMs: 60 * 1000,
      maxRequests: 5,
      message: 'Terlalu banyak permintaan reset. Coba lagi sebentar.',
    })) return;

    const { email } = req.body || {};
    if (!email || !EMAIL_RE.test(String(email).trim())) {
      // Do not reveal validity; still return generic success shape.
      return res.json({ success: true, message: 'Jika email terdaftar, tautan reset telah dikirim.' });
    }

    try {
      const origin = (req.headers.origin as string) || process.env.NEXTAUTH_URL || 'https://humanify.id';
      const result = await requestPasswordReset({
        email: String(email).trim(),
        baseUrl: origin,
        requestedIp: clientIp(req),
      });
      return res.json({
        success: true,
        message: 'Jika email terdaftar, tautan reset telah dikirim.',
        data: {
          emailed: result.emailed,
          resetUrl: result.resetUrl,
          token: result.token,
        },
      });
    } catch (e: any) {
      console.error('[password-reset:request]', e);
      // Never leak internal errors as enumeration signal.
      return res.json({ success: true, message: 'Jika email terdaftar, tautan reset telah dikirim.' });
    }
  }

  if (action === 'confirm') {
    if (!(await checkLimit(req, res, RateLimitTier.AUTH))) return;

    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ success: false, error: 'Token dan password baru wajib diisi' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ success: false, error: 'Password minimal 8 karakter' });
    }

    try {
      const out = await resetPassword({ token: String(token), newPassword: String(password) });
      return res.json({
        success: true,
        message: 'Password berhasil diperbarui. Silakan masuk dengan password baru.',
        data: { email: out.email },
      });
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e?.message || 'Reset gagal' });
    }
  }

  return res.status(400).json({ success: false, error: 'Unknown action' });
}

export default withObservability(handler, 'api/humanify/password-reset');
