import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ShieldOff, ArrowLeft, Lock, Info, Loader2 } from 'lucide-react';
import { useMyPermissions } from '../../contexts/PermissionContext';

// =======================================================================
// <PageGuard>
// =======================================================================
// Bungkus isi halaman HQ dengan proteksi level halaman. Kalau user tidak
// punya permission yang diperlukan → tampilkan UI "Akses Ditolak" yang
// konsisten dan informatif (bukan sekadar halaman kosong).
//
// Contoh pemakaian:
//
//   export default function ProfitLossPage() {
//     return (
//       <PageGuard permission="reports.finance.pnl" title="Laporan Laba Rugi">
//         <HQLayout> ... </HQLayout>
//       </PageGuard>
//     );
//   }
//
//   <PageGuard anyPermission={['finance.view', 'finance.view_pnl']} ... />
//   <PageGuard minLevel={3} role={['HQ_ADMIN','FINANCE_MANAGER']} ... />
// =======================================================================

export interface PageGuardProps {
  permission?: string;
  anyPermission?: string[];
  allPermissions?: string[];
  role?: string | string[];
  minLevel?: number;
  /** Dipakai pada UI Access Denied sebagai judul halaman. */
  title?: string;
  /** Deskripsi halaman (membantu user tahu apa yg sedang coba diakses). */
  description?: string;
  /** Custom fallback, kalau tidak diisi pakai UI default. */
  fallback?: React.ReactNode;
  /** Saat permission masih loading → tampilkan skeleton. */
  loadingComponent?: React.ReactNode;
  children: React.ReactNode;
}

function DefaultAccessDenied({
  title,
  description,
  requiredPermission,
  roleCode,
  roleLevel
}: {
  title?: string;
  description?: string;
  requiredPermission?: string;
  roleCode?: string | null;
  roleLevel?: number | null;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50/40 to-orange-50/40 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
              <ShieldOff className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Akses Ditolak</h1>
              <p className="text-red-100 text-sm">Hak akses tidak mencukupi</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {title && (
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Halaman</p>
              <p className="text-lg font-semibold text-slate-900">{title}</p>
              {description && <p className="text-sm text-slate-600 mt-1">{description}</p>}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-900">
                  Anda tidak memiliki izin untuk mengakses halaman ini.
                </p>
                <p className="text-amber-800 mt-1">
                  Silakan hubungi administrator jika Anda merasa ini adalah kesalahan.
                </p>
              </div>
            </div>
          </div>

          {requiredPermission && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider mb-2">
                <Lock className="w-3.5 h-3.5" />
                Permission yang Diperlukan
              </div>
              <code className="block bg-white px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono text-rose-600">
                {requiredPermission}
              </code>
            </div>
          )}

          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-2 text-xs text-blue-600 uppercase tracking-wider mb-2">
              <Info className="w-3.5 h-3.5" />
              Role Anda Saat Ini
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">
                {roleCode || 'Tidak diketahui'}
              </span>
              {roleLevel != null && (
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                  Level {roleLevel}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Link
              href="/hq"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Dashboard
            </Link>
            <Link
              href="/hq/users/roles"
              className="flex-1 text-center px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
            >
              Lihat Roles
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function DefaultLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        <p className="text-sm">Memeriksa hak akses...</p>
      </div>
    </div>
  );
}

export function PageGuard({
  permission,
  anyPermission,
  allPermissions,
  role,
  minLevel,
  title,
  description,
  fallback,
  loadingComponent,
  children
}: PageGuardProps) {
  const { data, loading, can, canAny, canAll } = useMyPermissions();

  if (loading) {
    return <>{loadingComponent ?? <DefaultLoading />}</>;
  }

  if (data.isSuperAdmin) return <>{children}</>;

  let denied = false;
  let requiredLabel: string | undefined;

  if (role) {
    const expected = (Array.isArray(role) ? role : [role]).map(r => r.toUpperCase());
    const userRole = (data.roleCode || data.role || '').toUpperCase();
    if (!expected.includes(userRole)) {
      denied = true;
      requiredLabel = `role: ${expected.join(' | ')}`;
    }
  }

  if (!denied && typeof minLevel === 'number') {
    if (data.roleLevel == null || data.roleLevel > minLevel) {
      denied = true;
      requiredLabel = `level ≤ ${minLevel}`;
    }
  }

  if (!denied && permission && !can(permission)) {
    denied = true;
    requiredLabel = permission;
  }
  if (!denied && anyPermission && !canAny(anyPermission)) {
    denied = true;
    requiredLabel = anyPermission.join(' OR ');
  }
  if (!denied && allPermissions && !canAll(allPermissions)) {
    denied = true;
    requiredLabel = allPermissions.join(' AND ');
  }

  if (denied) {
    return (
      <>
        {fallback ?? (
          <DefaultAccessDenied
            title={title}
            description={description}
            requiredPermission={requiredLabel}
            roleCode={data.roleCode}
            roleLevel={data.roleLevel}
          />
        )}
      </>
    );
  }

  return <>{children}</>;
}

export default PageGuard;
