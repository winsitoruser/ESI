import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

const getDb = () => require('@/models');

/**
 * GET /api/admin/branches/:id
 * Get branch details by ID
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userRole = (session.user?.role as string)?.toLowerCase();
    const allowedRoles = ['admin', 'super_admin', 'superadmin'];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied - Admin access required' });
    }

    const db = getDb();
    const { id } = req.query;

    // Fetch branch with full details
    const branch = await db.Branch.findByPk(id, {
      include: [
        {
          model: db.Tenant,
          as: 'tenant',
          attributes: ['id', 'code', 'name', 'status', 'subscriptionPlan', 'maxBranches']
        },
        {
          model: db.Store,
          as: 'store',
          attributes: ['id', 'name', 'code', 'address', 'city', 'province', 'phone'],
          required: false
        },
        {
          model: db.User,
          as: 'manager',
          attributes: ['id', 'name', 'email', 'phone'],
          required: false
        },
        {
          model: db.User,
          as: 'assignedUsers',
          attributes: ['id', 'name', 'email', 'role'],
          required: false
        },
        {
          model: db.SyncLog,
          as: 'syncLogs',
          limit: 10,
          order: [['createdAt', 'DESC']],
          required: false
        }
      ]
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found'
      });
    }

    // Transform data
    const branchData = {
      id: branch.id,
      code: branch.code,
      name: branch.name,
      type: branch.type,
      tenant: branch.tenant ? {
        id: branch.tenant.id,
        name: branch.tenant.name,
        code: branch.tenant.code,
        status: branch.tenant.status,
        subscriptionPlan: branch.tenant.subscriptionPlan,
        maxBranches: branch.tenant.maxBranches
      } : null,
      store: branch.store ? {
        id: branch.store.id,
        name: branch.store.name,
        code: branch.store.code,
        address: branch.store.address,
        city: branch.store.city,
        province: branch.store.province,
        phone: branch.store.phone
      } : null,
      manager: branch.manager ? {
        id: branch.manager.id,
        name: branch.manager.name,
        email: branch.manager.email,
        phone: branch.manager.phone
      } : null,
      assignedUsers: branch.assignedUsers?.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      })) || [],
      address: branch.address,
      city: branch.city,
      province: branch.province,
      postalCode: branch.postalCode,
      phone: branch.phone,
      email: branch.email,
      isActive: branch.isActive,
      region: branch.region,
      syncStatus: branch.syncStatus,
      lastSyncAt: branch.lastSyncAt,
      settings: branch.settings,
      syncLogs: branch.syncLogs?.map((log: any) => ({
        id: log.id,
        syncType: log.syncType,
        direction: log.direction,
        status: log.status,
        itemsSynced: log.itemsSynced,
        totalItems: log.totalItems,
        errorMessage: log.errorMessage,
        startedAt: log.startedAt,
        completedAt: log.completedAt,
        createdAt: log.createdAt
      })) || [],
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt
    };

    return res.status(200).json({
      success: true,
      data: branchData
    });

  } catch (error: any) {
    console.error('Admin Branch Detail API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch branch details',
      details: error.message
    });
  }
}
