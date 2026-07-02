import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import {
  invalidatePermissionCache,
  hasPermission,
  type ResolvedPermission
} from '../../../../lib/permissions/permission-resolver';
import { rolesService } from '../../../../lib/permissions/roles-service';
import { logRoleAudit } from '../../../../lib/permissions/audit';

/**
 * GET  /api/hq/users/by-role?roleId=xxx          → list user untuk satu role
 * GET  /api/hq/users/by-role?group=1             → semua user di-group by role
 * POST /api/hq/users/by-role                     → bulk assign / revoke
 *   body: { action: 'assign'|'revoke', userIds: string[], roleId?: string }
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const permCtx: ResolvedPermission | undefined = (req as any).permissionContext;
  const isSuper = permCtx?.isSuperAdmin;
  const perms = permCtx?.permissions || {};

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const db = require('../../../../models')?.default || require('../../../../models');
    if (!db?.User?.sequelize) {
      return res.status(503).json({ error: 'Database tidak tersedia' });
    }

    if (req.method === 'GET') {
      if (!isSuper && !hasPermission(perms, 'users.view')) {
        return res.status(403).json({ error: 'Missing permission: users.view' });
      }

      const { roleId, group } = req.query;

      if (roleId) {
        const [rows] = await db.User.sequelize.query(
          `SELECT u.id, u.name, u.email, u.role, u.role_id, u.is_active,
                  u.tenant_id, u.assigned_branch_id, u.last_login AS last_login_at,
                  u.created_at
             FROM users u
             WHERE u.role_id = :roleId
             ORDER BY u.name ASC`,
          { replacements: { roleId } }
        );
        return res.status(200).json({ roleId, users: rows, count: (rows as any[]).length });
      }

      if (group === '1' || group === 'true') {
        const [rows] = await db.User.sequelize.query(
          `SELECT r.id AS role_id, r.code AS role_code, r.name AS role_name,
                  r.level, r.data_scope, r.is_active,
                  COUNT(u.id)::int AS user_count
             FROM roles r
             LEFT JOIN users u ON u.role_id = r.id
             GROUP BY r.id, r.code, r.name, r.level, r.data_scope, r.is_active
             ORDER BY r.level ASC, r.name ASC`
        );

        // Ambil juga user "unassigned" (role_id NULL)
        const [[unassigned]] = await db.User.sequelize.query(
          `SELECT COUNT(*)::int AS cnt FROM users WHERE role_id IS NULL`
        );

        return res.status(200).json({
          groups: rows,
          unassignedCount: unassigned?.cnt || 0
        });
      }

      // Default: list semua user ringkas dengan info role-nya
      const [rows] = await db.User.sequelize.query(
        `SELECT u.id, u.name, u.email, u.role AS legacy_role, u.role_id, u.is_active,
                u.assigned_branch_id, u.last_login AS last_login_at,
                r.code AS role_code, r.name AS role_name, r.level AS role_level
           FROM users u
           LEFT JOIN roles r ON r.id = u.role_id
           ORDER BY u.name ASC`
      );
      return res.status(200).json({ users: rows, count: (rows as any[]).length });
    }

    if (req.method === 'POST') {
      if (!isSuper && !hasPermission(perms, 'users.role_assign')) {
        return res.status(403).json({ error: 'Missing permission: users.role_assign' });
      }

      const { action, userIds, roleId } = req.body || {};
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: 'userIds wajib diisi (array non-empty)' });
      }
      if (action !== 'assign' && action !== 'revoke') {
        return res.status(400).json({ error: 'action harus "assign" atau "revoke"' });
      }

      if (action === 'assign') {
        if (!roleId) return res.status(400).json({ error: 'roleId wajib saat action=assign' });
        const role = await rolesService.findById(roleId);
        if (!role) return res.status(404).json({ error: 'Role tidak ditemukan' });

        const [[result]] = await db.User.sequelize.query(
          `UPDATE users SET role_id = :roleId, updated_at = NOW()
             WHERE id IN (:ids)
             RETURNING id, name, email`,
          { replacements: { roleId, ids: userIds } }
        ).catch(() => [[null]]);

        const affected = Array.isArray(result) ? result.length : (result ? 1 : userIds.length);

        await logRoleAudit({
          req,
          action: 'role.assign',
          targetType: 'user',
          targetId: null,
          targetLabel: `bulk(${userIds.length}) → ${role.name}`,
          newValues: { roleId: role.id, roleCode: role.code, roleName: role.name, userIds }
        });

        userIds.forEach((id: string) => invalidatePermissionCache(id));

        return res.status(200).json({
          ok: true,
          message: `${affected} user berhasil di-assign ke role "${role.name}"`,
          affected
        });
      }

      // action === 'revoke' → set role_id = NULL
      await db.User.sequelize.query(
        `UPDATE users SET role_id = NULL, updated_at = NOW() WHERE id IN (:ids)`,
        { replacements: { ids: userIds } }
      );

      await logRoleAudit({
        req,
        action: 'role.revoke',
        targetType: 'user',
        targetId: null,
        targetLabel: `bulk revoke (${userIds.length} user)`,
        oldValues: { userIds }
      });

      userIds.forEach((id: string) => invalidatePermissionCache(id));

      return res.status(200).json({
        ok: true,
        message: `${userIds.length} user berhasil di-revoke dari role-nya`,
        affected: userIds.length
      });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (err: any) {
    console.error('users/by-role error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err?.message });
  }
}

export default withHQAuth(handler);
