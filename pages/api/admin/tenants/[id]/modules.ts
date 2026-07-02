import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';

const db = require('@/models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    const userRole = (session?.user?.role as string)?.toLowerCase();
    if (!session || !['admin', 'super_admin', 'superadmin'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { id } = req.query;

    switch (req.method) {
      case 'GET':
        return await getTenantModules(req, res, id as string);
      
      case 'POST':
        return await updateTenantModules(req, res, id as string);
      
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Tenant modules API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getTenantModules(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { Tenant, TenantModule, Module } = db;

  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    return res.status(404).json({ success: false, error: 'Tenant not found' });
  }

  const tenantModules = await TenantModule.findAll({
    where: { tenantId },
    include: [{
      model: Module,
      as: 'module'
    }],
    order: [[{ model: Module, as: 'module' }, 'sortOrder', 'ASC']]
  });

  return res.status(200).json({
    success: true,
    data: tenantModules
  });
}

async function updateTenantModules(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { Tenant, TenantModule, Module } = db;
  const { modules } = req.body; // Array of { moduleId, isEnabled }

  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    return res.status(404).json({ success: false, error: 'Tenant not found' });
  }

  if (!Array.isArray(modules)) {
    return res.status(400).json({ success: false, error: 'Modules must be an array' });
  }

  const results = [];

  for (const { moduleId, isEnabled } of modules) {
    const moduleData = await Module.findByPk(moduleId);
    if (!moduleData) {
      continue;
    }

    const existing = await TenantModule.findOne({
      where: { tenantId, moduleId }
    });

    if (existing) {
      await existing.update({
        isEnabled,
        enabledAt: isEnabled ? new Date() : existing.enabledAt,
        disabledAt: !isEnabled ? new Date() : null
      });
      results.push(existing);
    } else {
      const newTenantModule = await TenantModule.create({
        tenantId,
        moduleId,
        isEnabled,
        enabledAt: isEnabled ? new Date() : null
      });
      results.push(newTenantModule);
    }
  }

  return res.status(200).json({
    success: true,
    data: results,
    message: 'Modules updated successfully'
  });
}
