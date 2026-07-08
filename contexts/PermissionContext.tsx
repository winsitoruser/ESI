import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { HUMANIFY_PERMISSIONS_API } from '@/lib/humanify/paths';

// =======================================================================
// PermissionContext
// =======================================================================
// Context + hook untuk akses permission user yang sedang login.
// Otomatis memuat `/api/hq/me/permissions` atau `/api/humanify/me/permissions`
// setelah session ready,
// meng-cache hasil, dan menyediakan helper wildcard-aware.
// =======================================================================

export interface PermissionSnapshot {
  user: { id: string | null; email: string | null; name: string | null; tenantId: string | null } | null;
  role: string | null;
  roleId: string | null;
  roleCode: string | null;
  roleLevel: number | null;
  dataScope: string | null;
  isSuperAdmin: boolean;
  permissions: Record<string, boolean>;
}

interface PermissionContextValue {
  data: PermissionSnapshot;
  loading: boolean;
  error: string | null;
  /** Refetch paksa, berguna setelah admin ganti role user dirinya sendiri. */
  refresh: () => Promise<void>;
  /** Cek satu permission (wildcard-aware). */
  can: (key: string) => boolean;
  /** True jika punya salah satu dari list. */
  canAny: (keys: string[]) => boolean;
  /** True jika punya semua. */
  canAll: (keys: string[]) => boolean;
}

const EMPTY: PermissionSnapshot = {
  user: null,
  role: null,
  roleId: null,
  roleCode: null,
  roleLevel: null,
  dataScope: null,
  isSuperAdmin: false,
  permissions: {}
};

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

const SUPER_ROLES = new Set(['super_admin', 'superhero', 'owner']);

function snapshotFromSession(session: ReturnType<typeof useSession>['data']): PermissionSnapshot | null {
  const role = ((session?.user as { role?: string } | undefined)?.role || '').toLowerCase();
  if (!SUPER_ROLES.has(role)) return null;
  return {
    user: {
      id: (session?.user as { id?: string } | undefined)?.id ?? null,
      email: session?.user?.email ?? null,
      name: session?.user?.name ?? null,
      tenantId: (session?.user as { tenantId?: string } | undefined)?.tenantId ?? null,
    },
    role,
    roleId: null,
    roleCode: 'SUPER_ADMIN',
    roleLevel: 1,
    dataScope: 'all_branches',
    isSuperAdmin: true,
    permissions: { '*': true },
  };
}

export function hasPerm(perms: Record<string, boolean>, key: string): boolean {
  if (perms['*'] === true) return true;
  if (perms[key] === true) return true;
  const parts = key.split('.');
  for (let i = parts.length - 1; i >= 0; i--) {
    const prefix = parts.slice(0, i).join('.');
    const wildcardKey = prefix ? `${prefix}.*` : '*';
    if (perms[wildcardKey] === true) return true;
  }
  return false;
}

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { status, data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<PermissionSnapshot>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  const permissionsApi = router.pathname.startsWith('/humanify')
    ? HUMANIFY_PERMISSIONS_API
    : '/api/hq/me/permissions';

  const fetchPermissions = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 10_000) return; // throttle 10s
    lastFetchRef.current = now;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(permissionsApi, { credentials: 'include' });
      if (res.status === 401) {
        setData(EMPTY);
        return;
      }
      if (!res.ok) {
        const fallback = snapshotFromSession(session);
        if (fallback) {
          setData(fallback);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      setData({
        user: json.user || null,
        role: json.role || null,
        roleId: json.roleId || null,
        roleCode: json.roleCode || null,
        roleLevel: json.roleLevel ?? null,
        dataScope: json.dataScope || null,
        isSuperAdmin: !!json.isSuperAdmin,
        permissions: json.permissions || {}
      });
    } catch (err: any) {
      const fallback = snapshotFromSession(session);
      if (fallback) {
        setData(fallback);
        setError(null);
      } else {
        setError(err?.message || 'Gagal memuat permission');
        setData(EMPTY);
      }
    } finally {
      setLoading(false);
    }
  }, [permissionsApi, session]);

  useEffect(() => {
    if (status === 'authenticated') fetchPermissions(true);
    if (status === 'unauthenticated') setData(EMPTY);
  }, [status, fetchPermissions]);

  const value = useMemo<PermissionContextValue>(() => ({
    data,
    loading,
    error,
    refresh: () => fetchPermissions(true),
    can: (key: string) => data.isSuperAdmin || hasPerm(data.permissions, key),
    canAny: (keys: string[]) => data.isSuperAdmin || keys.some(k => hasPerm(data.permissions, k)),
    canAll: (keys: string[]) => data.isSuperAdmin || keys.every(k => hasPerm(data.permissions, k))
  }), [data, loading, error, fetchPermissions]);

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function useMyPermissions(): PermissionContextValue {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    // Fallback aman bila dipakai di tree tanpa provider (misal pada halaman publik).
    return {
      data: EMPTY,
      loading: false,
      error: null,
      refresh: async () => {},
      can: () => false,
      canAny: () => false,
      canAll: () => false
    };
  }
  return ctx;
}

export { PermissionContext };
