import { useCallback, useEffect, useState } from 'react';
import OpsLayout from '@/components/humanify/OpsLayout';
import {
  OpsPageIntro, OpsPageSkeleton, OpsPanel, OpsStat, OpsToast,
} from '@/components/humanify/ops-ui';
import { usePlatformOperator } from '@/lib/humanify/use-platform-operator';
import { RefreshCw } from 'lucide-react';

function idr(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}

export default function PlatformAnalyticsPage() {
  const { gating } = usePlatformOperator('/platform/analytics');
  const [report, setReport] = useState<any>(null);
  const [period, setPeriod] = useState('30d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ period, from, to });
      const res = await fetch(`/api/platform?action=analytics&${qs}`).then((r) => r.json());
      if (res.success) setReport(res.data);
      else setToast(res.error || 'Gagal memuat laporan');
    } catch {
      setToast('Gagal memuat analytics');
    } finally {
      setLoading(false);
    }
  }, [period, from, to]);

  useEffect(() => { if (!gating) load(); }, [gating, load]);

  const exportCsv = () => {
    if (!report) return;
    const lines = [
      'metric,value',
      `period,${report.period?.label || ''}`,
      `customers_total,${report.customers?.total || 0}`,
      `customers_new,${report.customers?.newInPeriod || 0}`,
      `paid,${report.customers?.paid || 0}`,
      `trial,${report.customers?.trial || 0}`,
      `users_total,${report.users?.total || 0}`,
      `revenue_idr,${report.finance?.revenueIdr || 0}`,
      `conversion_pct,${report.rates?.conversionPct || 0}`,
      `churn_pct,${report.rates?.churnPct || 0}`,
      `arpu_idr,${report.rates?.arpuIdr || 0}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'humanify-admin-analytics.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <OpsLayout title="Analytics" subtitle="KPI bisnis & laporan">
      <OpsToast message={toast} onDismiss={() => setToast('')} />
      {gating || (loading && !report) ? (
        <OpsPageSkeleton variant="detail" />
      ) : (
        <div className="space-y-5">
          <OpsPageIntro
            eyebrow="Reporting"
            title="Analytics bisnis"
            description="Revenue, pertumbuhan, konversi, ARPU, dan churn. Filter periode termasuk rentang tanggal custom."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                  <option value="today">Hari ini</option>
                  <option value="7d">7 hari</option>
                  <option value="30d">30 hari</option>
                  <option value="90d">Kuartal</option>
                  <option value="ytd">Tahun ini</option>
                </select>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-slate-200 px-2 py-1.5 text-xs" aria-label="Dari tanggal" />
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-slate-200 px-2 py-1.5 text-xs" aria-label="Sampai tanggal" />
                <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Terapkan
                </button>
                <button type="button" onClick={exportCsv} className="hf-btn-primary text-xs">Export CSV</button>
              </div>
            }
          />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <OpsStat label="Pelanggan" value={report?.customers?.total || 0} hint={`+${report?.customers?.newInPeriod || 0} periode ini`} />
            <OpsStat label="Paid" value={report?.customers?.paid || 0} tone="success" />
            <OpsStat label="Revenue" value={idr(report?.finance?.revenueIdr || 0)} tone="success" />
            <OpsStat label="ARPU" value={idr(report?.rates?.arpuIdr || 0)} />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <OpsStat label="User terdaftar" value={report?.users?.total || 0} hint={`+${report?.users?.newInPeriod || 0}`} />
            <OpsStat label="Trial" value={report?.customers?.trial || 0} tone="warning" />
            <OpsStat label="Konversi" value={`${report?.rates?.conversionPct || 0}%`} tone="brand" />
            <OpsStat label="Churn" value={`${report?.rates?.churnPct || 0}%`} tone="danger" />
          </div>

          <OpsPanel title="Finance periode" description={report?.period?.label}>
            <dl className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-400">Order paid</dt>
                <dd className="font-semibold tabular-nums">{report?.finance?.paidOrders || 0}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-400">Pending</dt>
                <dd className="font-semibold tabular-nums">{report?.finance?.pendingOrders || 0}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-400">Refunded</dt>
                <dd className="font-semibold tabular-nums">{idr(report?.finance?.refundedIdr || 0)}</dd>
              </div>
            </dl>
          </OpsPanel>
        </div>
      )}
    </OpsLayout>
  );
}
