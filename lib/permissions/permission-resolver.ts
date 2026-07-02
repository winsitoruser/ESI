// =======================================================================
// Permission Resolver — sumber tunggal untuk "apa yang user boleh lakukan"
// =======================================================================
// Alur:
//   1. Cari user di DB via session (id/email)
//   2. Ambil role_id → JOIN roles.permissions
//   3. Fallback ke role enum lama (user.role) bila tidak ada role_id
//   4. Super admin / owner / superhero bypass total
//   5. Support wildcard:
//        '*'               → semua permission
//        'finance.*'       → semua yang prefix finance.
//        'finance.view.*'  → sama
//   6. Hasil di-cache in-memory per userId selama CACHE_TTL_MS
// =======================================================================

import type { NextApiRequest } from 'next';

export interface ResolvedPermission {
  userId: string | number | null;
  role: string | null;
  roleId: string | null;
  roleCode: string | null;
  roleLevel: number | null;
  dataScope: string | null;
  permissions: Record<string, boolean>;
  isSuperAdmin: boolean;
}

interface CacheEntry {
  data: ResolvedPermission;
  expiresAt: number;
}

const CACHE_TTL_MS = 30_000; // 30 detik cukup untuk mengurangi query
const cache = new Map<string, CacheEntry>();

export function invalidatePermissionCache(userId?: string | number | null) {
  if (userId == null) {
    cache.clear();
    return;
  }
  cache.delete(String(userId));
}

const SUPER_ROLES = new Set(['super_admin', 'superhero', 'owner']);

function normalizePermissionsMap(raw: unknown): Record<string, boolean> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) || {}; } catch { return {}; }
  }
  return raw as Record<string, boolean>;
}

/**
 * Match permission key with wildcard support.
 *   matches('pos.view',     { 'pos.view': true })    → true
 *   matches('pos.void',     { 'pos.*': true })       → true
 *   matches('inventory.x',  { '*': true })           → true
 *   matches('inventory.x',  { 'inventory.*': false }) → false
 */
export function hasPermission(
  permissions: Record<string, boolean>,
  key: string
): boolean {
  if (permissions[key] === true) return true;

  // Cek wildcard segment
  const parts = key.split('.');
  for (let i = parts.length - 1; i >= 0; i--) {
    const prefix = parts.slice(0, i).join('.');
    const wildcardKey = prefix ? `${prefix}.*` : '*';
    if (permissions[wildcardKey] === true) return true;
  }
  return false;
}

export function hasAnyPermission(
  permissions: Record<string, boolean>,
  keys: string[]
): boolean {
  return keys.some(k => hasPermission(permissions, k));
}

export function hasAllPermissions(
  permissions: Record<string, boolean>,
  keys: string[]
): boolean {
  return keys.every(k => hasPermission(permissions, k));
}

async function getModelsSafely(): Promise<any | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../models');
    return mod?.default || mod;
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[permission-resolver] models not available:', err?.message);
    }
    return null;
  }
}

/**
 * Resolve permission untuk user berdasar session.
 * Harus dipanggil dengan `req` yang sudah lewat auth middleware (ada `session.user`).
 */
