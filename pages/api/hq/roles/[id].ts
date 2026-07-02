import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { rolesService, buildPermissionMap } from '../../../../lib/permissions/roles-service';
import { logRoleAudit } from '../../../../lib/permissions/audit';
import {
  invalidatePermissionCache,
  hasPermission,
  type ResolvedPermission
} from '../../../../lib/permissions/permission-resolver';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid role id' });
  }

  const permCtx: ResolvedPermission | undefined = (req as any).permissionContext;
  const isSuper = permCtx?.isSuperAdmin;
  const perms = permCtx?.permissions || {};

  const role = await rolesService.findById(id);
  if (!role) {
    return res.status(404).json({ error: 'Role tidak ditemukan' });
  }

  try {
    switch (req.method) {
      case 'GET': {
        if (!isSuper && !hasPermission(perms, 'roles.view')) {
          return res.status(403).json({ error: 'Missing permission: roles.view' });
        }
        return res.status(200).json({ role });
      }

      case 'PUT':
      case 'PATCH': {
        if (!isSuper && !hasPermission(perms, 'roles.update')) {
          return res.status(403).json({ error: 'Missing permission: roles.update' });
        }
        if (role.isSystem && req.body?.code && req.body.code !== role.code) {
          return res.status(400).json({ error: 'Kode role sistem tidak dapat diubah' });
        }
        const { name, description, level, dataScope, permissions, isActive } = req.body || {};

        const patch: Record<string, any> = {};
        if (typeof name === 'string') patch.name = name;
        if (typeof description === 'string') patch.description = description;
        if (typeof level === 'number') patch.level = level;
        if (dataScope) patch.dataScope = dataScope;
        if (typeof isActive === 'boolean') patch.isActive = isActive;
        if (permissions !== undefined) patch.permissions = buildPermissionMap(permissions);

        const updated = await rolesService.update(id, patch);

        await logRoleAudit({
          req,
          action: 'role.update',
          targetType: 'role',
          targetId: id,
          targetLabel: role.name,
          oldValues: {
            name: role.name,
            level: role.level,
            dataScope: role.dataScope,
            isActive: role.isActive,
            permissionCount: Object.values(role.permissions).filter(Boolean).length
          },
          newValues: {
            name: updated?.name,
            level: updated?.level,
            dataScope: updated?.dataScope,
            isActive: updated?.isActive,
            permissionCount: Object.values(updated?.permissions || {}).filter(Boolean).length
          }
        });
        invalidatePermissionCache();

        return res.status(200).json({ role: updated, message: 'Role berhasil diperbarui' });
      }

      case 'DELETE': {
        if (!isSuper && !hasPermission(perms, 'roles.delete')) {
          return res.status(403).json({ error: 'Missing permission: roles.delete' });
        }
        const result = await rolesService.remove(id);
        if (!result.ok) {
          const msg =
            result.reason === 'system_role' ? 'Role sistem tidak dapat dihapus' :
            result.reason?.startsWith('in_use_') ? `Role masih dipakai oleh ${result.reason.replace('in_use_', '')} user` :
            result.reason === 'not_found' ? 'Role tidak ditemukan' :
            'Gagal menghapus role';
          return res.status(400).json({ error: msg });
        }
        await logRoleAudit({
          req,
          action: 'role.delete',
          targetType: 'role',
          targetId: id,
          targetLabel: role.name,
          oldValues: {
            code: role.code,
            name: role.name,
            level: role.level
          }
        });
        invalidatePermissionCache();
        return res.status(200).json({ message: 'Role berhasil dihapus' });
      }

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Role [id] API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withHQAuth(handler);
