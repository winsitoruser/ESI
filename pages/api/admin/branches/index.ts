import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { Op } from 'sequelize';

const getDb = () => require('@/models');

/**
 * GET /api/admin/branches
 * List all branches with filters and pagination
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
    
    const {
      page = 1,
      limit = 20,
      search,
      type,
      status,
      region,
      tenantId,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause
    const where: any = {};
    
    if (type) {
      where.type = type;
    }
    
    if (status) {
      where.isActive = status === 'active';
    }
    
    if (region) {
      where.region = { [Op.iLike]: `%${region}%` };
    }
    
    if (tenantId) {
      where.tenantId = tenantId;
    }
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Fetch branches with associations
    const { count, rows: branches } = await db.Branch.findAndCountAll({
      where,
      include: [
        {
          model: db.Tenant,
          as: 'tenant',
          attributes: ['id', 'code', 'name', 'status']
        },
        {
          model: db.Store,
          as: 'store',
          attributes: ['id', 'name', 'code'],
          required: false
        },
        {
          model: db.User,
          as: 'manager',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ],
      order: [[sortBy as string, sortOrder as string]],
      limit: parseInt(limit as string),
      offset,
      distinct: true
    });

    // Transform data
    const transformedBranches = branches.map((branch: any) => ({
      id: branch.id,
      code: branch.code,
      name: branch.name,
      type: branch.type,
      tenant: branch.tenant ? {
        id: branch.tenant.id,
        name: branch.tenant.name,
        code: branch.tenant.code,
        status: branch.tenant.status
      } : null,
      store: branch.store ? {
        id: branch.store.id,
        name: branch.store.name
      } : null,
      manager: branch.manager ? {
        id: branch.manager.id,
        name: branch.manager.name,
        email: branch.manager.email
      } : null,
      address: branch.address,
      city: branch.city,
      province: branch.province,
      phone: branch.phone,
      isActive: branch.isActive,
      region: branch.region,
      syncStatus: branch.syncStatus,
      lastSyncAt: branch.lastSyncAt,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt
    }));

    return res.status(200).json({
      success: true,
      data: transformedBranches,
      pagination: {
        total: count,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(count / parseInt(limit as string))
      }
    });

  } catch (error: any) {
    console.error('Admin Branches API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch branches',
      details: error.message
    });
  }
}
