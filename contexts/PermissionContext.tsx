import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

// =======================================================================
// PermissionContext
// =======================================================================
// Context + hook untuk akses permission user yang sedang login.
// Otomatis memuat `/api/hq/me/permissions` setelah session ready,
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
  const { status } = useSession();
  const [data, setData] = useState<PermissionSnapshot>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchPermissions = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 10_000) return; // throttle 10s
    lastFetchRef.current = now;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/hq/me/permissions', { credentials: 'include' });
      if (res.status === 401) {
        setData(EMPTY);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
      setError(err?.message || 'Gagal memuat permission');
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, []);

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
