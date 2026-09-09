/**
 * Platform ops — Billing control plane
 * Payments · unpaid · vouchers · plan pricing & module access
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import OpsLayout from '@/components/humanify/OpsLayout';
import {
  OpsBadge, OpsPageIntro, OpsPanel, OpsStat, OpsToast, OpsPageSkeleton, OpsConfirm,
} from '@/components/humanify/ops-ui';
import OpsDataTable, { type OpsTableColumn } from '@/components/humanify/OpsDataTable';
import {
  OpsAreaChart, OpsChartCard, OpsPieChart,
} from '@/components/humanify/ops-charts';
import { HUMANIFY_CANONICAL_PRICES_IDR } from '@/lib/saas/plan-entitlements';
import { usePlatformOperator } from '@/lib/humanify/use-platform-operator';
import {
  CreditCard, RefreshCw, Ticket, Package, CheckCircle2,
  XCircle, Wallet, Percent,
} from 'lucide-react';

type Tab = 'overview' | 'payments' | 'unpaid' | 'vouchers' | 'plans';

function idr(n: number | null | undefined) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}

export default function PlatformBillingPage() {
  const { gating } = usePlatformOperator('/platform/billing');
  const router = useRouter();

  const initialTab = (router.query.tab as Tab) || 'overview';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);

  const [summary, setSummary] = useState<any>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any>(null);

  const [voucherForm, setVoucherForm] = useState({
    code: '',
    label: '',
    discountType: 'percent' as 'percent' | 'fixed',
    discountValue: '15',
    maxDiscountIdr: '',
    minAmountIdr: '',
    maxRedemptions: '50',
    validUntil: '',
    applicablePlans: '' as string,
    note: '',
  });
  const [previewCode, setPreviewCode] = useState('');
  const [previewAmount, setPreviewAmount] = useState(String(HUMANIFY_CANONICAL_PRICES_IDR.growth));
  const [previewResult, setPreviewResult] = useState('');

  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [planDraft, setPlanDraft] = useState<any>(null);
  const [seatDraft, setSeatDraft] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, v, cat] = await Promise.all([
        fetch('/api/platform?action=billing-summary').then((r) => r.json()),
        fetch('/api/platform?action=billing-vouchers').then((r) => r.json()),
        fetch('/api/platform?action=plan-catalog').then((r) => r.json()),
      ]);
      if (sum.success) setSummary(sum.data);
      if (v.success) setVouchers(v.data?.vouchers || []);
      if (cat.success) {
        setCatalog(cat.data);
        if (cat.data?.seatPricing) setSeatDraft(cat.data.seatPricing);
      }
    } catch {
      setToast('Gagal memuat billing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!gating) load();
  }, [gating, load]);

  useEffect(() => {
    if (router.query.tab && typeof router.query.tab === 'string') {
      setTab(router.query.tab as Tab);
    }
  }, [router.query.tab]);

  function setTabNav(next: Tab) {
    setTab(next);
    router.replace({ pathname: '/platform/billing', query: { tab: next } }, undefined, { shallow: true });
  }

  async function syncMidtrans(orderCode: string) {
    setActing(`sync-${orderCode}`);
    try {
      const r = await fetch('/api/platform?action=billing-sync-midtrans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderCode }),
      });
      const j = await r.json();
      setToast(j.message || (j.success ? 'Disinkronkan' : j.error));
      if (j.success) load();
    } finally {
      setActing(null);
      setTimeout(() => setToast(''), 3000);
    }
  }

  async function probeGateway() {
    setActing('probe');
    try {
      const r = await fetch('/api/platform?action=midtrans-status&probe=1').then((x) => x.json());
      if (r.success) {
        const p = r.data?.probe;
        setToast(p?.detail || (r.data?.configured ? 'Midtrans terkonfigurasi' : 'Midtrans belum di-set'));
      } else setToast(r.error || 'Gagal probe');
    } finally {
      setActing(null);
      setTimeout(() => setToast(''), 4000);
    }
  }

  async function markPaid(orderCode: string) {
    setActing(orderCode);
    try {
      const r = await fetch('/api/platform?action=billing-mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderCode }),
      });
      const j = await r.json();
      setToast(j.message || (j.success ? 'OK' : j.error));
      if (j.success) load();
    } finally {
      setActing(null);
      setTimeout(() => setToast(''), 3000);
    }
  }

  async function cancelOrder(id: string) {
    setActing(id);
    try {
      const r = await fetch('/api/platform?action=billing-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const j = await r.json();
      setToast(j.message || (j.success ? 'Dibatalkan' : j.error));
      if (j.success) load();
    } finally {
      setActing(null);
      setCancelOrderId(null);
      setTimeout(() => setToast(''), 3000);
    }
  }

  async function createVoucher(e: FormEvent) {
    e.preventDefault();
    setActing('voucher');
    try {
      const plans = voucherForm.applicablePlans
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const r = await fetch('/api/platform?action=billing-voucher-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: voucherForm.code || undefined,
          label: voucherForm.label || undefined,
          discountType: voucherForm.discountType,
          discountValue: Number(voucherForm.discountValue),
          maxDiscountIdr: voucherForm.maxDiscountIdr ? Number(voucherForm.maxDiscountIdr) : null,
          minAmountIdr: voucherForm.minAmountIdr ? Number(voucherForm.minAmountIdr) : 0,
          maxRedemptions: voucherForm.maxRedemptions ? Number(voucherForm.maxRedemptions) : null,
          validUntil: voucherForm.validUntil || null,
          applicablePlans: plans.length ? plans : null,
          note: voucherForm.note || null,
        }),
      });
      const j = await r.json();
      if (j.success) {
        setToast(`Voucher ${j.data?.code} dibuat`);
        setVoucherForm({
          code: '', label: '', discountType: 'percent', discountValue: '15',
          maxDiscountIdr: '', minAmountIdr: '', maxRedemptions: '50', validUntil: '',
          applicablePlans: '', note: '',
        });
        load();
      } else setToast(j.error || 'Gagal buat voucher');
    } finally {
      setActing(null);
      setTimeout(() => setToast(''), 3000);
    }
  }

  async function toggleVoucher(id: string, isActive: boolean) {
    setActing(id);
    try {
      const r = await fetch('/api/platform?action=billing-voucher-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive }),
      });
      const j = await r.json();
      setToast(j.success ? (isActive ? 'Voucher aktif' : 'Voucher nonaktif') : (j.error || 'Gagal'));
      if (j.success) load();
    } finally {
      setActing(null);
      setTimeout(() => setToast(''), 2500);
    }
  }

  async function previewVoucher() {
    const r = await fetch('/api/platform?action=billing-voucher-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: previewCode, amountIdr: Number(previewAmount) || 0, plan: 'growth' }),
    });
    const j = await r.json();
    if (j.success && j.data?.ok) {
      setPreviewResult(`Diskon ${idr(j.data.discountIdr)} → net ${idr(j.data.netIdr)}`);
    } else setPreviewResult(j.data?.error || j.error || 'Gagal');
  }

  function startEditPlan(plan: any) {
    setEditingPlan(plan.id);
    setPlanDraft({
      planId: plan.id,
      name: plan.name,
      description: plan.description,
      priceMonthlyIdr: plan.priceMonthlyIdr,
      priceYearlyIdr: plan.priceYearlyIdr,
      maxUsers: plan.maxUsers,
      maxEmployees: plan.maxEmployees,
      features: [...(plan.features || [])],
    });
  }

  async function saveSeatRates() {
    if (!seatDraft) return;
    setActing('seat-pricing');
    try {
      const r = await fetch('/api/platform?action=seat-pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seatDraft),
      });
      const j = await r.json();
      setToast(j.message || (j.success ? 'Harga per karyawan disimpan' : j.error));
      if (j.success) load();
    } finally {
      setActing(null);
      setTimeout(() => setToast(''), 3000);
    }
  }

  async function savePlan() {
    if (!planDraft) return;
    setActing(planDraft.planId);
    try {
      const r = await fetch('/api/platform?action=plan-catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planDraft),
      });
      const j = await r.json();
      setToast(j.message || (j.success ? 'Paket disimpan' : j.error));
      if (j.success) {
        setEditingPlan(null);
        setPlanDraft(null);
        load();
      }
    } finally {
      setActing(null);
      setTimeout(() => setToast(''), 3000);
    }
  }

  const byStatus = summary?.byStatus || [];
  const unpaid = summary?.unpaid || [];
  const recentPaid = summary?.recentPaid || [];
  const paidTotal = byStatus.find((s: any) => s.status === 'paid');
  const pendingTotal = byStatus
    .filter((s: any) => ['pending', 'unpaid', 'challenge'].includes(s.status))
    .reduce((a: number, s: any) => a + Number(s.amount_idr || 0), 0);
  const pendingCount = byStatus
    .filter((s: any) => ['pending', 'unpaid', 'challenge'].includes(s.status))
    .reduce((a: number, s: any) => a + Number(s.count || 0), 0);

  const statusPie = useMemo(
    () => byStatus.map((s: any) => ({ name: s.status, value: Number(s.count || 0) })),
    [byStatus],
  );
  const revenueArea = useMemo(
    () => (summary?.revenueSeries || []).map((r: any) => ({
      x: r.month,
      y: Number(r.amount_idr || 0),
    })),
    [summary],
  );
  const planMixPie = useMemo(
    () => (summary?.planMix || []).map((r: any) => ({
      name: r.plan,
      value: Number(r.amount_idr || 0),
    })),
    [summary],
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Ringkasan' },
    { id: 'payments', label: 'Pembayaran' },
    { id: 'unpaid', label: 'Belum bayar' },
    { id: 'vouchers', label: 'Voucher' },
    { id: 'plans', label: 'Paket & modul' },
  ];

  if (gating || (loading && !summary)) {
    return (
      <OpsLayout title="Billing" subtitle="Pembayaran, voucher & katalog paket">
        <OpsPageSkeleton />
      </OpsLayout>
    );
  }

  return (
    <OpsLayout title="Billing" subtitle="Pembayaran, voucher & katalog paket">
      <OpsToast message={toast} onDismiss={() => setToast('')} />
      <OpsConfirm
        open={!!cancelOrderId}
        title="Batalkan order"
        message="Order yang dibatalkan tidak bisa ditagihkan ulang otomatis. Pastikan ini bukan pembayaran yang sedang diproses Midtrans."
        confirmLabel="Batalkan order"
        danger
        busy={!!acting}
        onCancel={() => setCancelOrderId(null)}
        onConfirm={() => { if (cancelOrderId) cancelOrder(cancelOrderId); }}
      />

      <OpsPageIntro
        eyebrow="Commercial"
        title="Billing control plane"
        description="Kelola order Midtrans/manual, tagihan outstanding, generate voucher, serta harga & akses modul per paket."
        actions={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Segarkan
          </button>
        }
      />

      {summary?.midtrans && (
        <div className="mb-5 hf-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment gateway</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                Midtrans Snap {summary.midtrans.configured
                  ? (summary.midtrans.isProduction ? '· Production' : '· Sandbox')
                  : '· belum dikonfigurasi'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {summary.midtrans.serverKeyFingerprint ? `Key ${summary.midtrans.serverKeyFingerprint}` : 'Server key kosong'}
                {summary.midtrans.webhookUrl ? ` · webhook ${summary.midtrans.webhookUrl}` : ''}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Iris payout: {summary.midtrans.iris?.configured ? 'API key siap' : 'belum di-set'}
                {summary.midtrans.iris?.merchantConfigured ? ' · merchant key siap' : ''}
                {' · '}auto-transfer tetap off sampai HUMANIFY_PARTNER_AUTO_PAYOUT=true
              </p>
            </div>
            <button
              type="button"
              onClick={probeGateway}
              disabled={acting === 'probe'}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {acting === 'probe' ? 'Mengecek…' : 'Ping Midtrans'}
            </button>
          </div>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <OpsStat label="Paid revenue" value={idr(paidTotal?.amount_idr)} tone="success" icon={Wallet} hint={`${paidTotal?.count || 0} order`} />
        <OpsStat label="Outstanding" value={idr(pendingTotal)} tone="warning" icon={CreditCard} hint={`${pendingCount} order`} />
        <OpsStat label="Voucher aktif" value={vouchers.filter((v) => v.is_active).length} icon={Ticket} hint={`${vouchers.length} total`} />
        <OpsStat label="Paket katalog" value={catalog?.plans?.length || 4} icon={Package} hint="trial–enterprise" />
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto hf-card p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTabNav(t.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition whitespace-nowrap ${
              tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <OpsChartCard title="Order by status" subtitle="Pie · volume order">
              <OpsPieChart data={statusPie} />
            </OpsChartCard>
            <OpsChartCard title="Revenue mix by plan" subtitle="Pie · amount paid">
              <OpsPieChart data={planMixPie} />
            </OpsChartCard>
            <OpsChartCard title="Paid revenue trend" subtitle="Area · 12 bulan" className="lg:col-span-2">
              <OpsAreaChart data={revenueArea} xKey="x" yKey="y" yLabel="Revenue" height={260} />
            </OpsChartCard>
          </div>
          <OpsPanel title="Pembayaran terbaru" description="Order paid — cari, filter, paginasi, export.">
            <BillingOrdersTable rows={recentPaid} loading={loading} empty="Belum ada pembayaran." />
          </OpsPanel>
        </div>
      )}

      {tab === 'payments' && (
        <OpsPanel title="Semua pembayaran (paid)" description="Aktivasi manual sudah tercatat sebagai paid.">
          <BillingOrdersTable rows={recentPaid} loading={loading} empty="Belum ada order paid." />
          <p className="mt-3 text-[11px] text-slate-400">
            Untuk riwayat lengkap per partner, gunakan modul{' '}
            <Link href="/platform/partners" className="underline">Partner</Link>.
          </p>
        </OpsPanel>
      )}

      {tab === 'unpaid' && (
        <OpsPanel
          title="Belum bayar / pending"
          description="Tandai paid (aktivasi plan) atau batalkan order. Export hasil filter."
        >
          <OpsDataTable
            rows={unpaid}
            loading={loading}
            rowKey={(o) => o.id}
            searchPlaceholder="Cari order / tenant / plan / status…"
            exportFileName="humanify-ops-billing-unpaid"
            exportSheetName="Unpaid"
            emptyTitle="Tidak ada order outstanding"
            emptyHint="Semua bersih atau belum ada checkout."
            filters={[
              {
                id: 'status',
                label: 'Semua status',
                getValue: (o) => String(o.status || ''),
                options: [
                  { value: 'pending', label: 'pending' },
                  { value: 'unpaid', label: 'unpaid' },
                  { value: 'challenge', label: 'challenge' },
                  { value: 'expire', label: 'expire' },
                  { value: 'failed', label: 'failed' },
                  { value: 'cancel', label: 'cancel' },
                ],
              },
              {
                id: 'plan',
                label: 'Semua plan',
                getValue: (o) => String(o.plan || '').toLowerCase(),
                options: [
                  { value: 'starter', label: 'starter' },
                  { value: 'growth', label: 'growth' },
                  { value: 'enterprise', label: 'enterprise' },
                ],
              },
            ]}
            columns={[
              {
                id: 'order_code',
                header: 'Order',
                exportWidth: 22,
                exportValue: (o) => o.order_code || '',
                cell: (o) => (
                  <div>
                    <code className="text-xs bg-slate-100 px-1 rounded">{o.order_code}</code>
                    <p className="text-[10px] text-slate-400">
                      {o.created_at ? new Date(o.created_at).toLocaleString('id-ID') : '—'}
                    </p>
                  </div>
                ),
              },
              {
                id: 'tenant',
                header: 'Tenant',
                exportWidth: 24,
                exportValue: (o) => `${o.tenant_name || ''} | /${o.tenant_slug || ''}`,
                cell: (o) => (
                  <div>
                    <p className="font-medium text-slate-800">{o.tenant_name || '—'}</p>
                    <p className="text-[11px] text-slate-400">/{o.tenant_slug || '—'}</p>
                  </div>
                ),
              },
              {
                id: 'plan',
                header: 'Plan',
                exportValue: (o) => `${o.plan || ''} · ${o.interval || ''}`,
                cell: (o) => <span className="capitalize">{o.plan} · {o.interval}</span>,
              },
              {
                id: 'amount_idr',
                header: 'Amount',
                exportValue: (o) => Number(o.amount_idr || 0),
                cell: (o) => <span className="tabular-nums">{idr(o.amount_idr)}</span>,
              },
              {
                id: 'status',
                header: 'Status',
                exportValue: (o) => o.status || '',
                cell: (o) => <OpsBadge tone="warning">{o.status}</OpsBadge>,
              },
              {
                id: 'actions',
                header: 'Aksi',
                align: 'right',
                exportOmit: true,
                searchable: false,
                cell: (o) => (
                  <div className="space-x-1 whitespace-nowrap">
                    <button
                      type="button"
                      disabled={acting === `sync-${o.order_code}`}
                      onClick={() => syncMidtrans(o.order_code)}
                      className="text-[11px] px-2 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {acting === `sync-${o.order_code}` ? '…' : 'Sync Midtrans'}
                    </button>
                    <button
                      type="button"
                      disabled={acting === o.order_code}
                      onClick={() => markPaid(o.order_code)}
                      className="text-[11px] px-2 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {acting === o.order_code ? '…' : 'Mark paid'}
                    </button>
                    <button
                      type="button"
                      disabled={acting === o.id}
                      onClick={() => setCancelOrderId(o.id)}
                      className="text-[11px] px-2 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </OpsPanel>
      )}

      {tab === 'vouchers' && (
        <div className="space-y-4">
          <OpsPanel title="Generate voucher / kode promo" description="Kode dipakai di checkout tenant (ops preview di bawah).">
            <form onSubmit={createVoucher} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm uppercase" placeholder="Kode (kosong = auto)" value={voucherForm.code} onChange={(e) => setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() })} />
              <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Label" value={voucherForm.label} onChange={(e) => setVoucherForm({ ...voucherForm, label: e.target.value })} />
              <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm" value={voucherForm.discountType} onChange={(e) => setVoucherForm({ ...voucherForm, discountType: e.target.value as any })}>
                <option value="percent">Persen (%)</option>
                <option value="fixed">Fixed (IDR)</option>
              </select>
              <input required className="border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Nilai diskon" value={voucherForm.discountValue} onChange={(e) => setVoucherForm({ ...voucherForm, discountValue: e.target.value })} />
              <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Max discount IDR (opsional)" value={voucherForm.maxDiscountIdr} onChange={(e) => setVoucherForm({ ...voucherForm, maxDiscountIdr: e.target.value })} />
              <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Min amount IDR" value={voucherForm.minAmountIdr} onChange={(e) => setVoucherForm({ ...voucherForm, minAmountIdr: e.target.value })} />
              <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="Max redemptions" value={voucherForm.maxRedemptions} onChange={(e) => setVoucherForm({ ...voucherForm, maxRedemptions: e.target.value })} />
              <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm" value={voucherForm.validUntil} onChange={(e) => setVoucherForm({ ...voucherForm, validUntil: e.target.value })} />
              <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm md:col-span-2" placeholder="Plans: starter,growth,enterprise (kosong = semua)" value={voucherForm.applicablePlans} onChange={(e) => setVoucherForm({ ...voucherForm, applicablePlans: e.target.value })} />
              <input className="border border-slate-200 rounded-xl px-3 py-2 text-sm md:col-span-2" placeholder="Catatan internal" value={voucherForm.note} onChange={(e) => setVoucherForm({ ...voucherForm, note: e.target.value })} />
              <button type="submit" disabled={acting === 'voucher'} className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                <Percent className="h-4 w-4" />
                {acting === 'voucher' ? 'Menyimpan…' : 'Buat voucher'}
              </button>
            </form>
            <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
              <div>
                <label className="text-[11px] text-slate-500">Preview kode</label>
                <input className="block border border-slate-200 rounded-lg px-2 py-1.5 text-sm uppercase" value={previewCode} onChange={(e) => setPreviewCode(e.target.value.toUpperCase())} placeholder="KODE" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Amount IDR</label>
                <input className="block border border-slate-200 rounded-lg px-2 py-1.5 text-sm" value={previewAmount} onChange={(e) => setPreviewAmount(e.target.value)} />
              </div>
              <button type="button" onClick={previewVoucher} className="text-xs px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">Preview</button>
              {previewResult && <span className="text-xs text-slate-600">{previewResult}</span>}
            </div>
          </OpsPanel>

          <OpsPanel title="Daftar voucher" description="Cari, filter aktif, paginasi, export CSV/Excel.">
            <OpsDataTable
              rows={vouchers}
              loading={loading}
              rowKey={(v) => v.id}
              searchPlaceholder="Cari kode / label / catatan…"
              exportFileName="humanify-ops-vouchers"
              exportSheetName="Voucher"
              emptyTitle="Belum ada voucher"
              emptyHint="Generate kode di form atas."
              filters={[
                {
                  id: 'active',
                  label: 'Semua status',
                  getValue: (v) => (v.is_active ? 'active' : 'off'),
                  options: [
                    { value: 'active', label: 'Aktif' },
                    { value: 'off', label: 'Nonaktif' },
                  ],
                },
                {
                  id: 'type',
                  label: 'Semua tipe',
                  getValue: (v) => String(v.discount_type || ''),
                  options: [
                    { value: 'percent', label: 'Persen' },
                    { value: 'fixed', label: 'Fixed' },
                  ],
                },
              ]}
              columns={[
                {
                  id: 'code',
                  header: 'Kode',
                  exportWidth: 16,
                  exportValue: (v) => v.code,
                  cell: (v) => (
                    <div>
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-semibold">{v.code}</code>
                      {v.label ? <p className="text-xs text-slate-500 mt-0.5">{v.label}</p> : null}
                    </div>
                  ),
                },
                {
                  id: 'discount',
                  header: 'Diskon',
                  exportValue: (v) =>
                    v.discount_type === 'percent'
                      ? `${v.discount_value}%${v.max_discount_idr != null ? ` max ${v.max_discount_idr}` : ''}`
                      : String(v.discount_value),
                  cell: (v) => (
                    <span className="text-xs text-slate-700">
                      {v.discount_type === 'percent' ? `${v.discount_value}%` : idr(v.discount_value)}
                      {v.max_discount_idr != null ? ` · max ${idr(v.max_discount_idr)}` : ''}
                    </span>
                  ),
                },
                {
                  id: 'redemptions',
                  header: 'Redeem',
                  exportValue: (v) => `${v.redemption_count || 0}/${v.max_redemptions ?? 'unlimited'}`,
                  cell: (v) => (
                    <span className="text-xs tabular-nums">{v.redemption_count}/{v.max_redemptions ?? '∞'}</span>
                  ),
                },
                {
                  id: 'valid_until',
                  header: 'Berlaku s/d',
                  exportValue: (v) => (v.valid_until ? new Date(v.valid_until).toLocaleDateString('id-ID') : ''),
                  cell: (v) => (
                    <span className="text-xs text-slate-500">
                      {v.valid_until ? new Date(v.valid_until).toLocaleDateString('id-ID') : '—'}
                    </span>
                  ),
                },
                {
                  id: 'is_active',
                  header: 'Status',
                  exportValue: (v) => (v.is_active ? 'aktif' : 'off'),
                  cell: (v) => <OpsBadge tone={v.is_active ? 'success' : 'neutral'}>{v.is_active ? 'aktif' : 'off'}</OpsBadge>,
                },
                {
                  id: 'actions',
                  header: 'Aksi',
                  align: 'right',
                  exportOmit: true,
                  searchable: false,
                  cell: (v) => (
                    <button
                      type="button"
                      disabled={acting === v.id}
                      onClick={() => toggleVoucher(v.id, !v.is_active)}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
                    >
                      {v.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  ),
                },
              ]}
            />
          </OpsPanel>
        </div>
      )}

      {tab === 'plans' && (
        <div className="space-y-4">
          <OpsPanel
            title="Harga per karyawan"
            description="Semua paket memakai rate card yang sama. Volume all-units: 251 kursi seluruhnya di tarif 251+."
          >
            {seatDraft ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs text-slate-600">1–250 karyawan (IDR/orang)
                  <input type="number" className="mt-1 block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={seatDraft.pricePerUserIdr} onChange={(e) => setSeatDraft({ ...seatDraft, pricePerUserIdr: Number(e.target.value) })} />
                </label>
                <label className="text-xs text-slate-600">251–1.000 (IDR/orang)
                  <input type="number" className="mt-1 block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={seatDraft.pricePerUserOver250Idr} onChange={(e) => setSeatDraft({ ...seatDraft, pricePerUserOver250Idr: Number(e.target.value) })} />
                </label>
                <label className="text-xs text-slate-600">1.001+ (IDR/orang)
                  <input type="number" className="mt-1 block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={seatDraft.pricePerUserOver1000Idr} onChange={(e) => setSeatDraft({ ...seatDraft, pricePerUserOver1000Idr: Number(e.target.value) })} />
                </label>
                <label className="text-xs text-slate-600">LMS (IDR/orang)
                  <input type="number" className="mt-1 block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={seatDraft.lmsPerUserIdr} onChange={(e) => setSeatDraft({ ...seatDraft, lmsPerUserIdr: Number(e.target.value) })} />
                </label>
                <label className="text-xs text-slate-600">AIMAN Copilot (IDR/bulan)
                  <input type="number" className="mt-1 block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={seatDraft.aiMonthlyIdr} onChange={(e) => setSeatDraft({ ...seatDraft, aiMonthlyIdr: Number(e.target.value) })} />
                </label>
                <label className="text-xs text-slate-600">Diskon tahunan (%)
                  <input type="number" className="mt-1 block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={seatDraft.yearlyDiscountPct} onChange={(e) => setSeatDraft({ ...seatDraft, yearlyDiscountPct: Number(e.target.value) })} />
                </label>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Memuat rate card…</p>
            )}
            <button
              type="button"
              onClick={saveSeatRates}
              disabled={!seatDraft || acting === 'seat-pricing'}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Simpan harga per karyawan
            </button>
          </OpsPanel>

          <OpsPanel
            title="Fitur paket"
            description="Starter / Growth / Enterprise membedakan modul, bukan harga satuan. LMS dan AIMAN dijual sebagai add-on."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {(catalog?.plans || []).map((p: any) => (
                <div key={p.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold capitalize text-slate-900">{p.name}</p>
                      <p className="text-[11px] text-slate-500">{p.description}</p>
                    </div>
                    <OpsBadge tone={p.overridden ? 'brand' : 'neutral'}>{p.overridden ? 'custom' : 'default'}</OpsBadge>
                  </div>
                  <p className="text-sm text-slate-600">{(p.features || []).length} modul termasuk</p>
                  <p className="text-[11px] text-slate-500">Kuota referensi {p.maxUsers} users · {p.maxEmployees} employees</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(p.features || []).map((f: string) => (
                      <span key={f} className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                        {catalog?.featureLabels?.[f] || f}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => startEditPlan(p)}
                    className="mt-3 text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline"
                  >
                    Edit harga & modul →
                  </button>
                </div>
              ))}
            </div>
          </OpsPanel>

          {editingPlan && planDraft && (
            <OpsPanel title={`Edit paket: ${editingPlan}`} description="Centang modul yang termasuk dalam paket.">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs text-slate-600">Nama
                  <input className="mt-1 block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={planDraft.name} onChange={(e) => setPlanDraft({ ...planDraft, name: e.target.value })} />
                </label>
                <label className="text-xs text-slate-600">Harga bulanan (IDR)
                  <input type="number" className="mt-1 block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={planDraft.priceMonthlyIdr} onChange={(e) => setPlanDraft({ ...planDraft, priceMonthlyIdr: Number(e.target.value) })} />
                </label>
                <label className="text-xs text-slate-600">Harga tahunan (IDR)
                  <input type="number" className="mt-1 block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={planDraft.priceYearlyIdr} onChange={(e) => setPlanDraft({ ...planDraft, priceYearlyIdr: Number(e.target.value) })} />
                </label>
                <label className="text-xs text-slate-600">Max users
                  <input type="number" className="mt-1 block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={planDraft.maxUsers} onChange={(e) => setPlanDraft({ ...planDraft, maxUsers: Number(e.target.value) })} />
                </label>
                <label className="text-xs text-slate-600">Max employees
                  <input type="number" className="mt-1 block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={planDraft.maxEmployees} onChange={(e) => setPlanDraft({ ...planDraft, maxEmployees: Number(e.target.value) })} />
                </label>
                <label className="text-xs text-slate-600 md:col-span-2">Deskripsi
                  <textarea className="mt-1 block w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" rows={2} value={planDraft.description} onChange={(e) => setPlanDraft({ ...planDraft, description: e.target.value })} />
                </label>
              </div>
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold text-slate-700">Akses modul</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(catalog?.featureOrder || []).map((f: string) => {
                    const on = planDraft.features.includes(f);
                    return (
                      <label key={f} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer ${on ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...planDraft.features, f]
                              : planDraft.features.filter((x: string) => x !== f);
                            setPlanDraft({ ...planDraft, features: next });
                          }}
                        />
                        <span>{catalog?.featureLabels?.[f] || f}</span>
                        {on ? <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="ml-auto h-3.5 w-3.5 text-slate-300" />}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={savePlan} disabled={acting === planDraft.planId} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                  {acting === planDraft.planId ? 'Menyimpan…' : 'Simpan paket'}
                </button>
                <button type="button" onClick={() => { setEditingPlan(null); setPlanDraft(null); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">
                  Batal
                </button>
              </div>
            </OpsPanel>
          )}

          <OpsPanel title="Matriks akses modul" description="Centang = termasuk di paket (setelah simpan override).">
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-slate-50 text-left text-[11px] uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Modul</th>
                    {(catalog?.plans || []).map((p: any) => (
                      <th key={p.id} className="px-3 py-2 font-semibold capitalize text-center">{p.id}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(catalog?.featureOrder || []).map((f: string) => (
                    <tr key={f}>
                      <td className="px-3 py-2 text-slate-700">{catalog?.featureLabels?.[f] || f}</td>
                      {(catalog?.plans || []).map((p: any) => (
                        <td key={p.id} className="px-3 py-2 text-center">
                          {(p.features || []).includes(f) ? (
                            <CheckCircle2 className="inline h-4 w-4 text-emerald-600" />
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
          </OpsPanel>
        </div>
      )}
    </OpsLayout>
  );
}

function BillingOrdersTable({
  rows,
  empty,
  loading = false,
}: {
  rows: any[];
  empty: string;
  loading?: boolean;
}) {
  const columns: OpsTableColumn<any>[] = useMemo(() => [
    {
      id: 'order_code',
      header: 'Order',
      exportWidth: 22,
      exportValue: (o) => o.order_code || '',
      cell: (o) => (
        <div>
          <code className="text-xs bg-slate-100 px-1 rounded">{o.order_code}</code>
          {o.partner_code && <span className="ml-1 text-[10px] text-slate-400">ref={o.partner_code}</span>}
        </div>
      ),
    },
    {
      id: 'tenant',
      header: 'Tenant',
      exportWidth: 24,
      exportValue: (o) => `${o.tenant_name || ''} | /${o.tenant_slug || ''}`,
      cell: (o) => (
        <div>
          {o.tenant_id ? (
            <Link href={`/platform/tenants/${o.tenant_id}`} className="font-medium text-slate-800 hover:underline">
              {o.tenant_name || '—'}
            </Link>
          ) : (o.tenant_name || '—')}
          <p className="text-[11px] text-slate-400">/{o.tenant_slug || '—'}</p>
        </div>
      ),
    },
    {
      id: 'plan',
      header: 'Plan',
      exportValue: (o) => `${o.plan || ''} · ${o.interval || ''}`,
      cell: (o) => <span className="capitalize">{o.plan} · {o.interval}</span>,
    },
    {
      id: 'amount_idr',
      header: 'Amount',
      exportValue: (o) => Number(o.amount_idr || 0),
      cell: (o) => <span className="tabular-nums">{idr(o.amount_idr)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      exportValue: (o) => o.status || '',
      cell: (o) => <OpsBadge tone={o.status === 'paid' ? 'success' : 'warning'}>{o.status}</OpsBadge>,
    },
    {
      id: 'paid_at',
      header: 'Paid at',
      exportValue: (o) => (o.paid_at ? new Date(o.paid_at).toLocaleString('id-ID') : ''),
      cell: (o) => (
        <span className="text-xs text-slate-500">
          {o.paid_at ? new Date(o.paid_at).toLocaleString('id-ID') : '—'}
        </span>
      ),
    },
  ], []);

  return (
    <OpsDataTable
      rows={rows}
      columns={columns}
      rowKey={(o) => o.id}
      loading={loading}
      searchPlaceholder="Cari order / tenant / plan…"
      exportFileName="humanify-ops-billing-paid"
      exportSheetName="Paid"
      emptyTitle={empty}
      filters={[
        {
          id: 'plan',
          label: 'Semua plan',
          getValue: (o) => String(o.plan || '').toLowerCase(),
          options: [
            { value: 'starter', label: 'starter' },
            { value: 'growth', label: 'growth' },
            { value: 'enterprise', label: 'enterprise' },
          ],
        },
      ]}
    />
  );
}
