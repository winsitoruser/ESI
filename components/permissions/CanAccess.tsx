import React from 'react';
import { useMyPermissions } from '../../contexts/PermissionContext';

// =======================================================================
// <CanAccess>
// =======================================================================
// Conditional render berdasar permission. Contoh:
//
//   <CanAccess permission="roles.create">
//     <button>Tambah Role</button>
//   </CanAccess>
//
//   <CanAccess anyPermission={['pos.refund', 'pos.void_transaction']}>
//     <RefundButton />
//   </CanAccess>
//
//   <CanAccess allPermissions={['finance.view', 'finance.view_pnl']}
//              fallback={<p>Akses terbatas</p>}>
//     <ProfitLossChart />
//   </CanAccess>
//
//   <CanAccess role={['SUPERHERO', 'HQ_ADMIN']}>...</CanAccess>
//   <CanAccess minLevel={3}>...</CanAccess>   // level ≤ 3
//
// =======================================================================

export interface CanAccessProps {
  permission?: string;
  anyPermission?: string[];
  allPermissions?: string[];
  /** Role code (uppercase) atau list. */
  role?: string | string[];
  /** Minimum level (angka kecil = akses lebih tinggi). Misal minLevel=3 → user harus Level 1,2,3 */
  minLevel?: number;
  /** Akan ditampilkan jika user tidak punya akses. Default: null. */
  fallback?: React.ReactNode;
  /** Saat loading permission, render children langsung (optimistic) atau fallback? Default: fallback. */
  optimistic?: boolean;
  children: React.ReactNode;
}

export function CanAccess({
  permission,
  anyPermission,
  allPermissions,
  role,
  minLevel,
  fallback = null,
  optimistic = false,
  children
}: CanAccessProps) {
  const { data, loading, can, canAny, canAll } = useMyPermissions();

  if (loading) {
    return <>{optimistic ? children : fallback}</>;
  }

  if (data.isSuperAdmin) return <>{children}</>;

  // Role/level checks (hard gate)
  if (role) {
    const expected = (Array.isArray(role) ? role : [role]).map(r => r.toUpperCase());
    const userRole = (data.roleCode || data.role || '').toUpperCase();
    if (!expected.includes(userRole)) return <>{fallback}</>;
  }

  if (typeof minLevel === 'number') {
    if (data.roleLevel == null || data.roleLevel > minLevel) return <>{fallback}</>;
  }

  // Permission checks
  if (permission && !can(permission)) return <>{fallback}</>;
  if (anyPermission && !canAny(anyPermission)) return <>{fallback}</>;
  if (allPermissions && !canAll(allPermissions)) return <>{fallback}</>;

  return <>{children}</>;
}

// =======================================================================
// <ShowIf> — inverse convenience wrapper
// =======================================================================
// Contoh: <ShowIf when={(p) => !p.can('roles.create')}>...</ShowIf>

export function ShowIf({
  when,
  children,
  fallback = null
}: {
  when: (ctx: ReturnType<typeof useMyPermissions>) => boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const ctx = useMyPermissions();
  return <>{when(ctx) ? children : fallback}</>;
}

export default CanAccess;
