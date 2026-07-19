/**
 * Action Inbox snooze API.
 * POST { itemType, itemId, hours? } — snooze 1–168h (default 24)
 * POST { action: 'unsnooze', itemType, itemId } — clear snooze
 * DELETE { itemType, itemId } — clear snooze
 * GET — list active snooze keys for tenant
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import {
  clearInboxSnooze,
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

    if (req.method === 'POST' || req.method === 'DELETE') {
      const itemType = String(req.body?.itemType || req.body?.type || req.query?.itemType || '').trim();
      const itemId = req.body?.itemId ?? req.body?.id ?? req.query?.itemId;
      if (!itemType || itemId == null || itemId === '') {
        return res.status(400).json({ success: false, error: 'itemType and itemId required' });
      }
      const key = inboxItemKey(itemType, itemId);
      const isUnsnooze =
        req.method === 'DELETE' ||
        String(req.body?.action || '').toLowerCase() === 'unsnooze';

      if (isUnsnooze) {
        const result = await clearInboxSnooze({
          tenantId: String(tenantId),
          itemKey: key,
        });
        if (!result.ok) return res.status(500).json({ success: false, error: 'Unsnooze failed' });
        return res.json({ success: true, data: { itemKey: key, cleared: result.cleared } });
      }

      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
      }

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
