import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../pages/api/auth/[...nextauth]';
import {
  resolvePermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  type ResolvedPermission
} from '../permissions/permission-resolver';

/**
 * HQ API Authentication Middleware
 *
 * Usage:
 *   export default withHQAuth(handler);
 *   export default withHQAuth(handler, { module: 'finance_pro' });
 *   export default withHQAuth(handler, { roles: ['owner', 'hq_admin'] });
 *   // NEW: granular permissions (wildcard supported)
 *   export default withHQAuth(handler, { permission: 'roles.create' });
 *   export default withHQAuth(handler, { anyPermission: ['pos.refund', 'pos.void_transaction'] });
 *   export default withHQAuth(handler, { allPermissions: ['finance.view', 'finance.view_pnl'] });
 *
 * Setelah middleware, handler dapat:
 *   const session = (req as any).session;
 *   const permCtx: ResolvedPermission = (req as any).permissionContext;
 */

interface HQAuthOptions {
  module?: string | string[];
  roles?: string[];
  /** Permission tunggal yang wajib dimiliki */
  permission?: string;
  /** User hanya perlu punya salah satu dari list ini */
  anyPermission?: string[];
  /** User harus punya SEMUA permission di list ini */
  allPermissions?: string[];
  /** Izinkan guest (tanpa session). Default: false. */
  allowGuest?: boolean;
}

export function withHQAuth(
  handler: NextApiHandler,
  options?: HQAuthOptions
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const session = await getServerSession(req, res, authOptions);

      if (!session?.user) {
        if (options?.allowGuest) return handler(req, res);
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required'
        });
      }

      // Inject session into request for downstream handlers
      (req as any).session = session;

      const userRole = ((session.user as any).role || '').toLowerCase();
      const tenantId = (session.user as any).tenantId;
      const isSuperBypass = userRole === 'super_admin' || userRole === 'owner' || userRole === 'superhero';

      // Role check (super_admin and owner always pass)
      if (options?.roles && !isSuperBypass) {
        const allowed = options.roles.map(r => r.toLowerCase());
        if (!allowed.includes(userRole)) {
          return res.status(403).json({
            success: false,
            error: 'FORBIDDEN',
            message: 'Insufficient role',
            requiredRoles: options.roles
          });
        }
      }

      // Module check (super_admin and owner bypass)
      if (options?.module && !isSuperBypass) {
        if (!tenantId) {
          return res.status(403).json({
            success: false,
            error: 'NO_TENANT',
            message: 'No tenant associated with this user'
          });
        }
        try {
          const db = require('../../models');
          const codes = Array.isArray(options.module) ? options.module : [options.module];
          const enabled = await db.TenantModule.findAll({
            where: { tenantId, isEnabled: true },
            include: [{
              model: db.Module,
              as: 'module',
              where: { code: codes, isActive: true }
            }]
          });
          if (enabled.length === 0) {
            return res.status(403).json({
              success: false,
              error: 'MODULE_NOT_ENABLED',
              message: `Required module not enabled for your business`,
              requiredModules: codes
            });
          }
        } catch (e) {
          // Jika models tidak tersedia, izinkan akses (dev fallback)
        }
      }

      // Permission check — selalu resolve permissions agar handler bisa pakai
      const permCtx: ResolvedPermission = await resolvePermissions(req);
      (req as any).permissionContext = permCtx;
      (req as any).permissions = permCtx.permissions;

      if (!isSuperBypass && !permCtx.isSuperAdmin) {
        if (options?.permission && !hasPermission(permCtx.permissions, options.permission)) {
          return res.status(403).json({
            success: false,
            error: 'MISSING_PERMISSION',
            message: `Anda tidak memiliki permission "${options.permission}"`,
            required: options.permission,
            yourRole: permCtx.roleCode || permCtx.role
          });
        }
        if (options?.anyPermission && !hasAnyPermission(permCtx.permissions, options.anyPermission)) {
          return res.status(403).json({
            success: false,
            error: 'MISSING_PERMISSION_ANY',
            message: 'Anda tidak memiliki salah satu permission yang dibutuhkan',
            requiredAny: options.anyPermission,
            yourRole: permCtx.roleCode || permCtx.role
          });
        }
        if (options?.allPermissions && !hasAllPermissions(permCtx.permissions, options.allPermissions)) {
          const missing = options.allPermissions.filter(p => !hasPermission(permCtx.permissions, p));
          return res.status(403).json({
            success: false,
            error: 'MISSING_PERMISSION_ALL',
            message: 'Anda tidak memiliki semua permission yang dibutuhkan',
            requiredAll: options.allPermissions,
            missing,
            yourRole: permCtx.roleCode || permCtx.role
          });
        }
      }

      return handler(req, res);
    } catch (error) {
      console.error('HQ Auth middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'AUTH_ERROR',
        message: 'Authentication service error'
      });
    }
  };
}

export default withHQAuth;
