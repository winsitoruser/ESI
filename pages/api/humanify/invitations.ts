/**
 * Phase 23 — team invitations (authenticated, tenant-scoped).
 *   GET                         → { invitations, members, seats, roles }
 *   POST ?action=create         → body { email, role?, name? }
 *   POST ?action=revoke         → body { id }
 *   POST ?action=resend         → body { id }
 *
 * Managing invitations requires an owner/admin role. Listing is available to any
 * authenticated tenant user so they can see teammates.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import {
  createInvitation,
  listInvitations,
  listTenantMembers,
  revokeInvitation,
  resendInvitation,
  INVITE_ROLES,
} from '@/lib/saas/invitations';
import { getSeatUsage } from '@/lib/saas/seat-metering';
import { checkLimit } from '@/lib/middleware/rateLimit';

const MANAGE_ROLES = new Set(['owner', 'hq_admin', 'admin']);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const tenantId = (session.user as any).tenantId || null;
  const userId = (session.user as any).id || null;
  const role = String((session.user as any).role || '').toLowerCase();
  const canManage = MANAGE_ROLES.has(role);

  if (!tenantId) {
    return res.status(403).json({ success: false, error: 'Fitur ini hanya untuk akun tenant Humanify.' });
  }

  const origin = (req.headers.origin as string) || process.env.NEXTAUTH_URL || 'https://humanify.id';

  try {
    if (req.method === 'GET') {
      const [invitations, members, seats] = await Promise.all([
        listInvitations(tenantId),
        listTenantMembers(tenantId),
        getSeatUsage(tenantId).catch(() => null),
      ]);
      return res.json({
        success: true,
        data: { invitations, members, seats, roles: INVITE_ROLES, canManage },
      });
    }

    if (req.method === 'POST') {
      const action = String(req.query.action || '');

      if (!canManage) {
        return res.status(403).json({ success: false, error: 'Hanya owner/admin yang dapat mengelola undangan.' });
      }

      if (action === 'create') {
        if (!checkLimit(req, res, {
          windowMs: 60 * 1000,
          maxRequests: 20,
          message: 'Terlalu banyak undangan. Coba lagi sebentar.',
        })) return;

        const { email, role: inviteRole, name } = req.body || {};
        if (!email) return res.status(400).json({ success: false, error: 'Email wajib diisi' });
        const result = await createInvitation({
          tenantId,
          email: String(email),
          role: inviteRole ? String(inviteRole) : undefined,
          name: name ? String(name) : undefined,
          invitedBy: userId,
          baseUrl: origin,
        });
        return res.status(201).json({ success: true, data: result });
      }

      if (action === 'revoke') {
        const id = String(req.body?.id || '');
        if (!id) return res.status(400).json({ success: false, error: 'id wajib diisi' });
        const ok = await revokeInvitation(tenantId, id);
        return res.json({ success: ok, data: { revoked: ok } });
      }

      if (action === 'resend') {
        const id = String(req.body?.id || '');
        if (!id) return res.status(400).json({ success: false, error: 'id wajib diisi' });
        const result = await resendInvitation(tenantId, id, origin);
        return res.json({ success: true, data: result });
      }

      return res.status(400).json({ success: false, error: 'Action tidak dikenal' });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[invitations]', e);
    return res.status(400).json({ success: false, error: e?.message || 'Error' });
  }
}
