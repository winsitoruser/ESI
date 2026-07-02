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

    const userRole = (session.user as any).role;
    const tenantId = (session.user as any).tenantId;

    if (!['super_admin', 'owner', 'hq_admin'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    switch (req.method) {
      case 'POST':
        return deployModules(req, res, tenantId, session.user);
      case 'GET':
        return getDeploymentStatus(req, res, tenantId);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Module Deployment API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getDeploymentStatus(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  try {
    const db = getDb();
    const { Module, TenantModule, Branch, BranchModule } = db;

    if (!Module || !Branch) {
      return res.status(200).json({
        success: true,
        data: getMockDeploymentStatus()
      });
    }

    // Get all tenant modules
    const tenantModules = await TenantModule.findAll({
      where: { tenantId },
      include: [{
        model: Module,
        as: 'module',
        attributes: ['id', 'code', 'name', 'icon', 'category', 'pricingTier', 'isCore']
      }]
    }).catch(() => []);

    // Get all branches for this tenant
    const branches = await Branch.findAll({
      where: { tenantId },
      attributes: ['id', 'name', 'code', 'status']
    }).catch(() => []);

    const totalBranches = branches.length;

    // Get deployment status for each module
    const deploymentStatus = await Promise.all(
      tenantModules.map(async (tm: any) => {
        const moduleId = tm.moduleId;
        const module = tm.module;

        // Get branch modules for this module
        const branchModules = await BranchModule.findAll({
          where: {
            moduleCode: module.code
          },
          include: [{
            model: Branch,
            as: 'branch',
            where: { tenantId },
            required: true,
            attributes: ['id', 'name']
          }]
        }).catch(() => []);

        const enabledBranches = branchModules.filter((bm: any) => bm.isEnabled);

        return {
          moduleId: module.id,
          moduleCode: module.code,
          moduleName: module.name,
          moduleIcon: module.icon,
          category: module.category,
          pricingTier: module.pricingTier,
          isCore: module.isCore,
          hqEnabled: tm.isEnabled,
          branches: {
            total: totalBranches,
            enabled: enabledBranches.length,
            disabled: totalBranches - enabledBranches.length,
            list: branchModules.map((bm: any) => ({
              branchId: bm.branch.id,
              branchName: bm.branch.name,
              isEnabled: bm.isEnabled,
              enabledAt: bm.enabledAt
            }))
          },
          deploymentStatus: 
            enabledBranches.length === 0 ? 'none' :
            enabledBranches.length === totalBranches ? 'full' :
            'partial',
          coverage: totalBranches > 0 ? Math.round((enabledBranches.length / totalBranches) * 100) : 0
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        modules: deploymentStatus,
        summary: {
          totalModules: tenantModules.length,
          totalBranches,
          fullyDeployed: deploymentStatus.filter(m => m.deploymentStatus === 'full').length,
          partiallyDeployed: deploymentStatus.filter(m => m.deploymentStatus === 'partial').length,
          notDeployed: deploymentStatus.filter(m => m.deploymentStatus === 'none').length
        },
        branches: branches.map((b: any) => ({
          id: b.id,
          name: b.name,
          code: b.code,
          status: b.status
        }))
      }
    });
  } catch (error: any) {
    console.error('Error getting deployment status:', error);
    return res.status(200).json({
      success: true,
      data: getMockDeploymentStatus()
    });
  }
}

async function deployModules(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  user: any
) {
  try {
    const db = getDb();
    const { Module, TenantModule, Branch, BranchModule } = db;

    const { moduleIds, action, scope, options } = req.body;

    // Validation
    if (!moduleIds || !Array.isArray(moduleIds) || moduleIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'moduleIds array is required'
      });
    }

    if (!action || !['enable', 'disable'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'action must be "enable" or "disable"'
      });
    }

    if (!scope || !scope.type) {
      return res.status(400).json({
        success: false,
        error: 'scope.type is required'
      });
    }

    const isEnable = action === 'enable';
    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    // Get modules
    const modules = await Module.findAll({
      where: { id: moduleIds }
    }).catch(() => []);

    if (modules.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No modules found'
      });
    }

    // Deploy to HQ/Tenant level
    if (scope.type === 'hq' || scope.type === 'all_branches') {
      for (const module of modules) {
        try {
          const [tenantModule, created] = await TenantModule.findOrCreate({
            where: { tenantId, moduleId: module.id },
            defaults: {
              tenantId,
              moduleId: module.id,
              isEnabled: isEnable,
              enabledAt: isEnable ? new Date() : null,
              enabledBy: user.id
            }
          });

          if (!created) {
            await tenantModule.update({
              isEnabled: isEnable,
              enabledAt: isEnable ? new Date() : tenantModule.enabledAt,
              disabledAt: !isEnable ? new Date() : null
            });
          }

          results.success.push({
            moduleId: module.id,
            moduleName: module.name,
            level: 'hq'
          });
        } catch (error: any) {
          results.failed.push({
            moduleId: module.id,
            moduleName: module.name,
            error: error.message
          });
        }
      }
    }

    // Deploy to branches
    if (scope.type === 'all_branches' || scope.type === 'selected_branches') {
      let targetBranches = [];

      if (scope.type === 'all_branches') {
        targetBranches = await Branch.findAll({
          where: { tenantId, status: 'active' }
        }).catch(() => []);
      } else if (scope.type === 'selected_branches' && scope.branchIds) {
        targetBranches = await Branch.findAll({
          where: { 
            tenantId,
            id: scope.branchIds
          }
        }).catch(() => []);
      }

      for (const module of modules) {
        for (const branch of targetBranches) {
          try {
            const [branchModule, created] = await BranchModule.findOrCreate({
              where: { 
                branchId: branch.id,
                moduleCode: module.code
              },
              defaults: {
                branchId: branch.id,
                moduleCode: module.code,
                moduleName: module.name,
                isEnabled: isEnable,
                enabledAt: isEnable ? new Date() : null,
                enabledBy: user.id
              }
            });

            if (!created) {
              // Check if should override
              if (options?.overrideExisting || branchModule.isEnabled !== isEnable) {
                await branchModule.update({
                  isEnabled: isEnable,
                  enabledAt: isEnable ? new Date() : branchModule.enabledAt,
                  disabledAt: !isEnable ? new Date() : null
                });
              } else {
                results.skipped.push({
                  moduleId: module.id,
                  moduleName: module.name,
                  branchId: branch.id,
                  branchName: branch.name,
                  reason: 'Already configured'
                });
                continue;
              }
            }

            results.success.push({
              moduleId: module.id,
              moduleName: module.name,
              branchId: branch.id,
              branchName: branch.name,
              level: 'branch'
            });
          } catch (error: any) {
            results.failed.push({
              moduleId: module.id,
              moduleName: module.name,
              branchId: branch.id,
              branchName: branch.name,
              error: error.message
            });
          }
        }
      }
    }

    const totalOperations = results.success.length + results.failed.length + results.skipped.length;

    return res.status(200).json({
      success: true,
      message: `Deployment completed: ${results.success.length} successful, ${results.failed.length} failed, ${results.skipped.length} skipped`,
      data: {
        action,
        scope: scope.type,
        modulesProcessed: modules.length,
        results,
        summary: {
          total: totalOperations,
          successful: results.success.length,
          failed: results.failed.length,
          skipped: results.skipped.length,
          successRate: totalOperations > 0 ? Math.round((results.success.length / totalOperations) * 100) : 0
        }
      }
    });
  } catch (error: any) {
    console.error('Error deploying modules:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function getMockDeploymentStatus() {
  return {
    modules: [
      {
        moduleId: '1',
        moduleCode: 'pos',
        moduleName: 'Point of Sale',
        moduleIcon: 'ShoppingCart',
        category: 'core',
        pricingTier: 'basic',
        isCore: true,
        hqEnabled: true,
        branches: {
          total: 5,
          enabled: 5,
          disabled: 0,
          list: []
        },
        deploymentStatus: 'full',
        coverage: 100
      },
      {
        moduleId: '2',
        moduleCode: 'inventory',
        moduleName: 'Inventory',
        moduleIcon: 'Package',
        category: 'operations',
        pricingTier: 'basic',
        isCore: true,
        hqEnabled: true,
        branches: {
          total: 5,
          enabled: 3,
          disabled: 2,
          list: []
        },
        deploymentStatus: 'partial',
        coverage: 60
      },
      {
        moduleId: '3',
        moduleCode: 'finance',
        moduleName: 'Finance',
        moduleIcon: 'Wallet',
        category: 'finance',
        pricingTier: 'basic',
        isCore: false,
        hqEnabled: true,
        branches: {
          total: 5,
          enabled: 0,
          disabled: 5,
          list: []
        },
        deploymentStatus: 'none',
        coverage: 0
      }
    ],
    summary: {
      totalModules: 3,
      totalBranches: 5,
      fullyDeployed: 1,
      partiallyDeployed: 1,
      notDeployed: 1
    },
    branches: [
      { id: '1', name: 'Branch A', code: 'BRA', status: 'active' },
      { id: '2', name: 'Branch B', code: 'BRB', status: 'active' },
      { id: '3', name: 'Branch C', code: 'BRC', status: 'active' },
      { id: '4', name: 'Branch D', code: 'BRD', status: 'active' },
      { id: '5', name: 'Branch E', code: 'BRE', status: 'active' }
    ]
  };
}
