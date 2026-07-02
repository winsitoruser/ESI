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

    const { Module, BusinessTypeModule, TenantModule } = db;

    switch (req.method) {
      case 'GET':
        return await getModules(req, res, { Module, BusinessTypeModule, TenantModule });
      
      case 'POST':
        return await createModule(req, res, { Module });
      
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Admin modules API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getModules(req: NextApiRequest, res: NextApiResponse, models: any) {
  const { Module, BusinessTypeModule, TenantModule } = models;

  const modules = await Module.findAll({
    include: [
      {
        model: BusinessTypeModule,
        as: 'businessTypeModules',
        include: [{
          model: db.BusinessType,
          as: 'businessType',
          attributes: ['id', 'code', 'name']
        }]
      }
    ],
    order: [['sortOrder', 'ASC']]
  });

  // Get usage statistics for each module
  const modulesWithStats = await Promise.all(modules.map(async (module: any) => {
    const tenantCount = await TenantModule.count({
      where: { moduleId: module.id, isEnabled: true }
    });

    return {
      ...module.toJSON(),
      stats: {
        enabledTenants: tenantCount
      }
    };
  }));

  return res.status(200).json({
    success: true,
    data: modulesWithStats
  });
}

async function createModule(req: NextApiRequest, res: NextApiResponse, models: any) {
  const { Module } = models;
  const { code, name, description, icon, route, parentModuleId, sortOrder, isCore } = req.body;

  if (!code || !name) {
    return res.status(400).json({ 
      success: false, 
      error: 'Code and name are required' 
    });
  }

  const existing = await Module.findOne({ where: { code } });
  if (existing) {
    return res.status(400).json({ 
      success: false, 
      error: 'Module with this code already exists' 
    });
  }

  const newModule = await Module.create({
    code,
    name,
    description,
    icon,
    route,
    parentModuleId,
    sortOrder: sortOrder || 0,
    isCore: isCore || false,
    isActive: true
  });

  return res.status(201).json({
    success: true,
    data: newModule
  });
}
