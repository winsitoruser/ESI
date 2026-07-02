// API endpoint for specific module management
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

const getDb = () => require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userRole = (session.user?.role as string)?.toLowerCase();
    const allowedRoles = ['admin', 'super_admin', 'superadmin'];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden - Admin access required' });
    }

    const { id } = req.query;
    const db = getDb();

    switch (req.method) {
      case 'GET':
        return await getModule(req, res, db, id as string);
      case 'PUT':
        return await updateModule(req, res, db, id as string, userRole, session);
      case 'DELETE':
        return await deleteModule(req, res, db, id as string, userRole, session);
      default:
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Module detail API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

async function getModule(req: NextApiRequest, res: NextApiResponse, db: any, id: string) {
  const moduleData = await db.Module.findByPk(id, {
    include: [
      {
        model: db.BusinessType,
        as: 'businessTypes',
        through: { attributes: ['isDefault', 'isOptional'] }
      },
      {
        model: db.Module,
        as: 'subModules',
        attributes: ['id', 'code', 'name', 'isActive']
      }
    ]
  });

  if (!moduleData) {
    return res.status(404).json({ success: false, message: 'Module not found' });
  }

  // Get stats
  const [tenantCount, totalTenants] = await Promise.all([
    db.TenantModule.count({ where: { moduleId: id, isEnabled: true } }),
    db.TenantModule.count({ where: { moduleId: id } })
  ]);

  // Get dependencies
  let dependencies: any[] = [];
  let dependedBy: any[] = [];
  if (db.ModuleDependency) {
    try {
      dependencies = await db.ModuleDependency.findAll({
        where: { moduleId: id },
        include: [{ model: db.Module, as: 'dependsOn', attributes: ['id', 'code', 'name', 'isActive'] }]
      });
      dependedBy = await db.ModuleDependency.findAll({
        where: { dependsOnModuleId: id },
        include: [{ model: db.Module, as: 'module', attributes: ['id', 'code', 'name', 'isActive'] }]
      });
    } catch (e) { /* dependencies table may not exist */ }
  }

  return res.status(200).json({
    success: true,
    data: {
      ...moduleData.toJSON(),
      tenantCount,
      totalTenants,
      dependencies: dependencies.map((d: any) => ({
        id: d.id,
        moduleCode: d.dependsOn?.code,
        moduleName: d.dependsOn?.name,
        moduleActive: d.dependsOn?.isActive,
        type: d.dependencyType
      })),
      dependedBy: dependedBy.map((d: any) => ({
        id: d.id,
        moduleCode: d.module?.code,
        moduleName: d.module?.name,
        moduleActive: d.module?.isActive,
        type: d.dependencyType
      }))
    }
  });
}

async function updateModule(req: NextApiRequest, res: NextApiResponse, db: any, id: string, userRole: string, session: any) {
  const isSuperAdmin = ['super_admin', 'superadmin'].includes(userRole);
  if (!isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Only super admin can update modules' });
  }

  const {
    name, description, icon, route, isCore, isActive,
    category, features, pricingTier, setupComplexity, color, tags, version,
    sortOrder, businessTypes
  } = req.body;

  const moduleToUpdate = await db.Module.findByPk(id);
  if (!moduleToUpdate) {
    return res.status(404).json({ success: false, message: 'Module not found' });
  }

  // Validation
  if (name && name.length > 100) {
    return res.status(400).json({ success: false, message: 'Name must be 100 characters or less' });
  }
  if (pricingTier && !['basic', 'professional', 'enterprise'].includes(pricingTier)) {
    return res.status(400).json({ success: false, message: 'Invalid pricing tier' });
  }
  if (setupComplexity && !['simple', 'moderate', 'complex'].includes(setupComplexity)) {
    return res.status(400).json({ success: false, message: 'Invalid setup complexity' });
  }

  // Build update object (only include provided fields)
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (icon !== undefined) updateData.icon = icon;
  if (route !== undefined) updateData.route = route;
  if (isCore !== undefined) updateData.isCore = isCore;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (category !== undefined) updateData.category = category;
  if (features !== undefined) updateData.features = features;
  if (pricingTier !== undefined) updateData.pricingTier = pricingTier;
  if (setupComplexity !== undefined) updateData.setupComplexity = setupComplexity;
  if (color !== undefined) updateData.color = color;
  if (tags !== undefined) updateData.tags = tags;
  if (version !== undefined) updateData.version = version;
  if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

  await moduleToUpdate.update(updateData);

  // Update business type associations if provided
  if (businessTypes && Array.isArray(businessTypes)) {
    await db.BusinessTypeModule.destroy({ where: { moduleId: id } });
    for (const bt of businessTypes) {
      await db.BusinessTypeModule.create({
        businessTypeId: bt.businessTypeId,
        moduleId: id,
        isDefault: bt.isDefault || false,
        isOptional: bt.isOptional || false
      });
    }
  }

  console.log(`[ADMIN] Module updated: ${moduleToUpdate.code} by ${session.user?.email}`);

  // Return updated module with all relations
  const updatedModule = await db.Module.findByPk(id, {
    include: [
      { model: db.BusinessType, as: 'businessTypes', through: { attributes: ['isDefault', 'isOptional'] } }
    ]
  });

  return res.status(200).json({
    success: true,
    message: 'Module updated successfully',
    data: updatedModule
  });
}

async function deleteModule(req: NextApiRequest, res: NextApiResponse, db: any, id: string, userRole: string, session: any) {
  const isSuperAdmin = ['super_admin', 'superadmin'].includes(userRole);
  if (!isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Only super admin can delete modules' });
  }

  const moduleToDelete = await db.Module.findByPk(id);
  if (!moduleToDelete) {
    return res.status(404).json({ success: false, message: 'Module not found' });
  }

  if (moduleToDelete.isCore) {
    return res.status(400).json({ success: false, message: 'Cannot delete core module' });
  }

  const tenantCount = await db.TenantModule.count({
    where: { moduleId: id, isEnabled: true }
  });

  if (tenantCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete module. It is currently used by ${tenantCount} tenant(s)`
    });
  }

  // Check if other modules depend on this one
  if (db.ModuleDependency) {
    try {
      const dependedByCount = await db.ModuleDependency.count({
        where: { dependsOnModuleId: id }
      });
      if (dependedByCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete module. ${dependedByCount} other module(s) depend on it`
        });
      }
    } catch (e) { /* ignore if table doesn't exist */ }
  }

  // Clean up associations
  await db.BusinessTypeModule.destroy({ where: { moduleId: id } });
  await db.TenantModule.destroy({ where: { moduleId: id } });
  if (db.ModuleDependency) {
    try {
      await db.ModuleDependency.destroy({ where: { moduleId: id } });
    } catch (e) { /* ignore */ }
  }

  const deletedCode = moduleToDelete.code;
  await moduleToDelete.destroy();

  console.log(`[ADMIN] Module deleted: ${deletedCode} by ${session.user?.email}`);

  return res.status(200).json({
    success: true,
    message: 'Module deleted successfully'
  });
}
