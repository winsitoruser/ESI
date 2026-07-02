import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../pages/api/auth/[...nextauth]';

/**
 * API-level Module Guard Middleware
 * Blocks API requests if the required module is not enabled for the tenant.
 * 
 * Usage:
 *   export default withModuleGuard('inventory', handler);
 * 
 * Or with multiple modules (any one must be enabled):
 *   export default withModuleGuard(['inventory', 'products'], handler);
 */
export function withModuleGuard(
  moduleCode: string | string[],
  handler: NextApiHandler
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const session = await getServerSession(req, res, authOptions);

      if (!session?.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const userRole = (session.user as any).role;

      // Super admin and owner bypass module checks
      if (userRole === 'super_admin' || userRole === 'owner') {
        return handler(req, res);
      }

      // Get tenant modules
      const tenantId = (session.user as any).tenantId;
      if (!tenantId) {
        return res.status(403).json({
          success: false,
          error: 'No tenant associated with this user'
        });
      }

      let TenantModule: any, Module: any;
      try {
        const db = require('../../models');
        TenantModule = db.TenantModule;
        Module = db.Module;
      } catch (e) {
        // If models aren't available, allow access (dev mode)
        return handler(req, res);
      }

      if (!TenantModule || !Module) {
        return handler(req, res);
      }

      const codes = Array.isArray(moduleCode) ? moduleCode : [moduleCode];

      const enabledModules = await TenantModule.findAll({
        where: {
          tenantId,
          isEnabled: true
        },
        include: [{
          model: Module,
          as: 'module',
          where: {
            code: codes,
            isActive: true
          }
        }]
      });

      if (enabledModules.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'MODULE_NOT_ENABLED',
          message: `Module '${codes.join("' or '")}' is not enabled for your business. Please enable it in Module Management.`,
          requiredModules: codes
        });
      }

      return handler(req, res);
    } catch (error) {
      console.error('Module guard error:', error);
      // On error, allow access to prevent blocking legitimate requests
      return handler(req, res);
    }
  };
}

export default withModuleGuard;
