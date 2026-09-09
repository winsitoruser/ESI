import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import OpsLayout from '@/components/humanify/OpsLayout';
import {
  OpsBadge, OpsConfirm, OpsPageIntro, OpsPageSkeleton, OpsStat, OpsToast,
} from '@/components/humanify/ops-ui';
import OpsDataTable from '@/components/humanify/OpsDataTable';
import { usePlatformOperator } from '@/lib/humanify/use-platform-operator';
import { LARGE_REFUND_IDR } from '@/lib/saas/platform-approvals';
import { RefreshCw, Wallet } from 'lucide-react';

type Tx = {
  id: string;
  orderCode: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  plan: string | null;
  amountIdr: number;
  status: string;
  provider: string | null;
  paymentType: string | null;
  paidAt: string | null;
  createdAt: string | null;
};

function idr(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}

export default function PlatformFinancePage() {
  const { gating } = usePlatformOperator('/platform/finance');
  const [rows, setRows] = useState<Tx[]>([]);
  const [counts, setCounts] = useState({ paid: 0, pending: 0, failed: 0, refunded: 0, revenueIdr: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform?action=finance-tx').then((r) => r.json());
      if (res.success) {
        setRows(res.data?.rows || []);
        setCounts(res.data?.counts || counts);
      } else setToast(res.error || 'Gagal memuat finance');
    } catch {
      setToast('Gagal memuat finance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!gating) load(); }, [gating, load]);

  const refund = async (id: string) => {
    setActing(id);
    try {
      const res = await fetch('/api/platform?action=finance-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id }),
      }).then((r) => r.json());
      setToast(res.success ? (res.message || 'Refund diproses') : (res.error || 'Gagal refund'));
      if (res.success) await load();
    } finally {
      setActing(null);
      setConfirmId(null);
    }
  };

  return (
    <OpsLayout title="Finance" subtitle="Pendapatan, transaksi, dan refund">
      <OpsToast message={toast} onDismiss={() => setToast('')} />
      <OpsConfirm
        open={!!confirmId}
        title="Proses refund?"
        message={`Transaksi ≥ Rp ${LARGE_REFUND_IDR.toLocaleString('id-ID')} masuk antrean Approval. Di bawah ambang itu langsung ditandai refunded.`}
        confirmLabel="Refund"
        busy={!!acting}
        onCancel={() => setConfirmId(null)}
        onConfirm={() => confirmId && refund(confirmId)}
      />
      {gating || (loading && rows.length === 0) ? (
        <OpsPageSkeleton variant="table" />
      ) : (
        <div className="space-y-5">
          <OpsPageIntro
            eyebrow="Finance"
            title="Transaksi & pendapatan"
            description="Invoice dan voucher tetap di Billing. Refund besar butuh persetujuan kedua."
            actions={
              <>
                <Link href="/platform/approvals" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  Antrean approval
                </Link>
                <Link href="/platform/billing" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  Billing
                </Link>
                <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Segarkan
                </button>
              </>
            }
          />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <OpsStat label="Revenue (paid)" value={idr(counts.revenueIdr)} tone="success" icon={Wallet} />
            <OpsStat label="Paid" value={counts.paid} tone="success" />
            <OpsStat label="Pending" value={counts.pending} tone="warning" />
            <OpsStat label="Gagal" value={counts.failed} tone="danger" />
            <OpsStat label="Refunded" value={counts.refunded} />
          </div>
          <OpsDataTable
            rows={rows}
            loading={loading}
            rowKey={(r) => r.id}
            searchPlaceholder="Cari order, tenant, atau paket…"
            exportFileName="humanify-admin-finance"
            emptyTitle="Belum ada transaksi"
            filters={[
              {
                id: 'status',
                label: 'Status',
                options: [
                  { value: 'paid', label: 'Paid' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'refunded', label: 'Refunded' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'cancel', label: 'Cancel' },
                ],
                getValue: (r) => r.status,
              },
            ]}
            columns={[
              {
                id: 'order',
                header: 'Transaksi',
                exportValue: (r) => r.orderCode || r.id,
                cell: (r) => (
                  <div>
                    <p className="text-sm font-medium text-slate-900">{r.orderCode || r.id.slice(0, 8)}</p>
                    <p className="text-[11px] text-slate-400">{r.provider || '—'}</p>
                  </div>
                ),
              },
              {
                id: 'tenant',
                header: 'Pelanggan',
                cell: (r) => r.tenantId ? (
                  <Link href={`/platform/tenants/${r.tenantId}`} className="text-sm hover:underline">{r.tenantName || r.tenantSlug}</Link>
                ) : <span className="text-sm text-slate-400">—</span>,
              },
              { id: 'plan', header: 'Paket', cell: (r) => <span className="text-xs">{r.plan || '—'}</span> },
              {
                id: 'amount',
                header: 'Nominal',
                cell: (r) => <span className="text-xs tabular-nums">{idr(r.amountIdr)}</span>,
              },
              {
                id: 'method',
                header: 'Metode',
                cell: (r) => <span className="text-[11px] text-slate-500">{r.paymentType || r.provider || '—'}</span>,
              },
              {
                id: 'status',
                header: 'Status',
                cell: (r) => (
                  <OpsBadge tone={r.status === 'paid' ? 'success' : r.status === 'refunded' ? 'warning' : r.status === 'pending' ? 'brand' : 'danger'}>
                    {r.status}
                  </OpsBadge>
                ),
              },
              {
                id: 'refund',
                header: '',
                exportOmit: true,
                cell: (r) => r.status === 'paid' ? (
                  <button
                    type="button"
                    disabled={!!acting}
                    onClick={() => setConfirmId(r.id)}
                    className="text-xs font-medium text-red-700 hover:underline"
                  >
                    Refund
                  </button>
                ) : r.status === 'pending' ? (
                  <button
                    type="button"
                    disabled={!!acting}
                    onClick={async () => {
                      setActing(r.id);
                      try {
                        const res = await fetch('/api/platform?action=billing-sync-midtrans', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ orderCode: r.orderCode || r.id }),
                        }).then((x) => x.json());
                        setToast(res.message || (res.success ? 'Disinkronkan' : res.error));
                        if (res.success) await load();
                      } finally {
                        setActing(null);
                      }
                    }}
                    className="text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline"
                  >
                    Sync Midtrans
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
