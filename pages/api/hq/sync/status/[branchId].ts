import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../../lib/middleware/withHQAuth';
const { tenantContext, requireTenant } = require('../../../../../middleware/tenantContext');
const { validateBranchAccess } = require('../../../../../middleware/branchAccess');
const BranchSyncService = require('../../../../../services/BranchSyncService');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Apply middleware
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

    await new Promise((resolve, reject) => {
      validateBranchAccess(req, res, (err: any) => {
        if (err) reject(err);
        else resolve(true);
      });
    });

    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    return await getSyncStatus(req, res);
  } catch (error) {
    console.error('Sync status API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getSyncStatus(req: NextApiRequest, res: NextApiResponse) {
  const { branchId } = req.query;

  try {
    const status = await BranchSyncService.getSyncStatus(branchId as string);

    return res.status(200).json({
      success: true,
      ...status
    });
  } catch (error: any) {
    console.error('Error getting sync status:', error);
    return res.status(500).json({ 
      error: 'Failed to get sync status',
      message: error.message
    });
  }
}

export default withHQAuth(handler);
