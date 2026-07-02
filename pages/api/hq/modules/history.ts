import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const getDb = () => require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userRole = (session.user as any).role;
    const tenantId = (session.user as any).tenantId;

    if (!['super_admin', 'owner', 'hq_admin'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (req.method === 'GET') {
      return getDeploymentHistory(req, res, tenantId);
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Deployment History API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getDeploymentHistory(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  try {
    const { limit = 50, offset = 0, moduleId, action, status } = req.query;

    // Return mock history for now
    const history = getMockHistory();

    // Filter by query params
    let filtered = history;
    if (moduleId) {
      filtered = filtered.filter(h => h.moduleId === moduleId);
    }
    if (action) {
      filtered = filtered.filter(h => h.action === action);
    }
    if (status) {
      filtered = filtered.filter(h => h.status === status);
    }

    const total = filtered.length;
    const paginatedHistory = filtered.slice(
      Number(offset),
      Number(offset) + Number(limit)
    );

    return res.status(200).json({
      success: true,
      data: {
        history: paginatedHistory,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + Number(limit) < total
        }
      }
    });
  } catch (error: any) {
    console.error('Error getting deployment history:', error);
    return res.status(200).json({
      success: true,
      data: {
        history: getMockHistory(),
        pagination: {
          total: 10,
          limit: 50,
          offset: 0,
          hasMore: false
        }
      }
    });
  }
}

function getMockHistory() {
  const now = new Date();
  return [
    {
      id: 'hist-1',
      moduleId: '1',
      moduleName: 'POS',
      action: 'enable',
      scopeType: 'all_branches',
      affectedBranches: ['branch-1', 'branch-2', 'branch-3', 'branch-4', 'branch-5'],
      branchCount: 5,
      deployedBy: 'Admin User',
      deployedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      status: 'success',
      successCount: 5,
      failedCount: 0,
      details: {
        duration: '2.3s',
        errors: []
      }
    },
    {
      id: 'hist-2',
      moduleId: '2',
      moduleName: 'Inventory',
      action: 'enable',
      scopeType: 'selected_branches',
      affectedBranches: ['branch-1', 'branch-2'],
      branchCount: 2,
      deployedBy: 'Admin User',
      deployedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      status: 'success',
      successCount: 2,
      failedCount: 0,
      details: {
        duration: '1.1s',
        errors: []
      }
    },
    {
      id: 'hist-3',
      moduleId: '4',
      moduleName: 'Kitchen Display',
      action: 'enable',
      scopeType: 'selected_branches',
      affectedBranches: ['branch-1', 'branch-3'],
      branchCount: 2,
      deployedBy: 'HQ Admin',
      deployedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      status: 'partial',
      successCount: 1,
      failedCount: 1,
      details: {
        duration: '1.8s',
        errors: ['Branch branch-3: Module dependency not met']
      }
    },
    {
      id: 'hist-4',
      moduleId: '3',
      moduleName: 'Finance',
      action: 'enable',
      scopeType: 'hq',
      affectedBranches: [],
      branchCount: 0,
      deployedBy: 'Owner',
      deployedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      status: 'success',
      successCount: 1,
      failedCount: 0,
      details: {
        duration: '0.5s',
        errors: []
      }
    },
    {
      id: 'hist-5',
      moduleId: '5',
      moduleName: 'Loyalty Program',
      action: 'disable',
      scopeType: 'all_branches',
      affectedBranches: ['branch-2', 'branch-4'],
      branchCount: 2,
      deployedBy: 'Admin User',
      deployedAt: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(),
      status: 'success',
      successCount: 2,
      failedCount: 0,
      details: {
        duration: '0.9s',
        errors: []
      }
    },
    {
      id: 'hist-6',
      moduleId: '1',
      moduleName: 'POS',
      action: 'enable',
      scopeType: 'all_branches',
      affectedBranches: ['branch-1', 'branch-2', 'branch-3'],
      branchCount: 3,
      deployedBy: 'Super Admin',
      deployedAt: new Date(now.getTime() - 96 * 60 * 60 * 1000).toISOString(),
      status: 'success',
      successCount: 3,
      failedCount: 0,
      details: {
        duration: '1.5s',
        errors: []
      }
    },
    {
      id: 'hist-7',
      moduleId: '6',
      moduleName: 'Fleet Management',
      action: 'enable',
      scopeType: 'selected_branches',
      affectedBranches: ['branch-5'],
      branchCount: 1,
      deployedBy: 'HQ Admin',
      deployedAt: new Date(now.getTime() - 120 * 60 * 60 * 1000).toISOString(),
      status: 'failed',
      successCount: 0,
      failedCount: 1,
      details: {
        duration: '0.3s',
        errors: ['Branch branch-5: Insufficient permissions']
      }
    },
    {
      id: 'hist-8',
      moduleId: '2',
      moduleName: 'Inventory',
      action: 'enable',
      scopeType: 'all_branches',
      affectedBranches: ['branch-1', 'branch-2', 'branch-3', 'branch-4'],
      branchCount: 4,
      deployedBy: 'Admin User',
      deployedAt: new Date(now.getTime() - 144 * 60 * 60 * 1000).toISOString(),
      status: 'success',
      successCount: 4,
      failedCount: 0,
      details: {
        duration: '2.1s',
        errors: []
      }
    },
    {
      id: 'hist-9',
      moduleId: '8',
      moduleName: 'HRIS',
      action: 'enable',
      scopeType: 'hq',
      affectedBranches: [],
      branchCount: 0,
      deployedBy: 'Owner',
      deployedAt: new Date(now.getTime() - 168 * 60 * 60 * 1000).toISOString(),
      status: 'success',
      successCount: 1,
      failedCount: 0,
      details: {
        duration: '0.6s',
        errors: []
      }
    },
    {
      id: 'hist-10',
      moduleId: '7',
      moduleName: 'Logistics',
      action: 'enable',
      scopeType: 'selected_branches',
      affectedBranches: ['branch-4', 'branch-5'],
      branchCount: 2,
      deployedBy: 'HQ Admin',
      deployedAt: new Date(now.getTime() - 192 * 60 * 60 * 1000).toISOString(),
      status: 'partial',
      successCount: 1,
      failedCount: 1,
      details: {
        duration: '1.2s',
        errors: ['Branch branch-5: Connection timeout']
      }
    }
  ];
}
