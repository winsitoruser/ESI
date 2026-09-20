/**
 * ESS internal helpdesk / desk request (FlowHCM Desk Management).
 * Creates tenant support tickets with HR/IT/facility categories.
 * Fail-closed: missing tenant → 403 NO_TENANT (no mock fallback).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { withEmployeeAuth } from '@/lib/middleware/withEmployeeAuth';
import { createTicket, listTickets } from '@/lib/hris/support-store';
import { sanitizePlainText } from '@/lib/security/sanitize-user-text';
import { checkLimit, RateLimitTier } from '@/lib/middleware/rateLimit';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });
  const tenantId = (session.user as any)?.tenantId || null;
  // Fail-closed: never create/list desk tickets without tenant binding
  if (!tenantId) return res.status(403).json({ error: 'NO_TENANT' });

  const user = session.user as any;
  const INTERNAL = new Set(['it', 'hr', 'facility', 'desk', 'access', 'other', 'payroll', 'attendance']);

  try {
    if (req.method === 'GET') {
      const all = await listTickets({ tenantId });
      const mine = (all || []).filter(
        (t: any) =>
          t.requester_email === user.email
          || t.requesterEmail === user.email
          || String(t.requester_user_id || t.requesterUserId || '') === String(user.id),
      );
      return res.json({ success: true, data: mine });
    }

    if (req.method === 'POST') {
      if (!(await checkLimit(req, res, RateLimitTier.SENSITIVE))) return;
      const body = req.body || {};
      const subject = sanitizePlainText(body.subject, 300);
      const description = sanitizePlainText(body.description, 5000);
      if (!subject || !description) {
        return res.status(400).json({ error: 'Subjek dan deskripsi wajib' });
      }
      let category = String(body.category || 'other').toLowerCase();
      if (!INTERNAL.has(category)) category = 'other';
      const ticket = await createTicket({
        tenantId,
        subject,
        description,
        category,
        priority: body.priority || 'normal',
        requesterName: user.name || user.email,
        requesterEmail: user.email,
        requesterUserId: String(user.id),
      });
      return res.status(201).json({ success: true, data: ticket });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}

export default withEmployeeAuth(handler);
