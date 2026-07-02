import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import {
  hasPermission,
  type ResolvedPermission
} from '../../../../lib/permissions/permission-resolver';
import { rolesService } from '../../../../lib/permissions/roles-service';

/**
 * GET /api/hq/permissions/explorer?mode=byPermission&key=finance.view_pnl
 *   → daftar role+user yang memiliki permission tersebut.
 *
 * GET /api/hq/permissions/explorer?mode=byUser&userId=xxx
 *   → daftar permission efektif milik user tertentu.
 *
 * GET /api/hq/permissions/explorer?mode=byRole&roleId=xxx
 *   → daftar permission + user untuk role tertentu.
 *
 * Hanya bisa diakses oleh user dengan permission `users.view_permissions`
 * atau super admin.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const permCtx: ResolvedPermission | undefined = (req as any).permissionContext;
  const isSuper = permCtx?.isSuperAdmin;
  const perms = permCtx?.permissions || {};
  if (!isSuper && !hasPermission(perms, 'users.view_permissions') &&
      !hasPermission(perms, 'roles.view')) {
    return res.status(403).json({ error: 'Missing permission: users.view_permissions' });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const db = require('../../../../models')?.default || require('../../../../models');
    if (!db?.User?.sequelize) {
      return res.status(503).json({ error: 'Database tidak tersedia' });
    }

    const mode = String(req.query.mode || '');
    const key = String(req.query.key || '');
    const userId = String(req.query.userId || '');
    const roleId = String(req.query.roleId || '');

    if (mode === 'byPermission') {
      if (!key) return res.status(400).json({ error: 'Parameter `key` wajib' });

      const roles = await rolesService.list();
      const matchingRoles = roles.filter((r: any) => {
        const rp = typeof r.permissions === 'string' ? safeParse(r.permissions) : (r.permissions || {});
        return hasPermission(rp, key) || rp['*'] === true;
      });

      const roleIds = matchingRoles.map((r: any) => r.id).filter(Boolean);
      let users: any[] = [];
      if (roleIds.length > 0) {
        const [rows] = await db.User.sequelize.query(
          `SELECT u.id, u.name, u.email, u.role, u.role_id, u.is_active,
                  r.code AS role_code, r.name AS role_name, r.level AS role_level
             FROM users u
             LEFT JOIN roles r ON r.id = u.role_id
             WHERE u.role_id IN (:ids)
             ORDER BY r.level ASC, u.name ASC`,
          { replacements: { ids: roleIds } }
        );
        users = rows as any[];
      }

      return res.status(200).json({
        key,
        roles: matchingRoles.map((r: any) => ({
          id: r.id, code: r.code, name: r.name, level: r.level,
          isActive: r.is_active !== false
        })),
        users,
        totalRoles: matchingRoles.length,
        totalUsers: users.length
      });
    }

    if (mode === 'byUser') {
      if (!userId) return res.status(400).json({ error: 'Parameter `userId` wajib' });

      const [[row]] = await db.User.sequelize.query(
        `SELECT u.id, u.name, u.email, u.role AS legacy_role,
                u.role_id, u.is_active, u.assigned_branch_id, u.last_login AS last_login_at,
                r.id AS r_id, r.code AS role_code, r.name AS role_name, r.level AS role_level,
                r.data_scope, r.permissions AS role_permissions
           FROM users u LEFT JOIN roles r ON r.id = u.role_id
           WHERE u.id = :id LIMIT 1`,
        { replacements: { id: userId } }
      );
      if (!row) return res.status(404).json({ error: 'User tidak ditemukan' });

      const rp = typeof row.role_permissions === 'string'
        ? safeParse(row.role_permissions)
        : (row.role_permissions || {});
      const keys = Object.keys(rp).filter(k => rp[k] === true).sort();

      return res.status(200).json({
        user: {
          id: row.id, name: row.name, email: row.email, isActive: row.is_active,
          branchId: row.assigned_branch_id, lastLoginAt: row.last_login_at,
          legacyRole: row.legacy_role
        },
        role: row.r_id ? {
          id: row.r_id, code: row.role_code, name: row.role_name,
          level: row.role_level, dataScope: row.data_scope
        } : null,
        permissions: keys,
        permissionCount: keys.length,
        hasWildcard: !!rp['*']
      });
    }

    if (mode === 'byRole') {
      if (!roleId) return res.status(400).json({ error: 'Parameter `roleId` wajib' });
      const role = await rolesService.findById(roleId);
      if (!role) return res.status(404).json({ error: 'Role tidak ditemukan' });

      const rp = typeof (role as any).permissions === 'string'
        ? safeParse((role as any).permissions)
        : ((role as any).permissions || {});
      const keys = Object.keys(rp).filter(k => rp[k] === true).sort();

      const [users] = await db.User.sequelize.query(
        `SELECT id, name, email, is_active, assigned_branch_id, last_login AS last_login_at
           FROM users WHERE role_id = :id ORDER BY name ASC`,
        { replacements: { id: role.id } }
      );

      return res.status(200).json({
        role: {
          id: role.id, code: (role as any).code, name: role.name,
          level: (role as any).level, dataScope: (role as any).data_scope || (role as any).dataScope,
          isActive: (role as any).is_active !== false
        },
        permissions: keys,
        permissionCount: keys.length,
        hasWildcard: !!rp['*'],
        users: users as any[],
        userCount: (users as any[]).length
      });
    }

    return res.status(400).json({
      error: 'Param `mode` wajib: byPermission | byUser | byRole'
    });
  } catch (err: any) {
    console.error('permissions/explorer error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err?.message });
  }
}

function safeParse(raw: string): Record<string, boolean> {
  try { return JSON.parse(raw) || {}; } catch { return {}; }
}

export default withHQAuth(handler);
