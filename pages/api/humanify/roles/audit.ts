import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { listRoleAudit } from '../../../../lib/permissions/audit';
import {
  hasPermission,
  type ResolvedPermission
} from '../../../../lib/permissions/permission-resolver';

/**
 * GET /api/hq/roles/audit?limit=50&action=role.update
 * Tampilkan audit trail perubahan role/assign.
 * Butuh permission `roles.view` atau `audit.view`.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const permCtx: ResolvedPermission | undefined = (req as any).permissionContext;
  const isSuper = permCtx?.isSuperAdmin;
  const perms = permCtx?.permissions || {};

  if (!isSuper && !(hasPermission(perms, 'roles.view') || hasPermission(perms, 'audit.view'))) {
    return res.status(403).json({ error: 'Missing permission: roles.view atau audit.view' });
  }

  const { limit, action } = req.query;
  const logs = await listRoleAudit({
    limit: limit ? Math.min(200, parseInt(String(limit), 10) || 50) : 50,
    action: action ? (String(action) as any) : undefined
  });

  return res.status(200).json({ logs, count: logs.length });
}

export default withHQAuth(handler);
