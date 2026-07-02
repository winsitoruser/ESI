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

    const { id } = req.query;
    const { Tenant, BusinessType, User, TenantModule, Module, Partner } = db;

    switch (req.method) {
      case 'GET':
        return await getTenantDetails(req, res, id as string, { Tenant, BusinessType, User, TenantModule, Module, Partner });
      
      case 'PUT':
        return await updateTenant(req, res, id as string, { Tenant, BusinessType });
      
      case 'DELETE':
        return await deleteTenant(req, res, id as string, { Tenant });
      
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Admin tenant detail API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getTenantDetails(req: NextApiRequest, res: NextApiResponse, tenantId: string, models: any) {
  const { Tenant, BusinessType, User, TenantModule, Module, Partner } = models;

  const tenant = await Tenant.findByPk(tenantId, {
    include: [
      {
        model: BusinessType,
        as: 'businessType'
      },
      {
        model: Partner,
        as: 'partner'
      },
      {
        model: User,
        as: 'users'
      },
      {
        model: TenantModule,
        as: 'tenantModules',
        include: [{
          model: Module,
          as: 'module'
        }]
      }
    ]
  });

  if (!tenant) {
    return res.status(404).json({ success: false, error: 'Tenant not found' });
  }

  return res.status(200).json({
    success: true,
    data: tenant
  });
}

async function updateTenant(req: NextApiRequest, res: NextApiResponse, tenantId: string, models: any) {
  const { Tenant, BusinessType } = models;
  const { businessTypeId, businessName, businessEmail, businessPhone, businessAddress, setupCompleted } = req.body;

  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    return res.status(404).json({ success: false, error: 'Tenant not found' });
  }

  // If business type is changing, update modules
  if (businessTypeId && businessTypeId !== tenant.businessTypeId) {
    const newBusinessType = await BusinessType.findByPk(businessTypeId);
    if (!newBusinessType) {
      return res.status(404).json({ success: false, error: 'Business type not found' });
    }

    // Disable all current modules
    await db.TenantModule.update(
      { isEnabled: false, disabledAt: new Date() },
      { where: { tenantId } }
    );

    // Enable default modules for new business type
    const defaultModules = await db.BusinessTypeModule.findAll({
      where: {
        businessTypeId,
        isDefault: true
      }
    });

    for (const btm of defaultModules) {
      const existing = await db.TenantModule.findOne({
        where: { tenantId, moduleId: btm.moduleId }
      });

      if (existing) {
        await existing.update({ isEnabled: true, enabledAt: new Date(), disabledAt: null });
      } else {
        await db.TenantModule.create({
          tenantId,
          moduleId: btm.moduleId,
          isEnabled: true
        });
      }
    }
  }

  await tenant.update({
    businessTypeId: businessTypeId || tenant.businessTypeId,
    businessName: businessName || tenant.businessName,
    businessEmail: businessEmail || tenant.businessEmail,
    businessPhone: businessPhone || tenant.businessPhone,
    businessAddress: businessAddress || tenant.businessAddress,
    setupCompleted: setupCompleted !== undefined ? setupCompleted : tenant.setupCompleted
  });

  return res.status(200).json({
    success: true,
    data: tenant
  });
}

async function deleteTenant(req: NextApiRequest, res: NextApiResponse, tenantId: string, models: any) {
  const { Tenant } = models;

  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    return res.status(404).json({ success: false, error: 'Tenant not found' });
  }

  await tenant.destroy();

  return res.status(200).json({
    success: true,
    message: 'Tenant deleted successfully'
  });
}
