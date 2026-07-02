import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const getDb = () => require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.query;
    const tenantId = (session.user as any).tenantId;
    const userId = (session.user as any).id;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'No tenant associated with user' });
    }

    switch (req.method) {
      case 'POST':
        return activatePackage(req, res, id as string, tenantId, userId);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Package activation API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function activatePackage(
  req: NextApiRequest,
  res: NextApiResponse,
  packageId: string,
  tenantId: string,
  userId: number
) {
  const db = getDb();
  const transaction = await db.sequelize.transaction();
  
  try {
    console.log(`🔄 Activating package ${packageId} for tenant ${tenantId}...`);
    
    // 1. Get package with all modules
    const [packageData] = await db.sequelize.query(
      `
      SELECT 
        bp.*,
        json_agg(jsonb_build_object(
          'moduleId', pm.module_id,
          'isRequired', pm.is_required,
          'isDefaultEnabled', pm.is_default_enabled,
          'configuration', pm.configuration
        )) FILTER (WHERE pm.id IS NOT NULL) as modules
      FROM business_packages bp
      LEFT JOIN package_modules pm ON bp.id = pm.package_id
      WHERE bp.id = :packageId AND bp.is_active = true
      GROUP BY bp.id
      `,
      {
        replacements: { packageId },
        type: db.Sequelize.QueryTypes.SELECT,
        transaction
      }
    );
    
    if (!packageData) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Package not found' });
    }
    
    const modules = packageData.modules || [];
    console.log(`📦 Package has ${modules.length} modules`);
    
    // 2. Resolve module dependencies
    const allModuleIds = new Set<string>();
    const modulesToEnable = [];
    
    for (const pkgModule of modules) {
      if (!pkgModule.moduleId) continue;
      
      allModuleIds.add(pkgModule.moduleId);
      modulesToEnable.push(pkgModule);
      
      // Get dependencies
      const dependencies = await db.sequelize.query(
        `
        SELECT depends_on_module_id, is_required
        FROM module_dependencies
        WHERE module_id = :moduleId AND is_required = true
        `,
        {
          replacements: { moduleId: pkgModule.moduleId },
          type: db.Sequelize.QueryTypes.SELECT,
          transaction
        }
      );
      
      for (const dep of dependencies) {
        if (!allModuleIds.has(dep.depends_on_module_id)) {
          allModuleIds.add(dep.depends_on_module_id);
          modulesToEnable.push({
            moduleId: dep.depends_on_module_id,
            isRequired: true,
            isDefaultEnabled: true,
            configuration: {}
          });
        }
      }
    }
    
    console.log(`📋 Total modules to enable (including dependencies): ${modulesToEnable.length}`);
    
    // 3. Enable all modules for tenant
    const now = new Date();
    for (const module of modulesToEnable) {
      // Check if already enabled
      const [existing] = await db.sequelize.query(
        `SELECT id, is_enabled FROM tenant_modules WHERE tenant_id = :tenantId AND module_id = :moduleId`,
        {
          replacements: { tenantId, moduleId: module.moduleId },
          type: db.Sequelize.QueryTypes.SELECT,
          transaction
        }
      );
      
      if (existing) {
        // Update if not enabled
        if (!existing.is_enabled) {
          await db.sequelize.query(
            `
            UPDATE tenant_modules 
            SET is_enabled = true, 
                enabled_at = :now,
                enabled_by = :userId,
                updated_at = :now
            WHERE id = :id
            `,
            {
              replacements: { id: existing.id, now, userId },
              type: db.Sequelize.QueryTypes.UPDATE,
              transaction
            }
          );
        }
      } else {
        // Insert new
        await db.sequelize.query(
          `
          INSERT INTO tenant_modules (id, tenant_id, module_id, is_enabled, enabled_at, enabled_by, created_at, updated_at)
          VALUES (uuid_generate_v4(), :tenantId, :moduleId, true, :now, :userId, :now, :now)
          `,
          {
            replacements: { tenantId, moduleId: module.moduleId, now, userId },
            type: db.Sequelize.QueryTypes.INSERT,
            transaction
          }
        );
      }
    }
    
    // 4. Record package activation
    const [existingPackage] = await db.sequelize.query(
      `SELECT id FROM tenant_packages WHERE tenant_id = :tenantId AND package_id = :packageId`,
      {
        replacements: { tenantId, packageId },
        type: db.Sequelize.QueryTypes.SELECT,
        transaction
      }
    );
    
    if (existingPackage) {
      await db.sequelize.query(
        `
        UPDATE tenant_packages 
        SET is_active = true, activated_at = :now, activated_by = :userId, updated_at = :now
        WHERE id = :id
        `,
        {
          replacements: { id: existingPackage.id, now, userId },
          type: db.Sequelize.QueryTypes.UPDATE,
          transaction
        }
      );
    } else {
      await db.sequelize.query(
        `
        INSERT INTO tenant_packages (id, tenant_id, package_id, is_active, activated_at, activated_by, configuration, created_at, updated_at)
        VALUES (uuid_generate_v4(), :tenantId, :packageId, true, :now, :userId, '{}', :now, :now)
        `,
        {
          replacements: { tenantId, packageId, now, userId },
          type: db.Sequelize.QueryTypes.INSERT,
          transaction
        }
      );
    }
    
    // 5. Auto-configure dashboard if package has dashboard config
    let dashboardConfigured = false;
    const dashboardConfigId = packageData.metadata?.dashboardConfigId;
    
    if (dashboardConfigId) {
      console.log(`📊 Configuring dashboard: ${dashboardConfigId}`);
      
      // Check if tenant already has a dashboard
      const [existingDashboard] = await db.sequelize.query(
        `SELECT id FROM tenant_dashboards WHERE tenant_id = :tenantId AND is_active = true`,
        {
          replacements: { tenantId },
          type: db.Sequelize.QueryTypes.SELECT,
          transaction
        }
      );
      
      if (existingDashboard) {
        // Update existing dashboard
        await db.sequelize.query(
          `UPDATE tenant_dashboards 
           SET dashboard_config_id = :dashboardConfigId, updated_at = :now
           WHERE id = :id`,
          {
            replacements: { id: existingDashboard.id, dashboardConfigId, now },
            type: db.Sequelize.QueryTypes.UPDATE,
            transaction
          }
        );
      } else {
        // Create new dashboard
        await db.sequelize.query(
          `INSERT INTO tenant_dashboards (id, tenant_id, dashboard_config_id, customization, is_active, created_at, updated_at)
           VALUES (uuid_generate_v4(), :tenantId, :dashboardConfigId, '{}'::jsonb, true, :now, :now)`,
          {
            replacements: { tenantId, dashboardConfigId, now },
            type: db.Sequelize.QueryTypes.INSERT,
            transaction
          }
        );
      }
      
      dashboardConfigured = true;
      console.log(`✅ Dashboard configured`);
    }
    
    await transaction.commit();
    
    console.log(`✅ Package activated successfully`);
    
    return res.status(200).json({
      success: true,
      message: `Package "${packageData.name}" activated successfully`,
      data: {
        packageId,
        packageName: packageData.name,
        modulesEnabled: modulesToEnable.length,
        dashboardConfigured,
        activatedAt: now
      }
    });
    
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error activating package:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
