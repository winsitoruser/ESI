import { useMemo } from 'react';
import { useMyPermissions } from '../../contexts/PermissionContext';

// =======================================================================
// useFilteredColumns / filterByPermission
// =======================================================================
// Helper untuk menyaring kolom pada tabel/datagrid berdasar permission user.
// Kompatibel dengan AG-Grid, TanStack Table, atau tabel custom.
//
// Contoh pemakaian (kolom sensitif disembunyikan untuk role tanpa akses):
//
//   const columns = useFilteredColumns<EmployeeRow>([
//     { key: 'name',   header: 'Nama' },
//     { key: 'salary', header: 'Gaji', permission: 'employees.view_salary' },
//     { key: 'nik',    header: 'NIK',  anyPermission: ['hris.view_nik', 'hq.view_all'] },
//     { key: 'branch', header: 'Cabang', minLevel: 2 },
//   ]);
//
// Kolom tanpa guard (`permission/anyPermission/allPermissions/minLevel/role`)
// akan selalu ditampilkan.
// =======================================================================

export interface PermissionAwareColumn<T = any> {
  key: string;
  header?: string;
  /** Akses tunggal. */
  permission?: string;
  /** Akses jika memiliki salah satu. */
  anyPermission?: string[];
  /** Akses jika memiliki semua. */
  allPermissions?: string[];
  /** Hanya tampil untuk role tertentu. */
  role?: string | string[];
  /** Hanya tampil untuk level ≤ minLevel. */
  minLevel?: number;
  /** Metadata bebas (renderer, width, dll). */
  [x: string]: any;
}

/**
 * Filter kolom berdasar permission (bisa dipakai di luar React, misal
 * untuk export CSV server-side).
 */
export function filterByPermission<T extends PermissionAwareColumn>(
  columns: T[],
  ctx: {
    isSuperAdmin?: boolean;
    roleCode?: string | null;
    roleLevel?: number | null;
    can: (key: string) => boolean;
    canAny: (keys: string[]) => boolean;
    canAll: (keys: string[]) => boolean;
  }
): T[] {
  if (ctx.isSuperAdmin) return columns;

  return columns.filter((col) => {
    if (col.role) {
      const expected = (Array.isArray(col.role) ? col.role : [col.role]).map((r: string) =>
        r.toUpperCase()
      );
      if (!ctx.roleCode || !expected.includes(ctx.roleCode.toUpperCase())) return false;
    }
    if (typeof col.minLevel === 'number') {
      if (ctx.roleLevel == null || ctx.roleLevel > col.minLevel) return false;
    }
    if (col.permission && !ctx.can(col.permission)) return false;
    if (col.anyPermission && !ctx.canAny(col.anyPermission)) return false;
    if (col.allPermissions && !ctx.canAll(col.allPermissions)) return false;
    return true;
  });
}

/** React hook variant — reaktif terhadap permission context. */
export function useFilteredColumns<T extends PermissionAwareColumn>(columns: T[]): T[] {
  const { data, can, canAny, canAll } = useMyPermissions();

  return useMemo(
    () =>
      filterByPermission(columns, {
        isSuperAdmin: data.isSuperAdmin,
        roleCode: data.roleCode,
        roleLevel: data.roleLevel,
        can,
        canAny,
        canAll
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, data.isSuperAdmin, data.roleCode, data.roleLevel, data.permissions]
  );
}

export default useFilteredColumns;
