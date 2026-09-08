import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import OpsLayout from '@/components/humanify/OpsLayout';
import {
  OpsBadge, OpsPageIntro, OpsPageSkeleton, OpsToast,
} from '@/components/humanify/ops-ui';
import { usePlatformOperator } from '@/lib/humanify/use-platform-operator';
import {
  DESK_LABEL, PERMISSIONS, STAFF_DESKS, permissionMatrix,
  type StaffDesk,
} from '@/lib/saas/platform-desks';
import { RefreshCw } from 'lucide-react';

type PlatformUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isPlatform: boolean;
};

const matrix = permissionMatrix();

export default function PlatformRolesPage() {
  const { gating } = usePlatformOperator('/platform/roles');
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [desks, setDesks] = useState<Record<string, StaffDesk>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, d] = await Promise.all([
        fetch('/api/platform?action=users&scope=platform&limit=80').then((r) => r.json()),
        fetch('/api/platform?action=staff-desks').then((r) => r.json()),
      ]);
      if (u.success) setUsers((u.data?.users || []).filter((row: PlatformUser) => row.isPlatform));
      const map: Record<string, StaffDesk> = {};
      for (const row of d.data?.desks || []) map[String(row.userId)] = row.desk;
      if (d.success) setDesks(map);
      if (!u.success) setToast(u.error || 'Gagal memuat staf');
    } catch {
      setToast('Gagal memuat roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!gating) load(); }, [gating, load]);

  const assign = async (userId: string, email: string, desk: string) => {
    setActing(userId);
    try {
      const res = await fetch('/api/platform?action=staff-desk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email, desk }),
      }).then((r) => r.json());
      setToast(res.success ? `Desk ${DESK_LABEL[desk as StaffDesk] || desk} disimpan` : (res.error || 'Gagal'));
      if (res.success) setDesks((prev) => ({ ...prev, [userId]: desk as StaffDesk }));
    } finally {
      setActing(null);
    }
  };

  return (
    <OpsLayout title="Roles" subtitle="Desk staf dan matriks izin">
      <OpsToast message={toast} onDismiss={() => setToast('')} />
      {gating || loading ? (
        <OpsPageSkeleton variant="detail" />
      ) : (
        <div className="space-y-5">
          <OpsPageIntro
            eyebrow="Administration"
            title="Roles & permissions"
            description="Setiap staf hanya mendapat aksi sesuai desk. Super Admin dan staf tanpa desk tetap akses penuh (kompatibel)."
            actions={
              <>
                <Link href="/platform/users" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  Pengguna
                </Link>
                <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <RefreshCw className="h-3.5 w-3.5" /> Segarkan
                </button>
              </>
            }
          />

          <div className="hf-card overflow-x-auto p-0">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Izin</th>
                  {STAFF_DESKS.map((d) => (
                    <th key={d} className="px-2 py-2 font-semibold text-center">{DESK_LABEL[d].split(' ')[0]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.permission} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-700">{row.label}</td>
                    {STAFF_DESKS.map((d) => (
                      <td key={d} className="px-2 py-2 text-center">
                        {row.desks[d] ? (
                          <span className="text-emerald-700">✓</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="sr-only">{PERMISSIONS.length} izin</p>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">Assign desk</h2>
            {users.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{u.name || u.email}</p>
                  <p className="text-[11px] text-slate-500">{u.email} · {u.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  {desks[u.id] ? <OpsBadge tone="brand">{DESK_LABEL[desks[u.id]]}</OpsBadge> : <OpsBadge>penuh</OpsBadge>}
                  <select
                    value={desks[u.id] || ''}
                    disabled={!!acting}
                    onChange={(e) => e.target.value && assign(u.id, u.email, e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  >
                    <option value="">Tanpa desk (penuh)</option>
                    {STAFF_DESKS.map((d) => (
                      <option key={d} value={d}>{DESK_LABEL[d]}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
            {users.length === 0 && <p className="text-sm text-slate-500">Belum ada operator platform.</p>}
          </div>
        </div>
      )}
    </OpsLayout>
  );
}
