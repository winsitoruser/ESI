import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import OpsLayout from '@/components/humanify/OpsLayout';
import {
  OpsBadge,
  OpsEmpty,
  OpsPageIntro,
  OpsPageSkeleton,
  OpsPanel,
  OpsQuickLink,
  OpsStat,
  OpsToast,
} from '@/components/humanify/ops-ui';
import OpsDataTable from '@/components/humanify/OpsDataTable';
import {
  OpsChartCard, OpsPieChart, OpsLineChart, OpsAreaChart,
} from '@/components/humanify/ops-charts';
import { usePlatformOperator } from '@/lib/humanify/use-platform-operator';
import {
  Building2, TrendingUp, HeartPulse, Loader2, RefreshCw, ArrowRight, Users,
  AlertTriangle, Clock, Inbox, HelpingHand, CreditCard, Repeat, Package,
  Target, Wallet, BarChart3,
} from 'lucide-react';

function statusTone(status?: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const s = String(status || '').toLowerCase();
  if (s === 'active') return 'success';
  if (s === 'trial') return 'warning';
  if (s === 'suspended' || s === 'archived') return 'danger';
  return 'neutral';
}

/**
 * Humanify Platform Control Plane — ops command center
 */
export default function PlatformDashboardPage() {
  const { gating } = usePlatformOperator('/platform');

  const [overview, setOverview] = useState<any>(null);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [obs, setObs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [dunningBusy, setDunningBusy] = useState(false);
  const [period, setPeriod] = useState('30d');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, ex, ob] = await Promise.all([
        fetch(`/api/platform?action=overview&period=${encodeURIComponent(period)}`).then((r) => r.json()),
        fetch('/api/platform?action=expiring-trials&days=7').then((r) => r.json()),
        fetch('/api/platform/observability').then((r) => r.json()).catch(() => null),
      ]);
      if (ov.success) setOverview(ov.data);
      if (ex.success) setExpiring(ex.data || []);
      if (ob?.success) setObs(ob.data);
    } catch {
      setToast('Gagal memuat data platform');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (!gating) load();
  }, [gating, load]);

  async function runDunning() {
    setDunningBusy(true);
    try {
      const res = await fetch('/api/platform?action=dunning-scan', { method: 'POST' });
      const j = await res.json();
      setToast(j.success ? (j.message || 'Dunning scan selesai') : (j.error || 'Dunning gagal'));
      if (j.success) load();
    } catch {
      setToast('Dunning gagal');
    } finally {
      setDunningBusy(false);
      setTimeout(() => setToast(''), 3000);
    }
  }

  const m = overview?.metrics || {};
  const s = overview?.summary || overview || {};
  const recent = overview?.recentTenants || [];
  const charts = overview?.charts || {};
  const maxPlanCount = Math.max(1, ...(m.byPlan || []).map((p: any) => p.count || 0));
  const attentionCount =
    expiring.length + Number(m.health?.at_risk || 0) + Number(m.health?.watch || 0);

  const planPie = (charts.byPlan || m.byPlan || []).map((p: any) => ({
    name: p.name || p.plan,
    value: Number(p.count || 0),
  })).filter((d: any) => d.value > 0);

  const statusPie = (charts.statusSeries || []).map((r: any) => ({
    name: r.status,
    value: Number(r.count || 0),
  }));

  const signupLine = (charts.signupSeries || []).map((r: any) => ({
    x: String(r.day || '').slice(5),
    y: Number(r.count || 0),
  }));

  const revenueArea = (charts.revenueSeries || []).map((r: any) => ({
    x: r.month,
    y: Number(r.amountIdr || 0),
  }));

  if (gating || (loading && !overview)) {
    return (
      <OpsLayout title="Ringkasan" subtitle="Command center operasional Humanify">
        <OpsPageSkeleton />
      </OpsLayout>
    );
  }

  return (
    <OpsLayout title="Ringkasan" subtitle="Command center operasional Humanify">
      <OpsToast message={toast} onDismiss={() => setToast('')} />

      <OpsPageIntro
        eyebrow="Admin Total"
        title="Ringkasan platform"
        description="Pantau MRR, pertumbuhan, kesehatan tenant, trial, dan billing — lalu loncat ke modul operasi."
        actions={
          <>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700"
              aria-label="Periode dashboard"
            >
              <option value="today">Hari ini</option>
              <option value="7d">7 hari</option>
              <option value="30d">30 hari</option>
              <option value="90d">Kuartal</option>
              <option value="ytd">Tahun ini</option>
            </select>
            <Link
              href="/platform/billing"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Billing
            </Link>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Segarkan
            </button>
            <button
              type="button"
              onClick={runDunning}
              disabled={dunningBusy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {dunningBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
              Jalankan dunning
            </button>
          </>
        }
      />

      {/* Primary KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <OpsStat
          label="Estimated MRR"
          value={m.mrrFormatted || 'Rp0'}
          hint={`ARR ${m.arrFormatted || '—'} · sumber ${m.mrrSource === 'paid_orders' ? 'paid orders' : 'list price'}`}
          tone="success"
          icon={TrendingUp}
        />
        <OpsStat
          label="Paying tenants"
          value={m.payingTenants ?? 0}
          hint={`Trial → paid ${m.trialToPaidPct ?? 0}% · trial aktif ${m.trialTenants ?? 0}`}
          tone="brand"
          icon={Building2}
        />
        <OpsStat
          label={`Signup ${overview?.period?.label || '7 hari'}`}
          value={s.signupsPeriod ?? s.signups7 ?? 0}
          hint={`7 hari: ${s.signups7 ?? 0} · 30 hari: ${s.signups30 ?? 0} · setup ${s.setup_done ?? 0}`}
          icon={Users}
        />
        <OpsStat
          label="Health mix"
          value={
            <span className="text-base sm:text-lg">
              <span className="text-emerald-700">{m.health?.healthy ?? 0}</span>
              <span className="mx-1 text-slate-300">/</span>
              <span className="text-amber-700">{m.health?.watch ?? 0}</span>
              <span className="mx-1 text-slate-300">/</span>
              <span className="text-red-700">{m.health?.at_risk ?? 0}</span>
            </span>
          }
          hint="healthy / watch / at-risk (non-QA)"
          icon={HeartPulse}
        />
      </div>

      {/* Tenant status strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total', value: s.total_tenants ?? '—', tone: 'default' as const },
          { label: 'Active', value: s.active ?? '—', tone: 'success' as const },
          { label: 'Trial', value: s.trial ?? '—', tone: 'warning' as const },
          { label: 'Suspended', value: s.suspended ?? '—', tone: 'danger' as const },
          { label: 'Archived', value: s.archived ?? 0, tone: 'default' as const },
          { label: 'Karyawan aktif', value: s.activeEmployees ?? '—', tone: 'default' as const },
        ].map((item) => (
          <OpsStat key={item.label} label={item.label} value={item.value} tone={item.tone} />
        ))}
      </div>

      {/* Charts row — Bootstrap-admin style cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OpsChartCard title="Distribusi paket" subtitle="Pie · tenant per plan (non-QA)">
          <OpsPieChart data={planPie.length ? planPie : statusPie} />
        </OpsChartCard>
        <OpsChartCard title="Status lifecycle" subtitle="Pie · active / trial / suspended">
          <OpsPieChart data={statusPie.length ? statusPie : planPie} />
        </OpsChartCard>
        <OpsChartCard title="Signup 30 hari" subtitle="Line · tenant baru per hari">
          <OpsLineChart data={signupLine} xKey="x" yKey="y" yLabel="Signup" />
        </OpsChartCard>
        <OpsChartCard title="Revenue paid" subtitle="Area · jumlah order paid per bulan (12 bln)">
          <OpsAreaChart data={revenueArea} xKey="x" yKey="y" yLabel="Revenue" />
        </OpsChartCard>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Attention queue */}
        <OpsPanel
          className="lg:col-span-2"
          title="Antrean perhatian"
          description={
            attentionCount > 0
              ? `${attentionCount} sinyal yang perlu ditinjau`
              : 'Tidak ada sinyal kritis saat ini'
          }
          action={
            <Link href="/platform/support" className="text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline">
              Buka support
            </Link>
          }
        >
          {expiring.length === 0 && Number(m.health?.at_risk || 0) === 0 ? (
            <OpsEmpty title="Semua tenang" hint="Tidak ada trial ≤7 hari atau tenant at-risk yang menonjol." />
          ) : (
            <div className="space-y-4">
              {expiring.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <p className="text-xs font-semibold text-amber-900">
                      Trial berakhir ≤ 7 hari ({expiring.length})
                    </p>
                  </div>
                  <ul className="divide-y divide-amber-100 overflow-hidden rounded-xl border border-amber-100 bg-amber-50/50">
                    {expiring.slice(0, 8).map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
                        <div className="min-w-0">
                          <Link href={`/platform/tenants/${t.id}`} className="font-semibold text-amber-950 hover:underline">
                            {t.name}
                          </Link>
                          <p className="truncate text-amber-800/70">/{t.slug || '—'}</p>
                        </div>
                        <OpsBadge tone="warning">
                          {t.days_left != null ? `${t.days_left} hari` : 'segera'}
                        </OpsBadge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-center">
                  <p className="text-lg font-semibold text-emerald-800">{m.health?.healthy ?? 0}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-700">Healthy</p>
                </div>
                <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-center">
                  <p className="text-lg font-semibold text-amber-800">{m.health?.watch ?? 0}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-amber-700">Watch</p>
                </div>
                <div className="rounded-xl bg-red-50 px-3 py-2.5 text-center">
                  <p className="text-lg font-semibold text-red-800">{m.health?.at_risk ?? 0}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-red-700">At risk</p>
                </div>
              </div>
            </div>
          )}
        </OpsPanel>

        {/* System pulse */}
        <OpsPanel
          title="Pulse sistem"
          description="Cuplikan observability"
          action={
            <Link href="/platform/system" className="text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline">
              Status sistem
            </Link>
          }
        >
          {obs ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-xs text-slate-500">Uptime process</span>
                <span className="font-semibold tabular-nums text-slate-800">
                  {obs.uptimeSec != null ? `${Math.floor(obs.uptimeSec / 3600)}j` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-xs text-slate-500">Memory RSS</span>
                <span className="font-semibold tabular-nums text-slate-800">
                  {obs.memory?.rssMb != null ? `${obs.memory.rssMb} MB` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-xs text-slate-500">Error buffer</span>
                <span className="font-semibold tabular-nums text-slate-800">
                  {Array.isArray(obs.recent) ? obs.recent.length : (obs.recentErrors?.length ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-xs text-slate-500">Redis</span>
                <OpsBadge tone={obs.redis?.ok ? 'success' : 'warning'}>
                  {obs.redis?.ok ? 'ok' : 'degraded'}
                </OpsBadge>
              </div>
              <Link
                href="/platform/observability"
                className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline"
              >
                Buka observability <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <OpsEmpty title="Observability belum tersedia" hint="Buka modul Observability untuk probe & alert." />
          )}
        </OpsPanel>
      </div>

      {/* Module shortcuts */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <OpsQuickLink
          href="/platform/clients"
          title="Klien / Perusahaan"
          description="Buat tenant, activate/suspend, ubah plan, support impersonation."
          icon={Building2}
          accent="brand"
        />
        <OpsQuickLink
          href="/platform/billing"
          title="Billing & paket"
          description="Pembayaran, unpaid, voucher, harga & modul akses paket."
          icon={CreditCard}
          accent="emerald"
        />
        <OpsQuickLink
          href="/platform/partners"
          title="Partner channel"
          description="Kode referral, leads, komisi, dan ledger payout."
          icon={HelpingHand}
          accent="amber"
        />
        <OpsQuickLink
          href="/platform/support"
          title="Antrean support"
          description="Trial hampir habis, tagihan unpaid, tenant berisiko, email belum verifikasi."
          icon={Inbox}
          accent="amber"
        />
        <OpsQuickLink
          href="/platform/subscriptions"
          title="Langganan"
          description="Upgrade/downgrade paket, perpanjang trial, pantau renewal dan churn."
          icon={Repeat}
          accent="brand"
        />
        <OpsQuickLink
          href="/platform/products"
          title="Produk & paket"
          description="Katalog harga, kuota, dan fitur — edit di Billing."
          icon={Package}
          accent="slate"
        />
        <OpsQuickLink
          href="/platform/crm"
          title="CRM pipeline"
          description="Lead, demo, proposal, dan perkiraan closing."
          icon={Target}
          accent="brand"
        />
        <OpsQuickLink
          href="/platform/finance"
          title="Finance"
          description="Pendapatan, transaksi, refund, dan approval."
          icon={Wallet}
          accent="emerald"
        />
        <OpsQuickLink
          href="/platform/analytics"
          title="Analytics"
          description="Konversi, ARPU, churn, dan export laporan."
          icon={BarChart3}
          accent="slate"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Plan mix */}
        <OpsPanel
          title="Distribusi plan"
          description="Kontribusi tenant & estimasi MRR per plan"
        >
          {(m.byPlan || []).length === 0 ? (
            <OpsEmpty title="Belum ada distribusi plan" />
          ) : (
            <div className="space-y-2.5">
              {m.byPlan.map((p: any) => (
                <div key={p.plan} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 capitalize text-slate-600">{p.name || p.plan}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[var(--hf-brand-500,#8b5cf6)]"
                      style={{ width: `${Math.round((p.count / maxPlanCount) * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right tabular-nums text-slate-500">{p.count}</span>
                  <span className="w-28 text-right text-xs tabular-nums text-slate-600">{p.mrrFormatted}</span>
                </div>
              ))}
              {m.pricingNote && (
                <p className="pt-2 text-[11px] text-slate-400">{m.pricingNote}</p>
              )}
            </div>
          )}
        </OpsPanel>

        {/* Recent tenants */}
        <OpsPanel
          title="Tenant terbaru"
          description="Signup / perubahan terakhir — cari, paginasi, export"
          action={
            <Link href="/platform/clients" className="text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline">
              Kelola
            </Link>
          }
        >
          <OpsDataTable
            rows={recent}
            loading={loading}
            rowKey={(t) => t.id}
            searchPlaceholder="Cari nama / slug / plan / status…"
            exportFileName="humanify-ops-tenant-terbaru"
            exportSheetName="Tenants"
            emptyTitle="Belum ada tenant"
            defaultPageSize={8}
            pageSizeOptions={[8, 10, 25]}
            filters={[
              {
                id: 'status',
                label: 'Semua status',
                getValue: (t) => String(t.status || ''),
                options: [
                  { value: 'active', label: 'active' },
                  { value: 'trial', label: 'trial' },
                  { value: 'suspended', label: 'suspended' },
                ],
              },
            ]}
            columns={[
              {
                id: 'name',
                header: 'Perusahaan',
                exportWidth: 24,
                exportValue: (t) => `${t.name || ''} | /${t.slug || ''}`,
                cell: (t) => (
                  <div className="min-w-0">
                    <Link
                      href={`/platform/tenants/${t.id}`}
                      className="truncate text-sm font-medium text-slate-900 hover:underline"
                    >
                      {t.name || '—'}
                    </Link>
                    <p className="truncate text-[11px] text-slate-400">/{t.slug || '—'}</p>
                  </div>
                ),
              },
              {
                id: 'subscription_plan',
                header: 'Plan',
                exportValue: (t) => t.subscription_plan || '',
                cell: (t) => <span className="text-xs capitalize text-slate-600">{t.subscription_plan || '—'}</span>,
              },
              {
                id: 'status',
                header: 'Status',
                exportValue: (t) => t.status || '',
                cell: (t) => <OpsBadge tone={statusTone(t.status)}>{t.status || '—'}</OpsBadge>,
              },
              {
                id: 'created_at',
                header: 'Dibuat',
                exportValue: (t) => (t.created_at ? new Date(t.created_at).toLocaleDateString('id-ID') : ''),
                cell: (t) => (
                  <span className="text-xs text-slate-400">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString('id-ID') : '—'}
                  </span>
                ),
              },
            ]}
          />
        </OpsPanel>
      </div>

      {(s.qa_noise > 0 || s.archived > 0) && (
        <div className="hf-tile-nested mt-5 px-4 py-3 text-xs text-[color:var(--hf-ink-muted)]">
          Noise ops: <strong>{s.qa_noise ?? 0}</strong> QA/smoke slug · <strong>{s.archived ?? 0}</strong> archived.
          Bersihkan dari halaman Klien (preview cleanup / archive QA).
        </div>
      )}
    </OpsLayout>
  );
}
