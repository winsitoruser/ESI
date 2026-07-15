/**
 * Phase 21 — Humanify in-app notification center.
 *   GET  ?action=list          → sync account alerts + list (with unreadCount)
 *   POST ?action=mark-read     → body { notificationIds?: string[] }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import {
  listNotifications,
  markNotificationsRead,
  syncAccountAlertNotifications,
} from '@/lib/saas/notifications';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const tenantId = (session.user as any).tenantId || null;
  const userId = (session.user as any).id || null;
  const role = String((session.user as any).role || '').toLowerCase();
  const isPlatform = ['super_admin', 'superadmin', 'platform_admin'].includes(role);
  const action = String(req.query.action || 'list');

  // Platform ops / users without a tenant have no tenant notification stream.
  if (!tenantId || isPlatform) {
    return res.json({ success: true, data: [], unreadCount: 0 });
  }

  try {
    if (req.method === 'GET' && action === 'list') {
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
      // Best-effort reconcile with live account health, then list.
      try { await syncAccountAlertNotifications(tenantId); } catch { /* fail-open */ }
      const { notifications, unreadCount } = await listNotifications(tenantId, userId, limit);
      return res.json({ success: true, data: notifications, unreadCount });
    }

    if (req.method === 'POST' && action === 'mark-read') {
      const ids = Array.isArray(req.body?.notificationIds)
        ? req.body.notificationIds.map((x: any) => String(x))
        : undefined;
      const updated = await markNotificationsRead(tenantId, userId, ids);
      return res.json({ success: true, updated });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[notifications]', e);
    return res.status(500).json({ success: false, error: e?.message || 'Error' });
  }
}
