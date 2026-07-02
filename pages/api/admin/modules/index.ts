import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

const db = require('@/models');
const { Op } = require('sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userRole = (session.user?.role as string)?.toLowerCase();
    const allowedRoles = ['admin', 'super_admin', 'superadmin'];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied - Admin access required' });
    }

    switch (req.method) {
      case 'GET':
        return await getModules(req, res);
      case 'POST':
        return await createModule(req, res, session);
      case 'PATCH':
        return await bulkUpdateModules(req, res, session);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Admin modules API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getModules(req: NextApiRequest, res: NextApiResponse) {
  const { Module, BusinessTypeModule, TenantModule, ModuleDependency } = db;
  const { search, category, pricingTier, isCore, isActive, page, limit: queryLimit } = req.query;

  // Build where clause
  const where: any = {};
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { code: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } }
    ];
  }
  if (category && category !== 'all') where.category = category;
  if (pricingTier && pricingTier !== 'all') where.pricingTier = pricingTier;
  if (isCore !== undefined && isCore !== '') where.isCore = isCore === 'true';
  if (isActive !== undefined && isActive !== '') where.isActive = isActive === 'true';

  // Pagination
  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(queryLimit as string) || 100;
  const offset = (pageNum - 1) * limitNum;

  const { count, rows: modules } = await Module.findAndCountAll({
    where,
    include: [
      {
        model: BusinessTypeModule,
        as: 'businessTypeModules',
        required: false,
        include: [{
          model: db.BusinessType,
          as: 'businessType',
          attributes: ['id', 'code', 'name']
        }]
      }
    ],
    order: [['sortOrder', 'ASC'], ['code', 'ASC']],
    limit: limitNum,
    offset,
    distinct: true
  });

  // Get stats + dependencies for each module
  const modulesWithStats = await Promise.all(modules.map(async (module: any) => {
    const [tenantCount, dependencies, dependedBy] = await Promise.all([
      TenantModule.count({ where: { moduleId: module.id, isEnabled: true } }),
      ModuleDependency ? ModuleDependency.findAll({
        where: { moduleId: module.id },
        include: [{ model: Module, as: 'dependsOn', attributes: ['id', 'code', 'name'] }]
      }).catch(() => []) : [],
      ModuleDependency ? ModuleDependency.findAll({
        where: { dependsOnModuleId: module.id },
        include: [{ model: Module, as: 'module', attributes: ['id', 'code', 'name'] }]
      }).catch(() => []) : []
    ]);

    return {
      ...module.toJSON(),
      stats: { enabledTenants: tenantCount },
      dependencies: dependencies.map((d: any) => ({
        moduleCode: d.dependsOn?.code,
        moduleName: d.dependsOn?.name,
        type: d.dependencyType
      })),
      dependedBy: dependedBy.map((d: any) => ({
        moduleCode: d.module?.code,
        moduleName: d.module?.name,
        type: d.dependencyType
      }))
    };
  }));

  // Aggregate stats
  const allModules = await Module.findAll({ attributes: ['id', 'isCore', 'isActive', 'category', 'pricingTier'] });
  const aggregateStats = {
    total: allModules.length,
    core: allModules.filter((m: any) => m.isCore).length,
    active: allModules.filter((m: any) => m.isActive).length,
    inactive: allModules.filter((m: any) => !m.isActive).length,
    byCategory: {} as Record<string, number>,
    byTier: {} as Record<string, number>
  };
  allModules.forEach((m: any) => {
    aggregateStats.byCategory[m.category] = (aggregateStats.byCategory[m.category] || 0) + 1;
    aggregateStats.byTier[m.pricingTier] = (aggregateStats.byTier[m.pricingTier] || 0) + 1;
  });

  return res.status(200).json({
    success: true,
    data: modulesWithStats,
    stats: aggregateStats,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count,
      totalPages: Math.ceil(count / limitNum)
    }
  });
}

async function createModule(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { Module } = db;
  const {
    code, name, description, icon, route, parentModuleId,
    sortOrder, isCore, category, features, pricingTier,
    setupComplexity, color, tags, version
  } = req.body;

  // Validation
  const errors: string[] = [];
  if (!code) errors.push('Code is required');
  if (!name) errors.push('Name is required');
  if (code && !/^[a-z][a-z0-9_]*$/.test(code)) errors.push('Code must be lowercase alphanumeric with underscores');
  if (code && code.length > 50) errors.push('Code must be 50 characters or less');
  if (name && name.length > 100) errors.push('Name must be 100 characters or less');
  if (pricingTier && !['basic', 'professional', 'enterprise'].includes(pricingTier)) {
    errors.push('Pricing tier must be basic, professional, or enterprise');
  }
  if (setupComplexity && !['simple', 'moderate', 'complex'].includes(setupComplexity)) {
    errors.push('Setup complexity must be simple, moderate, or complex');
  }
  if (category && !['core', 'operations', 'finance', 'hr', 'crm', 'sales', 'marketing', 'analytics', 'integration', 'system'].includes(category)) {
    errors.push('Invalid category');
  }
  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: errors.join('; ') });
  }

  const existing = await Module.findOne({ where: { code } });
  if (existing) {
    return res.status(409).json({ success: false, error: 'Module with this code already exists' });
  }

  const newModule = await Module.create({
    code,
    name,
    description: description || '',
    icon: icon || 'Package',
    route: route || '',
    parentModuleId: parentModuleId || null,
    sortOrder: sortOrder || 0,
    isCore: isCore || false,
    isActive: true,
    category: category || 'operations',
    features: features || [],
    pricingTier: pricingTier || 'basic',
    setupComplexity: setupComplexity || 'simple',
    color: color || '#3B82F6',
    tags: tags || [],
    version: version || '1.0.0'
  });

  console.log(`[ADMIN] Module created: ${code} by ${session.user?.email}`);

  return res.status(201).json({
    success: true,
    message: 'Module created successfully',
    data: newModule
  });
}

async function bulkUpdateModules(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { Module } = db;
  const { updates } = req.body;

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ success: false, error: 'Updates array is required' });
  }

  const results = [];
  for (const update of updates) {
    const { id, isActive } = update;
    if (!id) continue;
    const mod = await Module.findByPk(id);
    if (!mod) continue;
    if (mod.isCore && isActive === false) {
      results.push({ id, error: 'Cannot deactivate core module' });
      continue;
    }
    await mod.update({ isActive });
    results.push({ id, code: mod.code, isActive: mod.isActive });
  }

  console.log(`[ADMIN] Bulk module update: ${results.length} modules by ${session.user?.email}`);

  return res.status(200).json({
    success: true,
    message: `Updated ${results.length} modules`,
    data: results
  });
}
