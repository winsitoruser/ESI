/**
 * Bulk leave cancel pending + 24h undo (HR-S3-1).
 *   POST ?action=cancel-pending  { ids: string[] }
 *   POST ?action=undo            { batchId: string }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import {
  bulkCancelPendingLeave,
  undoLeaveBulkCancel,
} from '@/lib/hris/leave-bulk-cancel';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = (req as any).session;
  const tenantId = session?.user?.tenantId || null;
  const action = String(req.query.action || '');

  try {
    if (action === 'cancel-pending') {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
      const result = await bulkCancelPendingLeave({
        tenantId,
        ids,
        actorId: session?.user?.id != null ? String(session.user.id) : null,
        actorEmail: session?.user?.email || null,
      });
      return res.json({
        success: true,
        data: result,
        message: `${result.cancelled} pengajuan dibatalkan${result.batchId ? ' (undo 24 jam tersedia)' : ''}`,
      });
    }

    if (action === 'undo') {
      const batchId = String(req.body?.batchId || '');
      const result = await undoLeaveBulkCancel({ tenantId, batchId });
      return res.json({
        success: true,
        data: result,
        message: `${result.restored} pengajuan dikembalikan`,
      });
    }

    return res.status(400).json({
      success: false,
      error: 'action wajib: cancel-pending | undo',
    });
  } catch (e: any) {
    const msg = e?.message || 'Operasi gagal';
    const status = /wajib|Pilih|tidak ditemukan|habis|sudah|Maksimal|Tenant/i.test(msg) ? 400 : 500;
    return res.status(status).json({ success: false, error: msg });
  }
}

export default withHQAuth(handler);
