import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import OpsLayout from '@/components/humanify/OpsLayout';
import {
  OpsBadge, OpsConfirm, OpsPageIntro, OpsPageSkeleton, OpsStat, OpsToast,
} from '@/components/humanify/ops-ui';
import OpsDataTable from '@/components/humanify/OpsDataTable';
import { usePlatformOperator } from '@/lib/humanify/use-platform-operator';
import { RefreshCw, Shield, Users } from 'lucide-react';

type PlatformUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  tenantId: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  lastLogin: string | null;
  createdAt: string | null;
  isPlatform: boolean;
};

/**
 * Admin Total — directory of platform operators and tenant users.
 */
export default function PlatformUsersPage() {
  const { gating, session } = usePlatformOperator('/platform/users');
  const selfId = session?.user && (session.user as any).id != null
    ? String((session.user as any).id)
    : '';
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    danger?: boolean;
    run: () => Promise<void>;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform?action=users&limit=150').then((r) => r.json());
      if (res.success) {
        setUsers(res.data?.users || []);
        setTotal(res.data?.total || 0);
      } else setToast(res.error || 'Gagal memuat pengguna');
    } catch {
      setToast('Gagal memuat direktori pengguna');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!gating) load();
  }, [gating, load]);

  const toggle = async (row: PlatformUser, next: boolean) => {
    setActing(row.id);
    try {
      const res = await fetch('/api/platform?action=user-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, isActive: next }),
      }).then((r) => r.json());
      if (!res.success) {
        setToast(res.error || 'Gagal mengubah status');
        return;
      }
      setToast(res.message || (next ? 'Diaktifkan' : 'Dinonaktifkan'));
      await load();
    } catch {
      setToast('Gagal mengubah status pengguna');
    } finally {
      setActing(null);
    }
  };

  const platformCount = users.filter((u) => u.isPlatform).length;
  const inactiveCount = users.filter((u) => !u.isActive).length;

  return (
    <OpsLayout title="Pengguna" subtitle="Operator platform & akun tenant">
      <OpsToast message={toast} onDismiss={() => setToast('')} />
      <OpsConfirm
        open={!!confirm}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        confirmLabel="Ubah status"
        danger={confirm?.danger}
        busy={!!acting}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          const job = confirm;
          setConfirm(null);
          if (job) await job.run();
        }}
      />
      {gating || (loading && users.length === 0) ? (
        <OpsPageSkeleton variant="table" />
      ) : (
        <div className="space-y-5">
          <OpsPageIntro
            eyebrow="Directory"
            title="Pengguna platform"
            description="Operator Admin Total dan akun tenant. Nonaktifkan akses tanpa menghapus jejak. Tidak bisa menonaktifkan diri sendiri atau operator terakhir."
            actions={
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Segarkan
              </button>
            }
          />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <OpsStat label="Ditampilkan" value={users.length} hint={`${total} total`} icon={Users} />
            <OpsStat label="Operator" value={platformCount} tone="brand" icon={Shield} />
            <OpsStat label="Nonaktif" value={inactiveCount} tone={inactiveCount ? 'warning' : 'default'} />
          </div>

          <OpsDataTable
            rows={users}
            loading={loading}
            rowKey={(r) => r.id}
            searchPlaceholder="Cari nama, email, atau slug tenant…"
            exportFileName="humanify-admin-users"
            exportSheetName="Users"
            emptyTitle="Tidak ada pengguna"
            emptyHint="Direktori kosong atau filter tidak menemukan hasil."
            defaultPageSize={25}
            filters={[
              {
                id: 'scope',
                label: 'Lingkup',
                options: [
                  { value: 'platform', label: 'Operator' },
                  { value: 'tenant', label: 'Tenant' },
                ],
                getValue: (r) => (r.isPlatform ? 'platform' : 'tenant'),
              },
              {
                id: 'status',
                label: 'Status',
                options: [
                  { value: 'active', label: 'Aktif' },
                  { value: 'inactive', label: 'Nonaktif' },
                ],
                getValue: (r) => (r.isActive ? 'active' : 'inactive'),
              },
            ]}
            columns={[
              {
                id: 'name',
                header: 'Pengguna',
                exportValue: (r) => `${r.name} <${r.email}>`,
                cell: (r) => (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{r.name}</p>
                    <p className="truncate text-[11px] text-slate-400">{r.email}</p>
                  </div>
                ),
              },
              {
                id: 'role',
                header: 'Peran',
                exportValue: (r) => r.role,
                cell: (r) => (
                  <OpsBadge tone={r.isPlatform ? 'brand' : 'neutral'}>{r.role || '—'}</OpsBadge>
                ),
              },
              {
                id: 'tenant',
                header: 'Tenant',
                exportValue: (r) => r.tenantSlug || '',
                cell: (r) => r.tenantId ? (
                  <Link
                    href={`/platform/tenants/${r.tenantId}`}
                    className="truncate text-xs font-medium text-slate-700 hover:underline"
                  >
                    /{r.tenantSlug || r.tenantName || 'tenant'}
                  </Link>
                ) : (
                  <span className="text-xs text-slate-400">platform</span>
                ),
              },
              {
                id: 'isActive',
                header: 'Status',
                exportValue: (r) => (r.isActive ? 'aktif' : 'nonaktif'),
                cell: (r) => (
                  <OpsBadge tone={r.isActive ? 'success' : 'danger'}>
                    {r.isActive ? 'aktif' : 'nonaktif'}
                  </OpsBadge>
                ),
              },
              {
                id: 'lastLogin',
                header: 'Login terakhir',
                exportValue: (r) => (r.lastLogin ? new Date(r.lastLogin).toLocaleString('id-ID') : ''),
                cell: (r) => (
                  <span className="whitespace-nowrap text-xs tabular-nums text-slate-500">
                    {r.lastLogin ? new Date(r.lastLogin).toLocaleString('id-ID') : '—'}
                  </span>
                ),
              },
              {
                id: 'action',
                header: '',
                exportOmit: true,
                cell: (r) => {
                  const self = selfId && selfId === String(r.id);
                  return (
                    <button
                      type="button"
                      disabled={!!acting || self}
                      title={self ? 'Tidak bisa mengubah akun sendiri' : undefined}
                      onClick={() => setConfirm({
                        title: r.isActive ? 'Nonaktifkan pengguna?' : 'Aktifkan pengguna?',
                        message: r.isActive
                          ? `${r.email} tidak bisa masuk sampai diaktifkan lagi.`
                          : `${r.email} akan bisa masuk kembali.`,
                        danger: r.isActive,
                        run: () => toggle(r, !r.isActive),
                      })}
                      className="text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      {r.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  );
                },
              },
            ]}
          />
        </div>
      )}
    </OpsLayout>
  );
}
