import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import OpsLayout from '@/components/humanify/OpsLayout';
import {
  OpsBadge, OpsConfirm, OpsPageIntro, OpsPageSkeleton, OpsStat, OpsToast,
} from '@/components/humanify/ops-ui';
import OpsDataTable from '@/components/humanify/OpsDataTable';
import { usePlatformOperator } from '@/lib/humanify/use-platform-operator';
import { HUMANIFY_PLANS } from '@/lib/saas/plan-entitlements';
import { CreditCard, RefreshCw } from 'lucide-react';

type Row = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  planName: string;
  mrrIdr: number;
  userCount: number;
  trialEndsAt: string | null;
  daysLeft: number | null;
  risk: 'ok' | 'renewal' | 'churn';
};

function idr(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}

/**
 * Admin Total — subscription management (upgrade, trial, renewal, churn).
 */
export default function PlatformSubscriptionsPage() {
  const { gating } = usePlatformOperator('/platform/subscriptions');
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState({ active: 0, trial: 0, renewal14: 0, churnRisk: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    run: () => Promise<void>;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform?action=subscriptions').then((r) => r.json());
      if (res.success) {
        setRows(res.data?.rows || []);
        setCounts(res.data?.counts || { active: 0, trial: 0, renewal14: 0, churnRisk: 0 });
      } else setToast(res.error || 'Gagal memuat langganan');
    } catch {
      setToast('Gagal memuat langganan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!gating) load();
  }, [gating, load]);

  const changePlan = async (id: string, plan: string) => {
    setActing(id);
    try {
      const res = await fetch('/api/platform?action=tenant-plan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, plan }),
      }).then((r) => r.json());
      setToast(res.success ? (res.message || 'Plan diubah') : (res.error || 'Gagal ubah plan'));
      if (res.success) await load();
    } finally {
      setActing(null);
    }
  };

  const extend = async (id: string, days: number) => {
    setActing(id);
    try {
      const res = await fetch('/api/platform?action=extend-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, days }),
      }).then((r) => r.json());
      setToast(res.success ? (res.message || 'Trial diperpanjang') : (res.error || 'Gagal perpanjang'));
      if (res.success) await load();
    } finally {
      setActing(null);
    }
  };

  return (
    <OpsLayout title="Langganan" subtitle="Paket, trial, renewal, dan risiko churn">
      <OpsToast message={toast} onDismiss={() => setToast('')} />
      <OpsConfirm
        open={!!confirm}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        confirmLabel="Lanjutkan"
        busy={!!acting}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          const job = confirm;
          setConfirm(null);
          if (job) await job.run();
        }}
      />
      {gating || (loading && rows.length === 0) ? (
        <OpsPageSkeleton variant="table" />
      ) : (
        <div className="space-y-5">
          <OpsPageIntro
            eyebrow="Commercial"
            title="Manajemen langganan"
            description="Upgrade/downgrade paket, perpanjang trial, dan pantau renewal 14 hari. Harga paket diubah dari Billing."
            actions={
              <>
                <Link href="/platform/products" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  Katalog paket
                </Link>
                <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Segarkan
                </button>
              </>
            }
          />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <OpsStat label="Paid / active" value={counts.active} tone="success" icon={CreditCard} />
            <OpsStat label="Trial" value={counts.trial} tone="warning" />
            <OpsStat label="Renewal ≤14 hari" value={counts.renewal14} tone="warning" />
            <OpsStat label="Risiko churn" value={counts.churnRisk} tone="danger" />
          </div>
          <OpsDataTable
            rows={rows}
            loading={loading}
            rowKey={(r) => r.id}
            searchPlaceholder="Cari perusahaan, slug, atau paket…"
            exportFileName="humanify-admin-subscriptions"
            emptyTitle="Belum ada langganan"
            filters={[
              {
                id: 'status',
                label: 'Status',
                options: [
                  { value: 'active', label: 'Active' },
                  { value: 'trial', label: 'Trial' },
                  { value: 'suspended', label: 'Suspended' },
                ],
                getValue: (r) => r.status,
              },
              {
                id: 'risk',
                label: 'Risiko',
                options: [
                  { value: 'churn', label: 'Churn' },
                  { value: 'renewal', label: 'Renewal' },
                  { value: 'ok', label: 'Stabil' },
                ],
                getValue: (r) => r.risk,
              },
            ]}
            columns={[
              {
                id: 'name',
                header: 'Perusahaan',
                exportValue: (r) => r.slug,
                cell: (r) => (
                  <Link href={`/platform/tenants/${r.id}`} className="block min-w-0 hover:underline">
                    <p className="truncate text-sm font-medium text-slate-900">{r.name}</p>
                    <p className="truncate text-[11px] text-slate-400">/{r.slug}</p>
                  </Link>
                ),
              },
              {
                id: 'plan',
                header: 'Paket',
                cell: (r) => (
                  <select
                    value={r.plan}
                    disabled={!!acting}
                    onChange={(e) => setConfirm({
                      title: `Ubah paket ${r.name}?`,
                      message: `Dari ${r.planName} ke ${HUMANIFY_PLANS[e.target.value as keyof typeof HUMANIFY_PLANS]?.name || e.target.value}.`,
                      run: () => changePlan(r.id, e.target.value),
                    })}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                  >
                    {Object.values(HUMANIFY_PLANS).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                ),
              },
              {
                id: 'status',
                header: 'Status',
                cell: (r) => (
                  <OpsBadge tone={r.status === 'active' ? 'success' : r.status === 'trial' ? 'warning' : 'danger'}>
                    {r.status}
                  </OpsBadge>
                ),
              },
              {
                id: 'mrr',
                header: 'MRR',
                cell: (r) => <span className="text-xs tabular-nums">{idr(r.mrrIdr)}</span>,
              },
              {
                id: 'trial',
                header: 'Trial',
                cell: (r) => (
                  <span className="text-xs text-slate-600">
                    {r.daysLeft != null ? `${r.daysLeft} hari` : '—'}
                  </span>
                ),
              },
              {
                id: 'risk',
                header: 'Sinyal',
                cell: (r) => (
                  <OpsBadge tone={r.risk === 'churn' ? 'danger' : r.risk === 'renewal' ? 'warning' : 'success'}>
                    {r.risk === 'ok' ? 'stabil' : r.risk}
                  </OpsBadge>
                ),
              },
              {
                id: 'extend',
                header: '',
                exportOmit: true,
                cell: (r) => r.status === 'trial' ? (
                  <button
                    type="button"
                    disabled={!!acting}
                    onClick={() => setConfirm({
                      title: 'Perpanjang trial 14 hari?',
                      message: `${r.name} mendapat 14 hari tambahan dari tanggal berakhir saat ini.`,
                      run: () => extend(r.id, 14),
                    })}
                    className="text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline"
                  >
                    +14 hari
                  </button>
                ) : null,
              },
            ]}
          />
        </div>
      )}
    </OpsLayout>
  );
}
