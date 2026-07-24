import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import {
  listAssets,
  createAsset,
  assignAsset,
  returnAsset,
  getAssetSummary,
  type AssetStatus,
  type AssetCategory,
} from '@/lib/hris/asset-store';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const tenantId = (session.user as any)?.tenantId || null;

  const { action, id } = req.query;

  try {
    if (req.method === 'GET') {
      if (action === 'summary') {
        const summary = await getAssetSummary(tenantId);
        return res.json({ success: true, data: summary, dataSource: summary.total > 0 ? 'live' : 'empty' });
      }
      const filters = {
        status: req.query.status as AssetStatus | undefined,
        category: req.query.category as AssetCategory | undefined,
        assignedTo: req.query.assignedTo as string | undefined,
        tenantId,
      };
      const data = await listAssets(filters);
      return res.json({ success: true, data, dataSource: data.length > 0 ? 'live' : 'empty' });
    }

    if (req.method === 'POST' && (!action || action === 'create')) {
      if (!tenantId) return res.status(403).json({ error: 'NO_TENANT' });
      const data = await createAsset(req.body || {}, tenantId);
      if (!data) return res.status(400).json({ success: false, error: 'Gagal membuat aset' });
      return res.status(201).json({ success: true, data });
    }

    if (req.method === 'POST' && action === 'assign' && id) {
      if (!tenantId) return res.status(403).json({ error: 'NO_TENANT' });
      const { employeeId, employeeName, lifecycleRef } = req.body || {};
      if (!employeeId) return res.status(400).json({ success: false, error: 'employeeId wajib' });
      const data = await assignAsset(
        id as string,
        String(employeeId),
        String(employeeName || ''),
        lifecycleRef,
        tenantId,
      );
      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'Aset tidak ditemukan atau sudah di-assign',
        });
      }
      return res.json({ success: true, data });
    }

    if (req.method === 'POST' && action === 'return' && id) {
      if (!tenantId) return res.status(403).json({ error: 'NO_TENANT' });
      const { condition } = req.body || {};
      const data = await returnAsset(id as string, condition, tenantId);
      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'Aset tidak ditemukan atau tidak sedang di-assign',
        });
      }
      return res.json({ success: true, data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    const msg = error?.message || 'Internal error';
    const status = /wajib|duplicate|unique/i.test(msg) ? 400 : 500;
    return res.status(status).json({ success: false, error: msg });
  }
}

export default withHQAuth(handler, { module: 'hris' });
