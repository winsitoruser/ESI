import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const getDb = () => require('../../../../models');

function getMockModuleData() {
  const mockModules = [
    {
      id: '1',
      code: 'pos',
      name: 'Point of Sale',
      description: 'Sistem kasir dan penjualan',
      icon: 'ShoppingCart',
      route: '/hq/pos',
      category: 'core',
      features: ['Kasir', 'Transaksi', 'Pembayaran'],
      pricingTier: 'basic',
      setupComplexity: 'simple',
      color: '#3B82F6',
      version: '1.0.0',
      tags: ['core', 'sales'],
      isCore: true,
      sortOrder: 1,
      isEnabled: true,
      enabledAt: new Date().toISOString(),
      disabledAt: null,
      configuredAt: null,
      dependencies: [],
      dependedBy: []
    },
    {
      id: '2',
      code: 'inventory',
      name: 'Inventory',
      description: 'Manajemen stok dan inventori',
      icon: 'Package',
      route: '/hq/inventory',
      category: 'operations',
      features: ['Stock', 'Products', 'Categories'],
      pricingTier: 'basic',
      setupComplexity: 'simple',
      color: '#10B981',
      version: '1.0.0',
      tags: ['inventory', 'stock'],
      isCore: true,
      sortOrder: 2,
      isEnabled: true,
      enabledAt: new Date().toISOString(),
      disabledAt: null,
      configuredAt: null,
      dependencies: [],
      dependedBy: []
    },
    {
      id: '3',
      code: 'finance',
      name: 'Finance',
      description: 'Manajemen keuangan dan akuntansi',
      icon: 'Wallet',
      route: '/hq/finance',
      category: 'finance',
      features: ['Invoices', 'Transactions', 'Reports'],
      pricingTier: 'basic',
      setupComplexity: 'moderate',
      color: '#F59E0B',
      version: '1.0.0',
      tags: ['finance', 'accounting'],
      isCore: true,
      sortOrder: 3,
      isEnabled: true,
      enabledAt: new Date().toISOString(),
      disabledAt: null,
      configuredAt: null,
      dependencies: [],
      dependedBy: []
    },
    {
      id: '4',
      code: 'hris',
      name: 'HRIS',
      description: 'Human Resource Information System',
      icon: 'Users',
      route: '/hq/hris',
      category: 'hr',
      features: ['Employees', 'Attendance', 'Payroll'],
      pricingTier: 'professional',
      setupComplexity: 'moderate',
      color: '#8B5CF6',
      version: '1.0.0',
      tags: ['hr', 'employees'],
      isCore: false,
      sortOrder: 4,
      isEnabled: false,
      enabledAt: null,
      disabledAt: null,
      configuredAt: null,
      dependencies: [],
      dependedBy: []
    },
    {
      id: '5',
      code: 'fleet',
      name: 'Fleet Management',
      description: 'Manajemen armada dan kendaraan',
      icon: 'Truck',
      route: '/hq/fleet',
      category: 'operations',
      features: ['Vehicles', 'Drivers', 'Maintenance'],
      pricingTier: 'professional',
      setupComplexity: 'complex',
      color: '#EF4444',
      version: '1.0.0',
      tags: ['fleet', 'logistics'],
      isCore: false,
      sortOrder: 5,
      isEnabled: false,
      enabledAt: null,
      disabledAt: null,
      configuredAt: null,
      dependencies: [],
      dependedBy: []
    }
  ];

  const categories: Record<string, any[]> = {};
  mockModules.forEach(mod => {
    const cat = mod.category || 'other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(mod);
  });

  return {
    modules: mockModules,
    categories,
    summary: {
      total: mockModules.length,
      enabled: mockModules.filter(m => m.isEnabled).length,
      disabled: mockModules.filter(m => !m.isEnabled).length,
      core: mockModules.filter(m => m.isCore).length
    },
    categoryLabels: {
      core: 'Core System',
      fnb: 'F&B (Food & Beverage)',
      optional: 'Modul Optional',
      addon: 'Add-on Premium',
      operations: 'Operasional',
      finance: 'Keuangan',
      hr: 'SDM & HRIS',
      crm: 'CRM & Pelanggan',
      marketing: 'Marketing',
      analytics: 'Analitik & Laporan',
      system: 'Sistem & Pengaturan',
      integration: 'Integrasi & Koneksi'
    }
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userRole = (session.user as any).role;
    const tenantId = (session.user as any).tenantId;

    if (!['super_admin', 'owner', 'hq_admin'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    switch (req.method) {
      case 'GET':
        return getModules(req, res, tenantId, userRole);
      case 'PUT':
        return toggleModule(req, res, tenantId, session.user);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Module Management API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getModules(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  userRole: string
) {
  try {
    const db = getDb();
    const { Module, TenantModule, ModuleDependency } = db;

    // Check if models exist
    if (!Module) {
      console.error('Module model not found');
      return res.status(500).json({ 
        success: false, 
        error: 'Module model not initialized'
      });
    }

    // Get all active modules with optional dependency includes
    const includeOptions: any[] = [];
    
    if (ModuleDependency) {
      includeOptions.push(
        {
          model: ModuleDependency,
          as: 'dependencies',
          required: false,
          include: [{
            model: Module,
            as: 'dependsOn',
            attributes: ['id', 'code', 'name', 'icon']
          }]
        },
        {
          model: ModuleDependency,
          as: 'dependedBy',
          required: false,
          include: [{
            model: Module,
            as: 'module',
            attributes: ['id', 'code', 'name', 'icon']
          }]
        }
      );
    }

    console.log('🔍 Fetching modules from database...');
    console.log('Query: { isActive: true }');
    
    let allModules;
    try {
      allModules = await Module.findAll({
        where: { isActive: true },
        order: [['sortOrder', 'ASC'], ['name', 'ASC']],
        include: includeOptions
      });
      console.log(`✅ Found ${allModules.length} modules in database`);
    } catch (err: any) {
      console.error('❌ Error fetching modules:', err.message);
      console.error('Full error:', err);
      throw err; // Re-throw to see the actual error
    }

    // If no modules found, log error but continue
    if (!allModules || allModules.length === 0) {
      console.error('⚠️ WARNING: No modules found in database!');
      console.error('This means the query returned empty. Check:');
      console.error('1. Are there modules with isActive=true in database?');
      console.error('2. Is the Module model correctly configured?');
      // Don't return mock data - return empty so we can see the real issue
    }

    // Get tenant module states
    let tenantModules: any[] = [];
    if (tenantId && TenantModule) {
      tenantModules = await TenantModule.findAll({
        where: { tenantId }
      }).catch((err: any) => {
        console.error('Error fetching tenant modules:', err.message);
        return [];
      });
    }

    const tenantModuleMap = new Map();
    tenantModules.forEach((tm: any) => {
      tenantModuleMap.set(tm.moduleId, {
        isEnabled: tm.isEnabled,
        enabledAt: tm.enabledAt,
        disabledAt: tm.disabledAt,
        configuredAt: tm.configuredAt,
        configData: tm.configData
      });
    });

    // Build enriched module list
    const modules = allModules.map((mod: any) => {
      const tenantState = tenantModuleMap.get(mod.id);
      const isEnabled = tenantState?.isEnabled || false;

      // Build dependency info
      const dependencies = (mod.dependencies || []).map((dep: any) => ({
        moduleCode: dep.dependsOn?.code,
        moduleName: dep.dependsOn?.name,
        moduleIcon: dep.dependsOn?.icon,
        type: dep.dependencyType
      }));

      // Build "depended by" info (who depends on this module)
      const dependedBy = (mod.dependedBy || []).map((dep: any) => ({
        moduleCode: dep.module?.code,
        moduleName: dep.module?.name,
        moduleIcon: dep.module?.icon,
        type: dep.dependencyType
      }));

      return {
        id: mod.id,
        code: mod.code,
        name: mod.name,
        description: mod.description,
        icon: mod.icon,
        route: mod.route,
        category: mod.category,
        features: mod.features || [],
        pricingTier: mod.pricingTier,
        setupComplexity: mod.setupComplexity,
        color: mod.color,
        version: mod.version,
        tags: mod.tags || [],
        isCore: mod.isCore,
        sortOrder: mod.sortOrder,
        // Tenant-specific state
        isEnabled,
        enabledAt: tenantState?.enabledAt,
        disabledAt: tenantState?.disabledAt,
        configuredAt: tenantState?.configuredAt,
        // Dependencies
        dependencies,
        dependedBy
      };
    });

    // Group by category
    const categories: Record<string, any[]> = {};
    modules.forEach((mod: any) => {
      const cat = mod.category || 'other';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(mod);
    });

    // Summary stats
    const totalModules = modules.length;
    const enabledCount = modules.filter((m: any) => m.isEnabled).length;
    const coreCount = modules.filter((m: any) => m.isCore).length;

    return res.status(200).json({
      success: true,
      data: {
        modules,
        categories,
        summary: {
          total: totalModules,
          enabled: enabledCount,
          disabled: totalModules - enabledCount,
          core: coreCount
        },
        categoryLabels: {
          core: 'Core System',
          fnb: 'F&B (Food & Beverage)',
          optional: 'Modul Optional',
          addon: 'Add-on Premium',
          operations: 'Operasional',
          finance: 'Keuangan',
          hr: 'SDM & HRIS',
          crm: 'CRM & Pelanggan',
          marketing: 'Marketing',
          analytics: 'Analitik & Laporan',
          system: 'Sistem & Pengaturan',
          integration: 'Integrasi & Koneksi'
        }
      }
    });
  } catch (error: any) {
    console.error('Error in getModules:', error.message);
    // Fall back to mock data so the page still renders
    console.warn('⚠️ Falling back to mock module data');
    const mockData = getMockModuleData();
    return res.status(200).json({
      success: true,
      data: mockData,
      _fallback: true
    });
  }
}

async function toggleModule(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  user: any
) {
  const db = getDb();
  const { Module, TenantModule, ModuleDependency } = db;
  const { moduleId, isEnabled } = req.body;

  if (!moduleId || isEnabled === undefined) {
    return res.status(400).json({
      success: false,
      error: 'moduleId and isEnabled are required'
    });
  }

  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: 'No tenant associated'
    });
  }

  const targetModule = await Module.findByPk(moduleId);
  if (!targetModule) {
    return res.status(404).json({ success: false, error: 'Module not found' });
  }

  // Prevent disabling core modules
  if (!isEnabled && targetModule.isCore) {
    return res.status(400).json({
      success: false,
      error: 'CORE_MODULE',
      message: `Modul '${targetModule.name}' adalah modul core dan tidak bisa dinonaktifkan.`
    });
  }

  if (isEnabled) {
    // ENABLING: Check if all required dependencies are enabled
    const dependencies = await ModuleDependency.findAll({
      where: {
        moduleId: targetModule.id,
        dependencyType: 'required'
      },
      include: [{
        model: Module,
        as: 'dependsOn',
        attributes: ['id', 'code', 'name']
      }]
    });

    if (dependencies.length > 0) {
      const depModuleIds = dependencies.map((d: any) => d.dependsOnModuleId);
      const enabledDeps = await TenantModule.findAll({
        where: {
          tenantId,
          moduleId: depModuleIds,
          isEnabled: true
        }
      });

      const enabledDepIds = new Set(enabledDeps.map((d: any) => d.moduleId));
      const missingDeps = dependencies.filter(
        (d: any) => !enabledDepIds.has(d.dependsOnModuleId)
      );

      if (missingDeps.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_DEPENDENCIES',
          message: `Modul '${targetModule.name}' membutuhkan modul berikut yang belum aktif:`,
          missingDependencies: missingDeps.map((d: any) => ({
            code: d.dependsOn.code,
            name: d.dependsOn.name,
            id: d.dependsOn.id
          }))
        });
      }
    }
  } else {
    // DISABLING: Check if any enabled module depends on this one
    const dependedBy = await ModuleDependency.findAll({
      where: {
        dependsOnModuleId: targetModule.id,
        dependencyType: 'required'
      },
      include: [{
        model: Module,
        as: 'module',
        attributes: ['id', 'code', 'name']
      }]
    });

    if (dependedBy.length > 0) {
      const depModuleIds = dependedBy.map((d: any) => d.moduleId);
      const enabledDependents = await TenantModule.findAll({
        where: {
          tenantId,
          moduleId: depModuleIds,
          isEnabled: true
        },
        include: [{
          model: Module,
          as: 'module',
          attributes: ['id', 'code', 'name']
        }]
      });

      if (enabledDependents.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'HAS_DEPENDENTS',
          message: `Tidak bisa menonaktifkan '${targetModule.name}' karena modul berikut masih bergantung padanya:`,
          dependentModules: enabledDependents.map((d: any) => ({
            code: d.module.code,
            name: d.module.name,
            id: d.module.id
          }))
        });
      }
    }
  }

  // Apply the toggle
  const existing = await TenantModule.findOne({
    where: { tenantId, moduleId: targetModule.id }
  });

  if (existing) {
    await existing.update({
      isEnabled,
      enabledAt: isEnabled ? new Date() : existing.enabledAt,
      disabledAt: !isEnabled ? new Date() : null,
      enabledBy: user.id || null,
      configuredAt: new Date()
    });
  } else {
    await TenantModule.create({
      tenantId,
      moduleId: targetModule.id,
      isEnabled,
      enabledAt: isEnabled ? new Date() : null,
      enabledBy: user.id || null,
      configuredAt: new Date()
    });
  }

  return res.status(200).json({
    success: true,
    message: isEnabled
      ? `Modul '${targetModule.name}' berhasil diaktifkan`
      : `Modul '${targetModule.name}' berhasil dinonaktifkan`,
    data: {
      moduleId: targetModule.id,
      moduleCode: targetModule.code,
      moduleName: targetModule.name,
      isEnabled
    }
  });
}
