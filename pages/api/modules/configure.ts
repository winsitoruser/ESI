import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { moduleRegistry } from '@/lib/modules/ModuleRegistry';
import { flowOrchestrator } from '@/lib/integration/FlowOrchestrator';

const getDb = () => require('../../../models');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }
    
    const userRole = (session.user as any).role;
    const tenantId = (session.user as any).tenantId;
    
    if (!['super_admin', 'owner', 'hq_admin'].includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }
    
    if (req.method === 'POST') {
      const { moduleIds, businessType, configuration } = req.body;
      
      if (!moduleIds || !Array.isArray(moduleIds)) {
        return res.status(400).json({
          success: false,
          error: 'moduleIds array is required'
        });
      }
      
      try {
        const db = getDb();
        const { TenantModule, Module } = db;
        
        // Resolve dependencies
        const allModuleIds = moduleRegistry.resolveDependencies(moduleIds);
        
        console.log(`Configuring modules for tenant ${tenantId}:`, allModuleIds);
        
        // Validate modules for business type if provided
        if (businessType) {
          const validation = moduleRegistry.validateModulesForBusinessType(
            allModuleIds,
            businessType
          );
          
          if (validation.invalid.length > 0) {
            return res.status(400).json({
              success: false,
              error: 'Some modules are not compatible with business type',
              invalidModules: validation.invalid
            });
          }
        }
        
        // Enable modules for tenant
        const results = [];
        const errors = [];
        
        for (const moduleCode of allModuleIds) {
          try {
            const module = moduleRegistry.getModule(moduleCode);
            if (!module) {
              errors.push({
                moduleCode,
                error: 'Module not found in registry'
              });
              continue;
            }
            
            // Get module from database
            const dbModule = await Module.findOne({
              where: { code: moduleCode }
            });
            
            if (!dbModule) {
              errors.push({
                moduleCode,
                error: 'Module not found in database'
              });
              continue;
            }
            
            // Get default config for business type
            const defaultConfig = businessType && module.businessTypeConfig[businessType]
              ? module.businessTypeConfig[businessType].defaultConfig
              : {};
            
            // Merge with provided configuration
            const finalConfig = {
              ...defaultConfig,
              ...(configuration?.[moduleCode] || {})
            };
            
            // Create or update tenant module
            const [tenantModule, created] = await TenantModule.findOrCreate({
              where: { 
                tenantId, 
                moduleId: dbModule.id 
              },
              defaults: {
                tenantId,
                moduleId: dbModule.id,
                isEnabled: true,
                configuration: finalConfig,
                enabledAt: new Date(),
                enabledBy: (session.user as any).id
              }
            });
            
            if (!created && !tenantModule.isEnabled) {
              await tenantModule.update({
                isEnabled: true,
                configuration: finalConfig,
                enabledAt: new Date(),
                enabledBy: (session.user as any).id
              });
            }
            
            results.push({
              moduleCode,
              moduleName: module.name,
              moduleId: dbModule.id,
              status: created ? 'enabled' : 'already_enabled',
              configuration: finalConfig
            });
            
          } catch (error: any) {
            errors.push({
              moduleCode,
              error: error.message
            });
          }
        }
        
        // Setup integration flows
        try {
          await flowOrchestrator.setupFlowsForTenant(tenantId, allModuleIds);
        } catch (error: any) {
          console.error('Error setting up flows:', error);
        }
        
        return res.status(200).json({
          success: true,
          message: `Configured ${results.length} modules successfully`,
          data: {
            configured: results,
            errors: errors.length > 0 ? errors : undefined,
            totalModules: allModuleIds.length,
            successCount: results.length,
            errorCount: errors.length,
            flowsSetup: true
          }
        });
        
      } catch (error: any) {
        console.error('Module configuration error:', error);
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
    
    if (req.method === 'GET') {
      // Get currently configured modules for tenant
      try {
        const db = getDb();
        const { TenantModule, Module } = db;
        
        const tenantModules = await TenantModule.findAll({
          where: { 
            tenantId,
            isEnabled: true
          },
          include: [{
            model: Module,
            as: 'module'
          }]
        });
        
        const configuredModules = tenantModules.map((tm: any) => ({
          moduleId: tm.module.id,
          moduleCode: tm.module.code,
          moduleName: tm.module.name,
          category: tm.module.category,
          configuration: tm.configuration,
          enabledAt: tm.enabledAt
        }));
        
        // Get active flows
        const activeFlows = flowOrchestrator.getActiveFlows(tenantId);
        
        return res.status(200).json({
          success: true,
          data: {
            modules: configuredModules,
            totalModules: configuredModules.length,
            activeFlows: activeFlows.length
          }
        });
        
      } catch (error: any) {
        console.error('Error getting configured modules:', error);
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
    
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
    
  } catch (error: any) {
    console.error('Module configure API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
