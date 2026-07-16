import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import {
  listAssets, assignAsset, returnAsset, getAssetSummary,
  type AssetStatus, type AssetCategory,
} from '@/lib/hris/asset-store';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
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

    if (req.method === 'POST' && action === 'assign' && id) {
      const { employeeId, employeeName, lifecycleRef } = req.body;
      const data = await assignAsset(id as string, employeeId, employeeName, lifecycleRef);
      return res.json({ success: true, data });
    }

    if (req.method === 'POST' && action === 'return' && id) {
      const { condition } = req.body;
      const data = await returnAsset(id as string, condition);
      return res.json({ success: true, data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
