/**
 * Humanify notification stream (SSE) — replaces 60s polling when supported.
 * GET /api/humanify/notifications/stream
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import {
  listNotifications,
  syncAccountAlertNotifications,
} from '@/lib/saas/notifications';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

const PUSH_MS = Number(process.env.NOTIF_SSE_MS || 15000);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = (req as any).session;
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const tenantId = (session.user as any).tenantId || null;
  const userId = (session.user as any).id || null;
  const role = String((session.user as any).role || '').toLowerCase();
  const isPlatform = ['super_admin', 'superadmin', 'platform_admin'].includes(role);

  if (!tenantId || isPlatform) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    res.write(`data: ${JSON.stringify({ notifications: [], unreadCount: 0 })}\n\n`);
    return res.end();
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  let closed = false;
  req.on('close', () => { closed = true; });

  const push = async () => {
    if (closed || res.writableEnded) return;
    try {
      try { await syncAccountAlertNotifications(tenantId); } catch { /* fail-open */ }
      const { notifications, unreadCount } = await listNotifications(tenantId, userId, 15);
      res.write(`data: ${JSON.stringify({ notifications, unreadCount })}\n\n`);
    } catch {
      if (!closed && !res.writableEnded) res.write(': heartbeat\n\n');
    }
  };

  await push();
  const interval = setInterval(() => { void push(); }, PUSH_MS);
  req.on('close', () => clearInterval(interval));
}

export default withHQAuth(handler, { module: 'hris' });
