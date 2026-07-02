/**
 * Utility functions for admin authentication
 */

export const isAdminRole = (role: string | undefined): boolean => {
  if (!role) return false;
  
  const normalizedRole = role.toLowerCase().trim();
  const adminRoles = ['admin', 'super_admin', 'superadmin'];
  
  return adminRoles.includes(normalizedRole);
};

export const isSuperAdminRole = (role: string | undefined): boolean => {
  if (!role) return false;
  
  const normalizedRole = role.toLowerCase().trim();
  return normalizedRole === 'super_admin' || normalizedRole === 'superadmin';
};

export const hasAdminAccess = (session: any): boolean => {
  return session && session.user && isAdminRole(session.user.role);
};

export const hasSuperAdminAccess = (session: any): boolean => {
  return session && session.user && isSuperAdminRole(session.user.role);
};
