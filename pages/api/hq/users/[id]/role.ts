import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../../lib/middleware/withHQAuth';
import { rolesService } from '../../../../../lib/permissions/roles-service';
import { logRoleAudit } from '../../../../../lib/permissions/audit';
import {
  invalidatePermissionCache,
  hasPermission,
  type ResolvedPermission
} from '../../../../../lib/permissions/permission-resolver';

/**
 * POST /api/hq/users/[id]/role
 * Body: { roleId: string } atau { roleCode: string }
 *
 * Assign role ke user (update users.role_id). Juga mengembalikan info role
 * beserta permission-nya untuk ditampilkan di UI.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid user id' });

  const permCtx: ResolvedPermission | undefined = (req as any).permissionContext;
  const isSuper = permCtx?.isSuperAdmin;
  const perms = permCtx?.permissions || {};

  if (req.method === 'GET') {
    if (!isSuper && !hasPermission(perms, 'users.view')) {
      return res.status(403).json({ error: 'Missing permission: users.view' });
    }
    // Ambil role saat ini dari user
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('../../../../../models');
      const db = mod?.default || mod;
      const [[row]] = await db.User.sequelize.query(
        `SELECT u.id, u.role, u.role_id, r.id AS r_id, r.code, r.name, r.level, r.data_scope, r.permissions, r.is_system, r.is_active
         FROM users u LEFT JOIN roles r ON r.id = u.role_id
         WHERE u.id = :id`,
        { replacements: { id } }
      );
      if (!row) return res.status(404).json({ error: 'User tidak ditemukan' });

      return res.status(200).json({
        userId: row.id,
        legacyRole: row.role,
        role: row.r_id ? {
          id: row.r_id,
          code: row.code,
          name: row.name,
          level: row.level,
          dataScope: row.data_scope,
          permissions: row.permissions,
          isSystem: row.is_system,
          isActive: row.is_active
        } : null
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Gagal memuat role user', details: err?.message });
    }
  }

  if (req.method !== 'POST' && req.method !== 'PUT') {
    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  if (!isSuper && !hasPermission(perms, 'users.role_assign')) {
    return res.status(403).json({ error: 'Missing permission: users.role_assign' });
  }

  const { roleId, roleCode } = req.body || {};

  let targetRoleId = roleId as string | undefined;
  if (!targetRoleId && roleCode) {
    const role = await rolesService.findByCode(String(roleCode).toUpperCase());
    if (!role) return res.status(404).json({ error: `Role dengan code "${roleCode}" tidak ditemukan` });
    targetRoleId = role.id;
  }
  if (!targetRoleId) {
    return res.status(400).json({ error: 'roleId atau roleCode wajib diisi' });
  }

  const result = await rolesService.assignToUser(id, targetRoleId);
  if (!result.ok) {
    const msg =
      result.reason === 'db_unavailable' ? 'Database belum siap untuk assign role' :
      result.reason === 'role_not_found' ? 'Role tidak ditemukan' :
      result.reason || 'Gagal assign role';
    return res.status(400).json({ error: msg });
  }

  const role = await rolesService.findById(targetRoleId);

  await logRoleAudit({
    req,
    action: 'role.assign',
    targetType: 'user',
    targetId: id,
    targetLabel: `user:${id}`,
    newValues: {
      roleId: role?.id,
      roleCode: role?.code,
      roleName: role?.name,
      level: role?.level,
      dataScope: role?.dataScope
    }
  });

  // Invalidate cache user tsb agar perubahan berlaku di request berikutnya
  invalidatePermissionCache(id);

  return res.status(200).json({
    message: `Role "${role?.name}" berhasil di-assign ke user`,
    userId: id,
    role
  });
}

export default withHQAuth(handler, { module: 'users' });
