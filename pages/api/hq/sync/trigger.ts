import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
const { tenantContext, requireTenant } = require('../../../../middleware/tenantContext');
const BranchSyncService = require('../../../../services/BranchSyncService');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Apply tenant context middleware
    await new Promise((resolve, reject) => {
      tenantContext(req, res, (err: any) => {
        if (err) reject(err);
        else resolve(true);
      });
    });

    await new Promise((resolve, reject) => {
      requireTenant(req, res, (err: any) => {
        if (err) reject(err);
        else resolve(true);
      });
    });

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    return await triggerSync(req, res);
  } catch (error) {
    console.error('Sync trigger API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function triggerSync(req: NextApiRequest, res: NextApiResponse) {
  const { branchId, branchIds, syncType, direction } = req.body;

  if (!syncType) {
    return res.status(400).json({ error: 'Sync type is required' });
  }

  const validSyncTypes = ['products', 'prices', 'promotions', 'settings', 'inventory', 'full'];
  if (!validSyncTypes.includes(syncType)) {
    return res.status(400).json({ 
      error: 'Invalid sync type',
      validTypes: validSyncTypes
    });
  }

  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    let results;

    if (branchId) {
      // Sync single branch
      if (direction === 'branch_to_hq') {
        results = await BranchSyncService.syncFromBranch(branchId, syncType, userId);
      } else {
        results = await BranchSyncService.syncToHQ(branchId, syncType, userId);
      }
    } else if (branchIds && Array.isArray(branchIds)) {
      // Sync multiple specific branches
      results = [];
      for (const id of branchIds) {
        try {
          const result = await BranchSyncService.syncToHQ(id, syncType, userId);
          results.push(result);
        } catch (error: any) {
          results.push({
            branchId: id,
            success: false,
            error: error.message
          });
        }
      }
    } else {
      // Sync all branches in tenant
      results = await BranchSyncService.syncAllBranches(tenantId, syncType, userId);
    }

    return res.status(200).json({
      success: true,
      message: 'Sync triggered successfully',
      results
    });
  } catch (error: any) {
    console.error('Error triggering sync:', error);
    return res.status(500).json({ 
      error: 'Failed to trigger sync',
      message: error.message
    });
  }
}

export default withHQAuth(handler);
