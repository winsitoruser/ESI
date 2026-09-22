import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  Check,
  CreditCard,
  Download,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import HRStatCard from '@/components/humanify/HRStatCard';
import { OpsKpiShell } from '@/components/humanify/OpsPageChrome';
import { PlatformAccessShell } from '@/components/humanify/PlatformAccessNav';
import BillingCheckoutWizard from '@/components/humanify/BillingCheckoutWizard';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';
import { generatePDF } from '@/lib/documents';
import {
  HUMANIFY_FEATURE_LABELS,
  HUMANIFY_FEATURE_ORDER,
  HUMANIFY_PLANS,
  type HumanifyPlanId,
} from '@/lib/saas/plan-entitlements';

function formatIdr(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function statusBadge(status?: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'paid' || s === 'active') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (s === 'pending' || s === 'trial') {
    return 'bg-amber-50 text-amber-800 border-amber-200';
  }
  if (s === 'failed' || s === 'cancelled' || s === 'expired') {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

function BillingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
      <div className="h-24 rounded-[var(--hf-radius-xl)] bg-slate-100" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-[var(--hf-radius-xl)] bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-80 rounded-[var(--hf-radius-xl)] bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

function AiTokenTopupPanel({
  acting,
  setActing,
  openSnap,
  onDone,
  midtransConfigured,
}: {
  acting: string | null;
  setActing: (v: string | null) => void;
  openSnap: (token: string, orderCode: string, redirectUrl?: string | null) => boolean;
  onDone: () => void;
  midtransConfigured: boolean;
}) {
  const [packs, setPacks] = useState(1);
  const sellIdr = packs * 50_000;
  const tokens = packs * 1_000;

  async function buy() {
    setActing('ai-topup');
    try {
      const res = await fetch('/api/humanify/billing?action=ai-token-topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packs }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Gagal buat order token');
      const d = j.data;
      if (d.snapToken) {
        const ok = openSnap(d.snapToken, d.orderCode, d.redirectUrl);
        if (!ok) toast.error('Snap belum siap — refresh halaman lalu coba lagi');
      } else if (d.provider === 'manual') {
        toast.success(`Order ${d.orderCode} dibuat (${formatIdr(d.amountIdr)}). Konfirmasi pembayaran via support.`);
        onDone();
      } else {
        toast.error('Checkout token gagal — Midtrans belum tersedia');
      }
    } catch (e: any) {
      toast.error(e.message || 'Gagal top-up token');
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-3 rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-white p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium text-[color:var(--hf-ink-muted)]">
          Jumlah pak (1 pak = 1.000 token)
          <input
            type="number"
            min={1}
            max={100}
            value={packs}
            onChange={(e) => setPacks(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
            className="hf-input mt-1 block w-28 text-sm"
          />
        </label>
        <div className="flex-1 text-sm text-[color:var(--hf-ink-secondary)]">
          <p className="font-semibold tabular-nums text-[color:var(--hf-ink)]">{formatIdr(sellIdr)}</p>
          <p className="text-xs">{tokens.toLocaleString('id-ID')} token · Rp 50.000 / 1.000</p>
        </div>
        <button
          type="button"
          disabled={!!acting}
          onClick={buy}
          className="hf-btn-primary inline-flex items-center gap-1.5 text-sm disabled:opacity-50"
        >
          {acting === 'ai-topup' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          Beli token
        </button>
      </div>
      {!midtransConfigured ? (
        <p className="text-xs text-amber-800">Midtrans belum aktif — order manual akan dibuat untuk konfirmasi ops.</p>
      ) : null}
    </div>
  );
}

export default function HumanifyBillingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [midtransConfigured, setMidtransConfigured] = useState(false);
  const [midtrans, setMidtrans] = useState<any>(null);
  const [offboarding, setOffboarding] = useState<any>(null);
  const [intendedPlan, setIntendedPlan] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fromQuery = typeof router.query.plan === 'string' ? router.query.plan : '';
    let stored = '';
    try { stored = sessionStorage.getItem('humanify.intendedPlan') || ''; } catch { /* ignore */ }
    const plan = fromQuery || stored;
    if (plan && ['starter', 'growth', 'enterprise'].includes(plan)) setIntendedPlan(plan);
  }, [router.query.plan]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, ob] = await Promise.all([
        fetch('/api/humanify/billing?action=plans').then((r) => r.json()),
        fetch('/api/humanify/billing?action=current').then((r) => r.json()),
        fetch('/api/humanify/account?action=offboarding-status').then((r) => r.json()).catch(() => null),
      ]);
      if (p.success) {
        setPlans(p.data.plans || []);
        setMidtransConfigured(Boolean(p.data.midtransConfigured || p.data.midtrans?.configured));
        if (p.data.midtrans) setMidtrans(p.data.midtrans);
      }
      if (c.success) {
        setCurrent(c.data);
        if (c.data && !p.data?.midtrans) {
          setMidtransConfigured(Boolean(c.data.configured || c.data.midtransConfigured));
          setMidtrans((prev: any) => prev || {
            configured: c.data.configured,
            clientKey: c.data.clientKey,
            isProduction: c.data.isProduction,
            snapJsUrl: c.data.snapJsUrl,
            methods: c.data.methods,
          });
        }
      }
      if (ob?.success) setOffboarding(ob.data);
      fetch('/api/humanify/go-live?action=ack-billing', { method: 'POST' }).catch(() => {});
    } catch {
      toast.error('Gagal memuat billing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`${HUMANIFY_BRAND.loginPath}?callbackUrl=/humanify/billing`);
      return;
    }
    if (status === 'authenticated') load();
  }, [status, load, router]);

  useEffect(() => {
    if (router.query.paid !== '1' || status !== 'authenticated') return;
    toast.success('Kembali dari Midtrans — menyinkronkan status pembayaran…');
    (async () => {
      try {
        const c = await fetch('/api/humanify/billing?action=current').then((r) => r.json());
        const pending = (c.data?.orders || []).find((o: any) => o.status === 'pending');
        if (pending?.order_code) {
          await fetch('/api/humanify/billing?action=sync-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderCode: pending.order_code }),
          });
        }
      } catch { /* still reload */ }
      await load();
    })();
  }, [router.query.paid, status, load]);

  async function syncOrder(orderCode: string) {
    const res = await fetch('/api/humanify/billing?action=sync-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderCode }),
    });
    return res.json();
  }

  function openSnap(token: string, orderCode: string, redirectUrl?: string | null) {
    const snap = (typeof window !== 'undefined' && (window as any).snap) || null;
    if (snap?.pay) {
      snap.pay(token, {
        onSuccess: async () => {
          await syncOrder(orderCode);
          toast.success('Pembayaran berhasil — paket diaktifkan');
          load();
        },
        onPending: async () => {
          await syncOrder(orderCode);
          toast('Menunggu pembayaran (VA/QRIS). Status akan update otomatis.', { icon: '⏳' });
          load();
        },
        onError: () => toast.error('Pembayaran gagal atau ditolak'),
        onClose: () => setActing(null),
      });
      return true;
    }
    if (redirectUrl) {
      window.location.href = redirectUrl;
      return true;
    }
    return false;
  }

  async function changePlan(planId: string) {
    if (!window.confirm(`Turunkan paket ke ${planId}? Perubahan berlaku segera.`)) return;
    setActing(planId);
    try {
      const res = await fetch('/api/humanify/billing?action=change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.data?.message || j.error || 'Ubah paket gagal');
      toast.success(j.message || `Paket diubah ke ${planId}`);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Ubah paket gagal');
    } finally {
      setActing(null);
    }
  }

  async function downloadInvoice(orderCode: string) {
    setActing(`inv-${orderCode}`);
    try {
      const res = await fetch(`/api/humanify/billing?action=invoice&orderCode=${encodeURIComponent(orderCode)}`);
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Gagal memuat invoice');
      const inv = j.data;
      const blob = await generatePDF({
        type: 'invoice',
        format: 'pdf',
        company: inv.company,
        meta: {
          documentNumber: inv.documentNumber,
          documentDate: inv.paidAt || inv.createdAt,
          createdBy: 'Humanify Billing',
          createdAt: new Date().toISOString(),
          tenantId: String((session?.user as any)?.tenantId || ''),
          notes: inv.notes,
        },
        data: {
          customerName: inv.customer.name,
          customerAddress: inv.customer.address,
          customerPhone: inv.customer.phone,
          customerNPWP: inv.customer.npwp,
          items: inv.items,
          subtotal: inv.money.subtotal,
          tax: inv.money.tax,
          taxRate: inv.money.taxRate,
          total: inv.money.total,
          paymentTerms: inv.paidAt,
          bankInfo: `Dibayar via ${inv.provider || 'manual'} · Order ${inv.orderCode}`,
        },
        options: { language: 'id', currency: 'IDR', includeHeader: true, includeFooter: true },
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${inv.documentNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Invoice PDF diunduh');
    } catch (e: any) {
      toast.error(e.message || 'Gagal unduh invoice');
    } finally {
      setActing(null);
    }
  }

  async function exportAccountData() {
    setActing('export');
    try {
      const res = await fetch('/api/humanify/account?action=export');
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Ekspor gagal');
      const blob = new Blob([JSON.stringify(j.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `humanify-account-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Data diekspor (${j.data?.employees?.count ?? 0} karyawan)`);
    } catch (e: any) {
      toast.error(e.message || 'Ekspor gagal');
    } finally {
      setActing(null);
    }
  }

  async function requestClose() {
    const reason = window.prompt('Alasan menutup akun (opsional):') ?? '';
    if (!window.confirm('Jadwalkan penutupan akun? Anda punya masa tenggang 14 hari untuk membatalkan.')) return;
    setActing('offboard');
    try {
      const res = await fetch('/api/humanify/account?action=request-offboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Gagal');
      setOffboarding(j.data);
      toast.success(j.message || 'Penutupan akun dijadwalkan');
    } catch (e: any) {
      toast.error(e.message || 'Gagal');
    } finally {
      setActing(null);
    }
  }

  async function cancelClose() {
    setActing('offboard');
    try {
      const res = await fetch('/api/humanify/account?action=cancel-offboarding', { method: 'POST' });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Gagal');
      setOffboarding(j.data);
      toast.success(j.message || 'Penutupan dibatalkan');
    } catch (e: any) {
      toast.error(e.message || 'Gagal');
    } finally {
      setActing(null);
    }
  }

  const planName = current?.planName || current?.plan || '—';
  const subEnd = current?.subscriptionEnd
    ? new Date(current.subscriptionEnd).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';
  const paidOrders = (current?.orders || []).filter((o: any) => o.status === 'paid').length;

  if (status === 'loading' || loading) {
    return (
      <HumanifyLayout title="Billing">
        <BillingSkeleton />
      </HumanifyLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Billing — {HUMANIFY_BRAND.name}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      {midtrans?.snapJsUrl && midtrans?.clientKey && (
        <Script
          src={midtrans.snapJsUrl}
          data-client-key={midtrans.clientKey}
          strategy="afterInteractive"
        />
      )}
      <HumanifyLayout title="Billing & Upgrade" subtitle="Kelola paket langganan Humanify">
        <PlatformAccessShell
          current="billing"
          title="Billing & Upgrade"
          subtitle="Pilih paket, masukkan jumlah user yang dibeli, lalu bayar via Midtrans."
          icon={CreditCard}
          actions={
            <Link
              href="/humanify/pricing/roi-calculator"
              className="hf-btn-secondary inline-flex items-center gap-1.5 text-sm"
            >
              Hitung ROI
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <OpsKpiShell>
            <HRStatCard
              label="Paket aktif"
              value={String(planName).replace(/^\w/, (c) => c.toUpperCase())}
              sub={`Status: ${current?.status || '—'}`}
              icon={Sparkles}
              accent="violet"
            />
            </OpsKpiShell>
            <OpsKpiShell>
            <HRStatCard
              label="Token AIMAN"
              value={
                current?.aiTokens
                  ? Number(current.aiTokens.balance || 0).toLocaleString('id-ID')
                  : '—'
              }
              sub={
                current?.aiTokens
                  ? `Terpakai ${Number(current.aiTokens.used || 0).toLocaleString('id-ID')}${
                      current.aiTokens.topupRequired ? ' · perlu top-up' : ''
                    }`
                  : 'Aktifkan add-on AIMAN'
              }
              icon={Sparkles}
              accent="cyan"
            />
            </OpsKpiShell>
            <OpsKpiShell>
            <HRStatCard
              label="Berlaku hingga"
              value={subEnd}
              sub={current?.plan === 'trial' && current?.trialDaysLeft != null
                ? `${current.trialDaysLeft} hari trial tersisa`
                : 'Periode langganan'}
              icon={Calendar}
              accent="blue"
            />
            </OpsKpiShell>
            <OpsKpiShell>
            <HRStatCard
              label="Invoice lunas"
              value={paidOrders}
              sub={`${(current?.orders || []).length} order total`}
              icon={CreditCard}
              accent="amber"
            />
            </OpsKpiShell>
          </div>

          {/* Paid modules + AIMAN tokens */}
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="hf-card space-y-4 p-5 sm:p-6">
              <div>
                <p className="hf-section-label">Modul berbayar</p>
                <h3 className="mt-1 text-base font-semibold text-[color:var(--hf-ink)]">Add-on aktif</h3>
                <p className="mt-1 text-sm text-[color:var(--hf-ink-muted)]">
                  ATS, Bank Data, LMS, dan AIMAN dibeli terpisah dari paket inti.
                </p>
              </div>
              <ul className="space-y-2">
                {[
                  current?.paidModules?.ats,
                  current?.paidModules?.talentBank,
                  current?.paidModules?.lms,
                  current?.paidModules?.ai,
                ].filter(Boolean).map((m: any) => (
                  <li
                    key={m.key}
                    className="flex items-center justify-between gap-3 rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-[var(--hf-surface-muted)] px-3 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium text-[color:var(--hf-ink)]">{m.label}</p>
                      <p className="text-xs text-[color:var(--hf-ink-muted)]">
                        {m.monthlyIdr != null
                          ? `${formatIdr(m.monthlyIdr)} / bulan`
                          : `${formatIdr(m.perUserIdr || 0)} / user / bulan`}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        m.enabled
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-500'
                      }`}
                    >
                      {m.enabled ? 'Aktif' : 'Off'}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-[color:var(--hf-ink-faint)]">
                Aktifkan add-on lewat checkout di bawah (centang modul yang dibutuhkan).
              </p>
            </div>

            <div className="hf-card space-y-4 p-5 sm:p-6">
              <div>
                <p className="hf-section-label">AIMAN</p>
                <h3 className="mt-1 text-base font-semibold text-[color:var(--hf-ink)]">Penggunaan token</h3>
                <p className="mt-1 text-sm text-[color:var(--hf-ink-muted)]">
                  Add-on AIMAN termasuk 10.000 token. Setelah pemakaian ≥ 5.000 token tanpa pembelian top-up,
                  Anda perlu membeli token tambahan (Rp 50.000 / 1.000 token).
                </p>
              </div>
              {current?.aiTokens ? (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-[var(--hf-radius-lg)] bg-[var(--hf-brand-50)] px-2 py-3">
                      <p className="text-lg font-semibold tabular-nums text-[color:var(--hf-brand-600)]">
                        {Number(current.aiTokens.balance || 0).toLocaleString('id-ID')}
                      </p>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--hf-ink-muted)]">Saldo</p>
                    </div>
                    <div className="rounded-[var(--hf-radius-lg)] bg-slate-50 px-2 py-3">
                      <p className="text-lg font-semibold tabular-nums text-[color:var(--hf-ink)]">
                        {Number(current.aiTokens.used || 0).toLocaleString('id-ID')}
                      </p>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--hf-ink-muted)]">Terpakai</p>
                    </div>
                    <div className="rounded-[var(--hf-radius-lg)] bg-slate-50 px-2 py-3">
                      <p className="text-lg font-semibold tabular-nums text-[color:var(--hf-ink)]">
                        {Number(current.aiTokens.includedGranted || 0).toLocaleString('id-ID')}
                      </p>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--hf-ink-muted)]">Termasuk</p>
                    </div>
                  </div>
                  {current.aiTokens.topupRequired || current.aiTokens.used >= 4000 ? (
                    <p className={`text-xs ${current.aiTokens.topupRequired ? 'text-rose-700' : 'text-amber-800'}`}>
                      {current.aiTokens.topupRequired
                        ? 'Top-up token diperlukan untuk lanjut memakai AIMAN.'
                        : 'Pemakaian mendekati batas 5.000 — pertimbangkan beli token tambahan.'}
                    </p>
                  ) : null}
                  <AiTokenTopupPanel
                    acting={acting}
                    setActing={setActing}
                    openSnap={openSnap}
                    onDone={() => { void update(); load(); }}
                    midtransConfigured={midtransConfigured}
                  />
                </>
              ) : (
                <p className="text-sm text-[color:var(--hf-ink-muted)]">
                  Belum ada wallet token. Aktifkan add-on AIMAN di checkout untuk mendapat 10.000 token.
                </p>
              )}
            </div>
          </section>

          {current &&
            (current.trialExpired ||
              current.trialExpiringSoon ||
              (current.plan === 'trial' && current.trialDaysLeft != null && current.trialDaysLeft <= 14)) && (
              <div
                className={`flex flex-wrap items-center justify-between gap-3 rounded-[var(--hf-radius-xl)] border px-5 py-4 text-sm ${
                  current.trialExpired
                    ? 'border-rose-200 bg-rose-50 text-rose-950'
                    : 'border-amber-200 bg-amber-50 text-amber-950'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">
                      {current.trialExpired ? 'Trial telah berakhir' : 'Trial hampir habis'}
                    </p>
                    <p className="mt-0.5 text-[color:inherit] opacity-90">
                      {current.trialExpired
                        ? 'Pilih paket di bawah untuk mengaktifkan kembali fitur penuh.'
                        : `Berakhir dalam ${current.trialDaysLeft} hari${
                            current.trialEndsAt
                              ? ` · ${new Date(current.trialEndsAt).toLocaleDateString('id-ID')}`
                              : ''
                          }.`}
                    </p>
                  </div>
                </div>
              </div>
            )}

          {(() => {
            const pending = (current?.orders || []).find(
              (o: any) => o.status === 'pending' && (o.provider === 'midtrans' || o.snap_token),
            );
            if (!pending) return null;
            return (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--hf-radius-xl)] border border-[color:var(--hf-brand-500)]/20 bg-[var(--hf-brand-50)] px-5 py-4 text-sm text-[color:var(--hf-ink)]">
                <div>
                  <p className="font-semibold">Pembayaran menunggu</p>
                  <p className="mt-0.5 text-[color:var(--hf-ink-muted)]">
                    Order <span className="font-mono text-xs">{pending.order_code}</span>
                    {' · '}
                    {formatIdr(pending.amount_idr)}
                    {pending.payment_type ? ` · ${pending.payment_type}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!!acting}
                    onClick={async () => {
                      setActing('sync');
                      try {
                        const j = await syncOrder(pending.order_code);
                        if (j.data?.paid || j.data?.alreadyPaid) toast.success('Pembayaran sudah lunas');
                        else toast('Belum lunas — selesaikan di Midtrans atau cek lagi nanti', { icon: '⏳' });
                        load();
                      } finally {
                        setActing(null);
                      }
                    }}
                    className="hf-btn-secondary inline-flex items-center gap-1.5 text-sm"
                  >
                    {acting === 'sync' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Cek status
                  </button>
                  {(pending.snap_token || pending.redirect_url) && (
                    <button
                      type="button"
                      disabled={!!acting}
                      onClick={() => openSnap(pending.snap_token, pending.order_code, pending.redirect_url)}
                      className="hf-btn-primary inline-flex items-center gap-1.5 text-sm"
                    >
                      <CreditCard className="h-4 w-4" />
                      Lanjutkan bayar
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="space-y-3">
            <div>
              <p className="hf-section-label">Checkout</p>
              <h2 className="mt-1 text-lg font-semibold text-[color:var(--hf-ink)]">Beli langganan per user</h2>
              <p className="mt-1 text-sm text-[color:var(--hf-ink-muted)]">
                Urutan: pilih paket → isi jumlah user → bayar. Satu user = satu karyawan.
              </p>
            </div>
          <BillingCheckoutWizard
            plans={plans}
            currentPlan={current?.plan}
            midtransConfigured={midtransConfigured}
            midtrans={midtrans}
            customerEmail={session?.user?.email}
            initialPlan={intendedPlan}
            initialSeats={current?.billedSeats || undefined}
            initialAddons={current?.addons}
            acting={acting}
            setActing={setActing}
            onPaid={() => { void update(); load(); }}
            onDowngrade={changePlan}
            openSnap={openSnap}
          />
          </div>

          <section className="hf-card overflow-hidden !p-0">
            <div className="border-b border-[var(--hf-border)] px-6 py-5">
              <p className="hf-section-label">Perbandingan</p>
              <h3 className="mt-1 text-base font-semibold text-[color:var(--hf-ink)]">Matriks fitur paket</h3>
              <p className="mt-1 text-sm text-[color:var(--hf-ink-muted)]">
                Entitlement resmi Humanify. ATS (+Rp 2.000/user), Bank Data (+Rp 1.500/user), LMS (+Rp 1.500/user),
                dan AIMAN (+Rp 65.000/bulan + 10.000 token) adalah add-on berbayar.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="bg-[var(--hf-surface-muted)] text-left">
                    <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-muted)]">
                      Fitur
                    </th>
                    {(['starter', 'growth', 'enterprise'] as HumanifyPlanId[]).map((pid) => {
                      const active = current?.plan === pid;
                      return (
                        <th
                          key={pid}
                          className={`px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide ${
                            active
                              ? 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]'
                              : 'text-[color:var(--hf-ink-muted)]'
                          }`}
                        >
                          {HUMANIFY_PLANS[pid].name}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {HUMANIFY_FEATURE_ORDER.map((feat, idx) => (
                    <tr
                      key={feat}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                    >
                      <td className="px-6 py-3 text-[color:var(--hf-ink-secondary)]">
                        {HUMANIFY_FEATURE_LABELS[feat]}
                      </td>
                      {(['starter', 'growth', 'enterprise'] as HumanifyPlanId[]).map((pid) => {
                        const on = HUMANIFY_PLANS[pid].features.includes(feat);
                        const addOn = feat === 'lms' || feat === 'ai' || feat === 'recruitment' || feat === 'talent_bank';
                        const active = current?.plan === pid;
                        return (
                          <td
                            key={pid}
                            className={`px-4 py-3 text-center ${active ? 'bg-[var(--hf-brand-50)]/50' : ''}`}
                          >
                            {on ? (
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50">
                                <Check className="h-3.5 w-3.5 text-[color:var(--hf-success)]" />
                              </span>
                            ) : addOn ? (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--hf-brand-600)]">
                                Add-on
                              </span>
                            ) : (
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100">
                                <X className="h-3.5 w-3.5 text-slate-300" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {(current?.orders || []).length > 0 && (
            <section className="hf-card overflow-hidden !p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hf-border)] px-6 py-5">
                <div>
                  <p className="hf-section-label">Riwayat</p>
                  <h3 className="mt-1 text-base font-semibold text-[color:var(--hf-ink)]">Order & invoice</h3>
                </div>
                <p className="text-xs text-[color:var(--hf-ink-faint)]">
                  Invoice PDF termasuk PPN untuk order lunas
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="bg-[var(--hf-surface-muted)] text-left">
                      <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-muted)]">
                        Order
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-muted)]">
                        Plan
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-muted)]">
                        Jumlah
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-muted)]">
                        Provider
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-muted)]">
                        Status
                      </th>
                      <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-muted)]">
                        Invoice
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.orders.map((o: any) => (
                      <tr key={o.id} className="border-t border-[var(--hf-border-subtle)] hover:bg-slate-50/80">
                        <td className="px-6 py-3 font-mono text-xs text-[color:var(--hf-ink)]">{o.order_code}</td>
                        <td className="px-4 py-3 capitalize text-[color:var(--hf-ink-secondary)]">
                          {o.plan === 'ai_token_topup' ? 'Token AIMAN' : o.plan}
                        </td>
                        <td className="px-4 py-3 tabular-nums font-medium text-[color:var(--hf-ink)]">
                          {formatIdr(o.amount_idr)}
                        </td>
                        <td className="px-4 py-3 capitalize text-[color:var(--hf-ink-muted)]">{o.provider}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize ${statusBadge(o.status)}`}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          {o.status === 'paid' ? (
                            <button
                              type="button"
                              disabled={acting === `inv-${o.order_code}`}
                              onClick={() => downloadInvoice(o.order_code)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--hf-brand-600)] hover:underline disabled:opacity-50"
                            >
                              {acting === `inv-${o.order_code}` ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                              Unduh PDF
                            </button>
                          ) : o.status === 'pending' && (o.snap_token || o.redirect_url) ? (
                            <button
                              type="button"
                              onClick={() => openSnap(o.snap_token, o.order_code, o.redirect_url)}
                              className="text-xs font-semibold text-[color:var(--hf-brand-600)] hover:underline"
                            >
                              Bayar
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="hf-card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--hf-radius)] bg-rose-100 text-rose-700">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="hf-section-label !text-rose-400">Zona berbahaya</p>
                    <h3 className="text-base font-semibold text-[color:var(--hf-ink)]">Data & penutupan akun</h3>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[color:var(--hf-ink-muted)]">
                  Ekspor data karyawan kapan saja, atau jadwalkan penutupan akun dengan masa tenggang 14 hari
                  (bisa dibatalkan).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <button
                  type="button"
                  disabled={acting === 'export'}
                  onClick={exportAccountData}
                  className="hf-btn-secondary inline-flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  {acting === 'export' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Ekspor JSON
                </button>
                {offboarding?.status === 'requested' ? (
                  <>
                    <span className="text-sm text-rose-700">
                      Ditutup
                      {offboarding.graceUntil
                        ? ` s/d ${new Date(offboarding.graceUntil).toLocaleDateString('id-ID')}`
                        : ''}
                    </span>
                    <button
                      type="button"
                      disabled={acting === 'offboard'}
                      onClick={cancelClose}
                      className="inline-flex items-center gap-2 rounded-[var(--hf-radius)] bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {acting === 'offboard' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Batalkan penutupan
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={acting === 'offboard'}
                    onClick={requestClose}
                    className="inline-flex items-center gap-2 rounded-[var(--hf-radius)] bg-[color:var(--hf-danger)] px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {acting === 'offboard' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    Tutup akun
                  </button>
                )}
              </div>
            </div>
          </section>

          <p className="pb-2 text-center text-xs text-[color:var(--hf-ink-faint)]">
            Masuk sebagai {session?.user?.email}
          </p>
        </PlatformAccessShell>
      </HumanifyLayout>
    </>
  );
}
