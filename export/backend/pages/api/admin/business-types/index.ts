import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

const db = require('@/models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !['SUPER_ADMIN', 'super_admin'].includes(session.user?.role as string)) {
      return res.status(403).json({ success: false, error: 'Access denied - Super Admin only' });
    }

    const { BusinessType, BusinessTypeModule, Module, Tenant } = db;

    switch (req.method) {
      case 'GET':
        return await getBusinessTypes(req, res, { BusinessType, BusinessTypeModule, Module, Tenant });
      
      case 'POST':
        return await createBusinessType(req, res, { BusinessType });
      
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Admin business types API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getBusinessTypes(req: NextApiRequest, res: NextApiResponse, models: any) {
  const { BusinessType, BusinessTypeModule, Module, Tenant } = models;

  const businessTypes = await BusinessType.findAll({
    include: [
      {
        model: BusinessTypeModule,
        as: 'businessTypeModules',
        include: [{
          model: Module,
          as: 'module'
        }]
      }
    ],
    order: [['createdAt', 'ASC']]
  });

  // Get statistics for each business type
  const businessTypesWithStats = await Promise.all(businessTypes.map(async (bt: any) => {
    const tenantCount = await Tenant.count({
      where: { businessTypeId: bt.id }
    });

    const defaultModules = bt.businessTypeModules.filter((btm: any) => btm.isDefault);
    const optionalModules = bt.businessTypeModules.filter((btm: any) => btm.isOptional);

    return {
      ...bt.toJSON(),
      stats: {
        totalTenants: tenantCount,
        defaultModulesCount: defaultModules.length,
        optionalModulesCount: optionalModules.length,
        totalModulesCount: bt.businessTypeModules.length
      }
    };
  }));

  return res.status(200).json({
    success: true,
    data: businessTypesWithStats
  });
}

async function createBusinessType(req: NextApiRequest, res: NextApiResponse, models: any) {
  const { BusinessType } = models;
  const { code, name, description, icon } = req.body;

  if (!code || !name) {
    return res.status(400).json({ 
      success: false, 
      error: 'Code and name are required' 
    });
  }

  const existing = await BusinessType.findOne({ where: { code } });
  if (existing) {
    return res.status(400).json({ 
      success: false, 
      error: 'Business type with this code already exists' 
    });
  }

  const businessType = await BusinessType.create({
    code,
    name,
    description,
    icon
  });

  return res.status(201).json({
    success: true,
    data: businessType
  });
}
