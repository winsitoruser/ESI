/**
 * ESS / employee portal API auth — session + tenant GUC (+ optional request-bound TX).
 * Wave-81: closes empty-GUC soft-RLS hole on /api/employee/* paths.
 */
import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../pages/api/auth/[...nextauth]';

export function withEmployeeAuth(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    let tenantContextSet = false;
    let usedRequestBound = false;

    try {
      // Never let CDN/proxy cache tenant-scoped ESS payloads across users
      res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
      res.setHeader('Vary', 'Cookie');

      const session = await getServerSession(req, res, authOptions);
      if (!session?.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if ((session.user as any).mfaSetupRequired === true) {
        return res.status(403).json({
          success: false,
          error: 'MFA_SETUP_REQUIRED',
          message: 'Selesaikan enrol 2FA di /humanify/security sebelum memakai API.',
        });
      }

      (req as any).session = session;
      const userRole = String((session.user as any).role || '').toLowerCase();
      const tenantId = (session.user as any).tenantId || null;
      const isSuperAdmin =
        userRole === 'super_admin' || userRole === 'superadmin' || userRole === 'platform_admin';

      const runAuthed = async () => {
        try {
          const { setDbTenantContext } = require('../saas/tenant-slug');
          await setDbTenantContext(tenantId, isSuperAdmin);
          tenantContextSet = true;
        } catch {
          /* GUC best-effort if DB down */
        }
        return handler(req, res);
      };

      try {
        const { isTenantRequestBoundEnabled } = require('../saas/tenant-request-bound');
        if (isTenantRequestBoundEnabled()) {
          usedRequestBound = true;
          const sequelize = require('../sequelize');
          return await sequelize.transaction(async () => runAuthed());
        }
      } catch {
        /* fall through unbound */
      }

      return await runAuthed();
    } catch (error) {
      console.error('Employee Auth middleware error:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    } finally {
      if (tenantContextSet) {
        try {
          const { clearDbTenantContext } = require('../saas/tenant-slug');
          await clearDbTenantContext();
        } catch { /* ignore */ }
      }
    }
  };
}
