import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
const { tenantContext, requireSuperAdmin } = require('../../../../middleware/tenantContext');

const getDb = () => require('../../../../models');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Apply tenant context middleware
    await new Promise((resolve, reject) => {
      tenantContext(req, res, (err: any) => {
        if (err) reject(err);
        else resolve(true);
      });
    });

    switch (req.method) {
      case 'GET':
        return await getTenants(req, res);
      case 'POST':
        // Only super admin can create tenants
        await new Promise((resolve, reject) => {
          requireSuperAdmin(req, res, (err: any) => {
            if (err) reject(err);
            else resolve(true);
          });
        });
        return await createTenant(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Tenant API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getTenants(req: NextApiRequest, res: NextApiResponse) {
  const db = getDb();
  const { page = '1', limit = '10', search, status } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  try {
    const where: any = {};

    // Super admin can see all tenants, others only their own
    if (!(req as any).isSuperAdmin) {
      where.id = (req as any).tenantId;
    }

    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
        { businessName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    const { count, rows } = await db.Tenant.findAndCountAll({
      where,
      include: [
        {
          model: db.BusinessType,
          as: 'businessType',
          attributes: ['id', 'code', 'name', 'icon']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
      attributes: { exclude: ['settings'] }
    });

    // Get stats for each tenant
    const tenants = await Promise.all(rows.map(async (tenant: any) => {
      const [userCount, branchCount, storeCount] = await Promise.all([
        db.User.count({ where: { tenantId: tenant.id } }),
        db.Branch.count({ where: { tenantId: tenant.id } }),
        db.Store.count({ where: { tenantId: tenant.id } })
      ]);

      return {
        id: tenant.id,
        code: tenant.code,
        name: tenant.name || tenant.businessName,
        businessName: tenant.businessName,
        status: tenant.status,
        businessType: tenant.businessType,
        subscriptionPlan: tenant.subscriptionPlan,
        subscriptionEnd: tenant.subscriptionEnd,
        maxUsers: tenant.maxUsers,
        maxBranches: tenant.maxBranches,
        isActive: tenant.isActive,
        stats: {
          userCount,
          branchCount,
          storeCount,
          canAddUser: userCount < tenant.maxUsers,
          canAddBranch: branchCount < tenant.maxBranches
        },
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt
      };
    }));

    return res.status(200).json({
      tenants,
      total: count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(count / limitNum)
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return res.status(500).json({ error: 'Failed to fetch tenants' });
  }
}

async function createTenant(req: NextApiRequest, res: NextApiResponse) {
  const db = getDb();
  const {
    code,
    name,
    businessName,
    businessTypeId,
    businessEmail,
    businessPhone,
    businessAddress,
    contactName,
    contactEmail,
    contactPhone,
    subscriptionPlan,
    maxUsers,
    maxBranches
  } = req.body;

  if (!code || !businessName || !businessTypeId) {
    return res.status(400).json({ 
      error: 'Code, business name, and business type are required' 
    });
  }

  try {
    // Check if code already exists
    const existing = await db.Tenant.findOne({ where: { code } });
    if (existing) {
      return res.status(400).json({ error: 'Tenant code already exists' });
    }

    // Create tenant
    const tenant = await db.Tenant.create({
      code,
      name: name || businessName,
      businessName,
      businessTypeId,
      businessEmail,
      businessPhone,
      businessAddress,
      contactName,
      contactEmail,
      contactPhone,
      status: 'trial',
      subscriptionPlan: subscriptionPlan || 'basic',
      subscriptionStart: new Date(),
      maxUsers: maxUsers || 5,
      maxBranches: maxBranches || 1,
      isActive: true,
      setupCompleted: false,
      onboardingStep: 0
    });

    return res.status(201).json({
      tenant,
      message: 'Tenant created successfully'
    });
  } catch (error: any) {
    console.error('Error creating tenant:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Tenant code already exists' });
    }
    return res.status(500).json({ error: 'Failed to create tenant' });
  }
}

export default withHQAuth(handler);
