/**
 * Action Inbox snooze API.
 * POST { itemType, itemId, hours? } — snooze 1–168h (default 24)
 * GET — list active snooze keys for tenant
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import {
  inboxItemKey,
  listActiveSnoozeKeys,
  snoozeInboxItem,
} from '@/lib/hris/action-inbox-snooze';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const tenantId = (session.user as any)?.tenantId;
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT', code: 'NO_TENANT' });

  try {
    if (req.method === 'GET') {
      const keys = await listActiveSnoozeKeys({ tenantId: String(tenantId) });
      return res.json({ success: true, data: { keys: [...keys] } });
    }

    if (req.method === 'POST') {
      const itemType = String(req.body?.itemType || req.body?.type || '').trim();
      const itemId = req.body?.itemId ?? req.body?.id;
      if (!itemType || itemId == null || itemId === '') {
        return res.status(400).json({ success: false, error: 'itemType and itemId required' });
      }
      const key = inboxItemKey(itemType, itemId);
      const result = await snoozeInboxItem({
        tenantId: String(tenantId),
        itemKey: key,
        userId: session.user?.id != null ? String(session.user.id) : null,
        hours: Number(req.body?.hours) || 24,
      });
      if (!result.ok) return res.status(500).json({ success: false, error: 'Snooze failed' });
      return res.json({ success: true, data: { itemKey: key, untilAt: result.untilAt } });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Error' });
  }
}
