/**
 * GET  ?action=list
 * POST ?action=submit  { subjectEmail, requestType, notes? }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { listDsr, submitDsr, type DsrType } from '@/lib/saas/privacy-dsr';

const OWNER_ROLES = new Set([
  'owner', 'hq_admin', 'hr_admin', 'super_admin', 'superadmin', 'platform_admin',
]);

const TYPES = new Set<DsrType>(['access', 'export', 'rectify', 'erase', 'restrict']);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const role = String((session.user as any).role || '').toLowerCase();
  const tenantId = (session.user as any).tenantId as string | null;
  if (!tenantId) return res.status(400).json({ success: false, error: 'No tenant' });
  if (!OWNER_ROLES.has(role)) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  const action = String(req.query.action || (req.method === 'GET' ? 'list' : 'submit'));

  try {
    if (req.method === 'GET' && action === 'list') {
      const rows = await listDsr(tenantId, Number(req.query.limit) || 50);
      return res.json({ success: true, data: rows });
    }

    if (req.method === 'POST' && action === 'submit') {
      const subjectEmail = String(req.body?.subjectEmail || '').trim();
      const requestType = String(req.body?.requestType || '').toLowerCase() as DsrType;
      if (!subjectEmail || !subjectEmail.includes('@')) {
        return res.status(400).json({ success: false, error: 'subjectEmail required' });
      }
      if (!TYPES.has(requestType)) {
        return res.status(400).json({ success: false, error: 'Invalid requestType' });
      }
      const data = await submitDsr({
        tenantId,
        subjectEmail,
        subjectUserId: req.body?.subjectUserId || null,
        requestType,
        notes: req.body?.notes,
        requestedBy: session.user.email,
      });
      return res.status(201).json({ success: true, data });
    }

    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (e: any) {
    console.warn('[privacy-dsr]', e?.message || e);
    return res.status(500).json({ success: false, error: e?.message || 'DSR failed' });
  }
}

export default withHQAuth(handler);
