/**
 * Phase 23 — public invitation accept endpoint (no auth).
 *   GET  ?token=...   → validate + preview { email, role, companyName }
 *   POST { token, name, password } → create user & mark accepted
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getInvitationByToken, acceptInvitation } from '@/lib/saas/invitations';
import { checkLimit } from '@/lib/middleware/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const token = String(req.query.token || '');
      const preview = await getInvitationByToken(token);
      return res.json({ success: preview.valid, data: preview });
    }

    if (req.method === 'POST') {
      if (!(await checkLimit(req, res, {
        windowMs: 60 * 1000,
        maxRequests: 15,
        message: 'Terlalu banyak percobaan. Coba lagi sebentar.',
      }))) return;

      const { token, name, password } = req.body || {};
      if (!token || !name || !password) {
        return res.status(400).json({ success: false, error: 'Token, nama, dan password wajib diisi' });
      }
      const result = await acceptInvitation({
        token: String(token),
        name: String(name),
        password: String(password),
      });
      return res.status(201).json({
        success: true,
        data: { email: result.email, redirectTo: '/auth/login' },
      });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[invitations-accept]', e);
    return res.status(400).json({ success: false, error: e?.message || 'Error' });
  }
}
