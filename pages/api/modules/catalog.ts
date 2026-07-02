import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { moduleRegistry } from '@/lib/modules/ModuleRegistry';

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
    
    if (req.method === 'GET') {
      const { businessType, category, includeOptional } = req.query;
      
      try {
        let modules = moduleRegistry.getAllModules();
        
        // Filter by business type
        if (businessType) {
          modules = moduleRegistry.getModulesForBusinessType(
            businessType as string,
            includeOptional === 'true'
          );
        }
        
        // Filter by category
        if (category && category !== 'all') {
          modules = modules.filter(m => m.category === category);
        }
        
        // Categorize modules
        const categorized = {
          core: modules.filter(m => m.category === 'core'),
          fnb: modules.filter(m => m.category === 'fnb'),
          optional: modules.filter(m => m.category === 'optional'),
          addon: modules.filter(m => m.category === 'addon')
        };
        
        // Get module statistics from database if available
        const db = getDb();
        const moduleStats = await getModuleStats(db, modules);
        
        // Enrich modules with stats
        const enrichedModules = modules.map(module => ({
          ...module,
          stats: moduleStats.get(module.code) || {
            tenantCount: 0,
            isPopular: false
          }
        }));
        
        return res.status(200).json({
          success: true,
          data: {
            businessType: businessType || null,
            modules: enrichedModules,
            categories: categorized,
            total: modules.length
          }
        });
        
      } catch (error: any) {
        console.error('Module catalog error:', error);
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
    console.error('Module catalog API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function getModuleStats(db: any, modules: any[]): Promise<Map<string, any>> {
  const stats = new Map();
  
  try {
    if (!db.Module || !db.TenantModule) {
      return stats;
    }
    
    // Get tenant counts for each module
    const moduleCodes = modules.map(m => m.code);
    
    const dbModules = await db.Module.findAll({
      where: { code: moduleCodes },
      include: [{
        model: db.TenantModule,
        as: 'tenantModules',
        where: { isEnabled: true },
        required: false
      }]
    });
    
    dbModules.forEach((dbModule: any) => {
      const tenantCount = dbModule.tenantModules?.length || 0;
      stats.set(dbModule.code, {
        tenantCount,
        isPopular: tenantCount > 10
      });
    });
    
  } catch (error) {
    console.error('Error getting module stats:', error);
  }
  
  return stats;
}
