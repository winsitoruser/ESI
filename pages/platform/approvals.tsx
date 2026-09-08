import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import OpsLayout from '@/components/humanify/OpsLayout';
import {
  OpsBadge, OpsConfirm, OpsPageIntro, OpsPageSkeleton, OpsStat, OpsToast,
} from '@/components/humanify/ops-ui';
import OpsDataTable from '@/components/humanify/OpsDataTable';
import { usePlatformOperator } from '@/lib/humanify/use-platform-operator';
import { RefreshCw } from 'lucide-react';

type Item = {
  id: string;
  kind: string;
  status: string;
  title: string;
  detail: string | null;
  amountIdr: number;
  requestedBy: string | null;
  decidedBy: string | null;
  createdAt: string;
};

function idr(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}

export default function PlatformApprovalsPage() {
  const { gating } = usePlatformOperator('/platform/approvals');
  const [items, setItems] = useState<Item[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [confirm, setConfirm] = useState<{ id: string; decision: 'approved' | 'rejected' } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform?action=approvals&status=all').then((r) => r.json());
      if (res.success) {
        setItems(res.data?.items || []);
        setPendingCount(res.data?.pendingCount || 0);
      } else setToast(res.error || 'Gagal memuat approval');
    } catch {
      setToast('Gagal memuat approval');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!gating) load(); }, [gating, load]);

  const decide = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const res = await fetch('/api/platform?action=approval-decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirm),
      }).then((r) => r.json());
      setToast(res.success ? (res.message || 'Keputusan tersimpan') : (res.error || 'Gagal'));
      if (res.success) await load();
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  return (
    <OpsLayout title="Approval" subtitle="Refund besar dan aksi sensitif">
      <OpsToast message={toast} onDismiss={() => setToast('')} />
      <OpsConfirm
        open={!!confirm}
        title={confirm?.decision === 'approved' ? 'Setujui permintaan?' : 'Tolak permintaan?'}
        message="Keputusan tercatat di audit log. Refund yang disetujui langsung dieksekusi."
        confirmLabel={confirm?.decision === 'approved' ? 'Setujui' : 'Tolak'}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={decide}
      />
      {gating || (loading && items.length === 0) ? (
        <OpsPageSkeleton variant="table" />
      ) : (
        <div className="space-y-5">
          <OpsPageIntro
            eyebrow="Governance"
            title="Antrean approval"
            description="Refund ≥ Rp 5.000.000, diskon besar, dan penyesuaian keuangan manual menunggu operator kedua."
            actions={
              <>
                <Link href="/platform/finance" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  Finance
                </Link>
                <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Segarkan
                </button>
              </>
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <OpsStat label="Menunggu" value={pendingCount} tone="warning" />
            <OpsStat label="Total berkas" value={items.length} />
          </div>
          <OpsDataTable
            rows={items}
            loading={loading}
            rowKey={(r) => r.id}
            searchPlaceholder="Cari judul, jenis, atau pemohon…"
            exportFileName="humanify-admin-approvals"
            emptyTitle="Tidak ada permintaan"
            filters={[
              {
                id: 'status',
                label: 'Status',
                options: [
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'executed', label: 'Executed' },
                ],
                getValue: (r) => r.status,
              },
            ]}
            columns={[
              {
                id: 'title',
                header: 'Permintaan',
                exportValue: (r) => r.title,
                cell: (r) => (
                  <div>
                    <p className="text-sm font-medium text-slate-900">{r.title}</p>
                    <p className="text-[11px] text-slate-400">{r.kind} · {r.requestedBy || '—'}</p>
                  </div>
                ),
              },
              { id: 'amount', header: 'Nominal', cell: (r) => <span className="text-xs tabular-nums">{idr(r.amountIdr)}</span> },
              {
                id: 'status',
                header: 'Status',
                cell: (r) => (
                  <OpsBadge tone={r.status === 'pending' ? 'warning' : r.status === 'rejected' ? 'danger' : 'success'}>
                    {r.status}
                  </OpsBadge>
                ),
              },
              {
                id: 'act',
                header: '',
                exportOmit: true,
                cell: (r) => r.status === 'pending' ? (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setConfirm({ id: r.id, decision: 'approved' })} className="text-xs font-medium text-emerald-700 hover:underline">Setujui</button>
                    <button type="button" onClick={() => setConfirm({ id: r.id, decision: 'rejected' })} className="text-xs font-medium text-red-700 hover:underline">Tolak</button>
                  </div>
                ) : <span className="text-[11px] text-slate-400">{r.decidedBy || '—'}</span>,
              },
            ]}
          />
        </div>
      )}
    </OpsLayout>
  );
}
