import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const db = require('../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { User, Tenant, BusinessType, TenantModule, Module } = db;
    
    // Get user with tenant and business type
    const user = await User.findOne({
      where: { email: session.user.email },
      include: [{
        model: Tenant,
        as: 'tenant',
        include: [{
          model: BusinessType,
          as: 'businessType'
        }]
      }]
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // SUPER ADMIN or OWNER - Return all modules
    if (user.role === 'super_admin' || user.role === 'owner') {
      const allModules = await Module.findAll({
        where: { isActive: true },
        order: [['sortOrder', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        isSuperAdmin: user.role === 'super_admin' || user.role === 'owner',
        businessType: user.role === 'super_admin' ? 'super_admin' : 'owner',
        businessTypeName: user.role === 'super_admin' ? 'Super Administrator' : 'Owner - Full Access',
        modules: allModules.map((m: any) => ({
          id: m.id,
          code: m.code,
          name: m.name,
          description: m.description,
          icon: m.icon,
          route: m.route,
          sortOrder: m.sortOrder,
          isCore: m.isCore,
          isEnabled: true
        })),
        tenant: user.tenant || null,
        needsOnboarding: false
      });
    }

    // If user doesn't have a tenant yet (new user), return minimal config
    if (!user.tenant) {
      return res.status(200).json({
        success: true,
        businessType: null,
        businessTypeName: null,
        modules: [],
        tenant: null,
        needsOnboarding: true
      });
    }

    // If tenant doesn't have business type yet, return minimal config
    if (!user.tenant.businessType) {
      return res.status(200).json({
        success: true,
        businessType: null,
        businessTypeName: null,
        modules: [],
        tenant: {
          id: user.tenant.id,
          name: user.tenant.businessName,
          setupCompleted: user.tenant.setupCompleted
        },
        needsOnboarding: true
      });
    }

    // Get enabled modules for this tenant
    const tenantModules = await TenantModule.findAll({
      where: {
        tenantId: user.tenant.id,
        isEnabled: true
      },
      include: [{
        model: Module,
        as: 'module'
      }],
      order: [[{ model: Module, as: 'module' }, 'sortOrder', 'ASC']]
    });

    const modules = tenantModules.map((tm: any) => ({
      id: tm.module.id,
      code: tm.module.code,
      name: tm.module.name,
      description: tm.module.description,
      icon: tm.module.icon,
      route: tm.module.route,
      sortOrder: tm.module.sortOrder,
      isCore: tm.module.isCore,
      isEnabled: tm.isEnabled
    }));

    return res.status(200).json({
      success: true,
      businessType: user.tenant.businessType.code,
      businessTypeName: user.tenant.businessType.name,
      modules,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.businessName,
        address: user.tenant.businessAddress,
        phone: user.tenant.businessPhone,
        email: user.tenant.businessEmail,
        setupCompleted: user.tenant.setupCompleted,
        onboardingStep: user.tenant.onboardingStep
      },
      needsOnboarding: !user.tenant.setupCompleted
    });

  } catch (error) {
    console.error('Business config error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch business configuration'
    });
  }
}
