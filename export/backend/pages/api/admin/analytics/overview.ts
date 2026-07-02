import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

const db = require('@/models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'super_admin'].includes(session.user?.role as string)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { Tenant, BusinessType, User, Module, TenantModule, Partner } = db;

    // Get total counts
    const totalTenants = await Tenant.count();
    const totalUsers = await User.count();
    const totalPartners = await Partner.count();
    const totalModules = await Module.count();

    // Get tenants by business type
    const tenantsByBusinessType = await Tenant.findAll({
      attributes: [
        'businessTypeId',
        [db.Sequelize.fn('COUNT', db.Sequelize.col('Tenant.id')), 'count']
      ],
      include: [{
        model: BusinessType,
        as: 'businessType',
        attributes: ['id', 'code', 'name', 'icon']
      }],
      group: ['businessTypeId', 'businessType.id', 'businessType.code', 'businessType.name', 'businessType.icon']
    });

    // Get active vs pending tenants
    const activeTenants = await Tenant.count({ where: { setupCompleted: true } });
    const pendingTenants = await Tenant.count({ where: { setupCompleted: false } });

    // Get module usage statistics
    const moduleUsage = await TenantModule.findAll({
      attributes: [
        'moduleId',
        [db.Sequelize.fn('COUNT', db.Sequelize.col('TenantModule.id')), 'totalAssignments'],
        [db.Sequelize.fn('SUM', db.Sequelize.literal('CASE WHEN is_enabled = true THEN 1 ELSE 0 END')), 'enabledCount']
      ],
      include: [{
        model: Module,
        as: 'module',
        attributes: ['id', 'code', 'name', 'icon']
      }],
      group: ['moduleId', 'module.id', 'module.code', 'module.name', 'module.icon'],
      order: [[db.Sequelize.literal('enabledCount'), 'DESC']],
      limit: 10
    });

    // Get recent tenants
    const recentTenants = await Tenant.findAll({
      include: [{
        model: BusinessType,
        as: 'businessType',
        attributes: ['id', 'code', 'name']
      }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    // Get user distribution by role
    const usersByRole = await User.findAll({
      attributes: [
        'role',
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
      ],
      group: ['role']
    });

    return res.status(200).json({
      success: true,
      data: {
        overview: {
          totalTenants,
          totalUsers,
          totalPartners,
          totalModules,
          activeTenants,
          pendingTenants
        },
        tenantsByBusinessType: tenantsByBusinessType.map((item: any) => ({
          businessType: item.businessType,
          count: parseInt(item.get('count'))
        })),
        moduleUsage: moduleUsage.map((item: any) => ({
          module: item.module,
          totalAssignments: parseInt(item.get('totalAssignments')),
          enabledCount: parseInt(item.get('enabledCount'))
        })),
        recentTenants,
        usersByRole: usersByRole.map((item: any) => ({
          role: item.role,
          count: parseInt(item.get('count'))
        }))
      }
    });
  } catch (error: any) {
    console.error('Analytics overview API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
