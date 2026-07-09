/** Role helpers for Humanify manager portal features in /employee */

const MANAGER_ROLES = new Set(['manager', 'branch_manager']);
const SUPER_ADMIN_ROLES = new Set(['super_admin', 'superhero', 'owner', 'admin']);

export function isSuperAdminRole(role?: string | null): boolean {
  return SUPER_ADMIN_ROLES.has(String(role || '').toLowerCase());
}

export function isManagerRole(role?: string | null): boolean {
  const r = String(role || '').toLowerCase();
  return MANAGER_ROLES.has(r) || isSuperAdminRole(r);
}

export function canAccessManagerPortal(role?: string | null): boolean {
  return isManagerRole(role);
}
