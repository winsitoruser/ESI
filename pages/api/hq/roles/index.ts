import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { rolesService, buildPermissionMap } from '../../../../lib/permissions/roles-service';
import { countPermissions } from '../../../../lib/permissions/permissions-catalog';
import { logRoleAudit } from '../../../../lib/permissions/audit';
import {
  invalidatePermissionCache,
  hasPermission,
  type ResolvedPermission
} from '../../../../lib/permissions/permission-resolver';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const permCtx: ResolvedPermission | undefined = (req as any).permissionContext;
  const isSuper = permCtx?.isSuperAdmin;
  const perms = permCtx?.permissions || {};

  try {
    switch (req.method) {
      case 'GET': {
        if (!isSuper && !hasPermission(perms, 'roles.view')) {
          return res.status(403).json({ error: 'Missing permission: roles.view' });
        }
        return await getRoles(req, res);
      }
      case 'POST': {
        if (!isSuper && !hasPermission(perms, 'roles.create')) {
          return res.status(403).json({ error: 'Missing permission: roles.create' });
        }
        return await createRole(req, res);
      }
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Role API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withHQAuth(handler);

async function getRoles(req: NextApiRequest, res: NextApiResponse) {
  const { search, level, type, active } = req.query;

  let roles = await rolesService.list();

  if (search) {
    const s = (search as string).toLowerCase();
    roles = roles.filter(r => r.name.toLowerCase().includes(s) || r.code.toLowerCase().includes(s));
  }
  if (level) {
    const lvl = parseInt(level as string, 10);
    if (!Number.isNaN(lvl)) roles = roles.filter(r => r.level === lvl);
  }
  if (type === 'system') roles = roles.filter(r => r.isSystem);
  if (type === 'custom') roles = roles.filter(r => !r.isSystem);
  if (active === 'true') roles = roles.filter(r => r.isActive);

  const stats = await rolesService.stats();
  return res.status(200).json({ roles, stats });
}

async function createRole(req: NextApiRequest, res: NextApiResponse) {
  const { code, name, description, level, dataScope, permissions, isActive } = req.body || {};

  if (!code || !name) {
    return res.status(400).json({ error: 'Code dan nama wajib diisi' });
  }

  const normalizedCode = String(code).toUpperCase().replace(/\s+/g, '_');
  const existing = await rolesService.findByCode(normalizedCode);
  if (existing) {
    return res.status(400).json({ error: 'Kode role sudah dipakai' });
  }

  const permMap = buildPermissionMap(permissions);

  const role = await rolesService.create({
    code: normalizedCode,
    name,
    description: description || '',
    level: typeof level === 'number' ? level : 5,
    dataScope: dataScope || 'branch',
    isActive: isActive !== false,
    permissions: permMap
  });

  await logRoleAudit({
    req,
    action: 'role.create',
    targetType: 'role',
    targetId: role.id,
    targetLabel: role.name,
    newValues: {
      code: role.code,
      name: role.name,
      level: role.level,
      dataScope: role.dataScope,
      permissionCount: countPermissions(role.permissions)
    }
  });

  // Invalidate permission cache karena role baru bisa dipakai oleh user
  invalidatePermissionCache();

  return res.status(201).json({
    role,
    message: `Role "${role.name}" berhasil dibuat dengan ${countPermissions(role.permissions)} permission`
  });
}
