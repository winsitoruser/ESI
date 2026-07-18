/**
 * Bulk employee edit + 24h undo.
 *   POST ?action=update  { ids: string[], patch: { department?, position?, status?, workLocation?, employmentCategory? } }
 *   POST ?action=undo    { batchId: string }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../lib/middleware/withHQAuth';
import { bulkUpdateEmployees, undoBulkEdit } from '@/lib/hris/employee-bulk-edit';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = (req as any).session;
  const tenantId = session?.user?.tenantId || null;
  const actorId = session?.user?.id != null ? String(session.user.id) : null;
  const actorEmail = session?.user?.email || null;
  const action = String(req.query.action || 'update');

  try {
    if (action === 'undo') {
      const batchId = String(req.body?.batchId || '');
      if (!batchId) return res.status(400).json({ success: false, error: 'batchId wajib' });
      const result = await undoBulkEdit({ tenantId, batchId });
      return res.json({ success: true, data: result, message: `${result.restored} karyawan dikembalikan` });
    }

    if (action === 'update' || action === '') {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
      const patch = req.body?.patch || {};
      const result = await bulkUpdateEmployees({
        tenantId,
        ids,
        patch,
        actorId,
        actorEmail,
      });
      try {
        const { logAdminAction } = await import('@/lib/saas/admin-audit');
        await logAdminAction({
          tenantId,
          actorUserId: actorId,
          actorEmail,
          action: 'employee.bulk_update',
          resourceType: 'employees',
          resourceId: result.batchId || undefined,
          meta: { updated: result.updated, patch: result.patch },
        });
      } catch { /* non-blocking */ }
      return res.json({
        success: true,
        data: result,
        message: `${result.updated} karyawan diperbarui${result.batchId ? ' (undo 24 jam tersedia)' : ''}`,
      });
    }

    return res.status(400).json({ success: false, error: 'action tidak dikenal' });
  } catch (e: any) {
    const msg = e?.message || 'Bulk edit gagal';
    const status = /tidak ditemukan|wajib|Maksimal|Tidak ada field|sudah|habis/i.test(msg) ? 400 : 500;
    return res.status(status).json({ success: false, error: msg });
  }
}

export default withHQAuth(handler, { module: 'hris' });
