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
 *   export default withHQAuth(handler, { permission: 'roles.create' });
 *   export default withHQAuth(handler, { anyPermission: ['pos.refund', 'pos.void_transaction'] });
 *   export default withHQAuth(handler, { allPermissions: ['finance.view', 'finance.view_pnl'] });
 *
 * Setelah middleware, handler dapat:
 *   const session = (req as any).session;
 *   const permCtx: ResolvedPermission = (req as any).permissionContext;
 *
 * RLS: set HUMANIFY_RLS_REQUEST_BOUND=true to wrap the handler in a CLS
 * transaction so set_config(..., is_local) stays on one pooled connection.
 */

interface HQAuthOptions {
  module?: string | string[];
  roles?: string[];
  permission?: string;
  anyPermission?: string[];
  allPermissions?: string[];
  allowGuest?: boolean;
}

export function withHQAuth(
  handler: NextApiHandler,
  options?: HQAuthOptions
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    let tenantContextSet = false;
    let usedRequestBound = false;

    try {
      // Never let CDN/proxy cache tenant-scoped HQ payloads across users
      res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
      res.setHeader('Vary', 'Cookie');

      const session = await getServerSession(req, res, authOptions);

      if (!session?.user) {
        if (options?.allowGuest) return handler(req, res);
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required'
        });
      }

      (req as any).session = session;

      const { mutationOriginAllowed } = await import('@/lib/security/csrf-origin');
      if (!mutationOriginAllowed({
        method: req.method,
        origin: String(req.headers.origin || ''),
        referer: String(req.headers.referer || ''),
        host: String(req.headers.host || ''),
        forwardedHost: String(req.headers['x-forwarded-host'] || ''),
      })) {
        return res.status(403).json({
          success: false,
          error: 'CSRF_ORIGIN',
          message: 'Origin tidak cocok dengan host',
        });
      }

      const userRole = ((session.user as any).role || '').toLowerCase();
      const tenantId = (session.user as any).tenantId;
      const isSuperBypass = userRole === 'super_admin' || userRole === 'owner' || userRole === 'superhero';
      const isSuperAdmin =
        userRole === 'super_admin' || userRole === 'superadmin' || userRole === 'platform_admin';

      const runAuthed = async () => {
        try {
          const { setDbTenantContext } = require('../saas/tenant-slug');
          await setDbTenantContext(tenantId || null, isSuperAdmin);
          tenantContextSet = true;
        } catch {
          /* ignore */
        }

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
          } catch {
            if (process.env.NODE_ENV === 'production') {
              return res.status(403).json({
                success: false,
                error: 'MODULE_CHECK_UNAVAILABLE',
                message: 'Module entitlement check unavailable',
              });
            }
            /* models unavailable — allow in non-prod */
          }
        }

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

        // Plan entitlement (API path → feature). Platform ops / super_admin bypass inside assert.
        try {
          const { assertHumanifyFeature } = require('../saas/assert-feature');
          const ok = await assertHumanifyFeature(req, res, {
            tenantId,
            role: userRole,
            path: req.url || '',
          });
          if (!ok) return;
        } catch {
          if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
              success: false,
              error: 'ENTITLEMENT_CHECK_UNAVAILABLE',
              message: 'Plan entitlement check unavailable',
            });
          }
          /* entitlement module unavailable — fail open only outside production */
        }

        if ((session.user as any).mfaSetupRequired === true) {
          const path = String(req.url || '').split('?')[0];
          const mfaAllowed =
            path.includes('/api/humanify/mfa') ||
            path.endsWith('/humanify/mfa');
          if (!mfaAllowed) {
            return res.status(403).json({
              success: false,
              error: 'MFA_SETUP_REQUIRED',
              message: 'Selesaikan enrol 2FA di /humanify/security sebelum memakai API.',
            });
          }
        }

        return await handler(req, res);
      };

      let requestBound = false;
      try {
        const { isTenantRequestBoundEnabled } = require('../saas/tenant-request-bound');
        requestBound = isTenantRequestBoundEnabled();
        if (requestBound) {
          usedRequestBound = true;
          const sequelize = require('../sequelize');
          return await sequelize.transaction(async () => runAuthed());
        }
      } catch {
        /* fall through to unbound */
      }

      return await runAuthed();
    } catch (error) {
      console.error('HQ Auth middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'AUTH_ERROR',
        message: 'Authentication service error'
      });
    } finally {
      // Always clear session-level vars. Local (transaction) config clears on commit;
      // if we fell back to session-level set_config, this prevents pool leaks.
      if (tenantContextSet) {
        try {
          const { clearDbTenantContext } = require('../saas/tenant-slug');
          await clearDbTenantContext();
        } catch {
          /* ignore */
        }
      }
    }
  };
}

export default withHQAuth;