export async function resolvePermissions(req: NextApiRequest): Promise<ResolvedPermission> {
  const session = (req as any).session;
  const user = session?.user;

  const sessionRole = (user?.role || '').toLowerCase();
  const userId = user?.id ?? user?.email ?? null;

  // Base empty response
  const empty: ResolvedPermission = {
    userId,
    role: sessionRole || null,
    roleId: null,
    roleCode: null,
    roleLevel: null,
    dataScope: null,
    permissions: {},
    isSuperAdmin: SUPER_ROLES.has(sessionRole)
  };

  if (!user) return empty;

  // Super admin bypass — kembalikan '*' wildcard agar hasPermission selalu true
  if (empty.isSuperAdmin) {
    empty.permissions = { '*': true };
    return empty;
  }

  const cacheKey = String(userId);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const db = await getModelsSafely();
  if (!db?.Role?.sequelize) {
    // Tanpa DB: kembalikan empty. Bisa kembangkan fallback ke mapping statis.
    return empty;
  }

  try {
    // Cari user & join role. Gunakan raw SQL agar tidak bergantung pada
    // association yang belum didefinisikan di models/User.js (role_id FK).
    const email = user?.email;
    const [[row]] = await db.Role.sequelize.query(
      `SELECT u.id AS user_id, u.role AS user_role,
              r.id AS role_id, r.code AS role_code, r.name AS role_name,
              r.level AS role_level, r.data_scope AS data_scope,
              r.permissions AS role_permissions,
              r.is_active AS role_active
         FROM users u
         LEFT JOIN roles r ON r.id = u.role_id
         WHERE ${user.id ? 'u.id = :id' : 'LOWER(u.email) = LOWER(:email)'}
         LIMIT 1`,
      { replacements: { id: user.id, email } }
    );

    if (!row) return empty;

    const legacyRole = String(row.user_role || sessionRole).toLowerCase();
    if (SUPER_ROLES.has(legacyRole)) {
      const resolved: ResolvedPermission = {
        userId: row.user_id,
        role: legacyRole,
        roleId: row.role_id || null,
        roleCode: row.role_code || null,
        roleLevel: row.role_level ?? null,
        dataScope: row.data_scope || 'all',
        permissions: { '*': true },
        isSuperAdmin: true
      };
      cache.set(cacheKey, { data: resolved, expiresAt: Date.now() + CACHE_TTL_MS });
      return resolved;
    }

    // Kumpulkan permission: mulai dari role.permissions, plus baseline bila
    // role_id kosong (fallback ke enum lama → pakai mapping statis).
    let perms = normalizePermissionsMap(row.role_permissions);

    if (!row.role_id) {
      // Fallback: map enum user.role → permission baseline
      perms = legacyRolePermissions(legacyRole);
    }

    const resolved: ResolvedPermission = {
      userId: row.user_id,
      role: legacyRole,
      roleId: row.role_id || null,
      roleCode: row.role_code || null,
      roleLevel: row.role_level ?? null,
      dataScope: row.data_scope || 'branch',
      permissions: perms,
      isSuperAdmin: false
    };

    if (row.role_id && row.role_active === false) {
      // Role dinonaktifkan → tolak semua permission non-view
      resolved.permissions = {};
    }

    cache.set(cacheKey, { data: resolved, expiresAt: Date.now() + CACHE_TTL_MS });
    return resolved;
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[permission-resolver] query err:', err?.message);
    }
    return empty;
  }
}

// Baseline permissions untuk enum role lama (jika user belum punya role_id).
// Ini versi minimal sesuai User.role enum di models/User.js.
function legacyRolePermissions(role: string): Record<string, boolean> {
  switch (role) {
    case 'owner':
    case 'admin':
    case 'hq_admin':
      return { '*': true };
    case 'manager':
    case 'branch_manager':
      return {
        'dashboard.*': true, 'pos.*': true, 'products.*': true, 'inventory.*': true,
        'purchase.*': true, 'customers.*': true, 'employees.view': true,
        'attendance.*': true, 'leave.*': true, 'overtime.*': true, 'reports.*': true,
        'branches.view': true, 'branches.performance': true
      };
    case 'cashier':
      return {
        'dashboard.view': true, 'pos.view': true, 'pos.create_transaction': true,
        'pos.discount': true, 'pos.reprint': true, 'pos.close_shift': true,
        'customers.view': true, 'customers.create': true, 'customers.update': true,
        'customers.manage_loyalty': true, 'products.view': true, 'inventory.view': true
      };
    case 'kitchen_staff':
      return { 'dashboard.view': true, 'production.*': true, 'kitchen.*': true };
    case 'finance_staff':
      return {
        'dashboard.view': true, 'finance.*': true, 'finance_transactions.*': true,
        'finance_expenses.*': true, 'finance_invoices.*': true, 'reports.*': true
      };
    case 'hr_staff':
      return {
        'dashboard.view': true, 'employees.*': true, 'attendance.*': true,
        'leave.*': true, 'overtime.*': true, 'recruitment.*': true,
        'training.*': true, 'performance.*': true, 'reports.hris': true
      };
    case 'inventory_staff':
      return { 'dashboard.view': true, 'products.view': true, 'inventory.*': true, 'purchase.receive': true };
    case 'staff':
    default:
      return {
        'dashboard.view': true, 'pos.view': true, 'pos.create_transaction': true,
        'products.view': true, 'customers.view': true, 'inventory.view': true
      };
  }
}
