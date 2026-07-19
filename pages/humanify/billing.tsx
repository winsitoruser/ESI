import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Check, CreditCard, Loader2, Sparkles, Download, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';
import { generatePDF } from '@/lib/documents';
import { mapApiJsonError, humanifyErrorMessage } from '@/lib/humanify/api-error';
import {
  HUMANIFY_FEATURE_LABELS,
  HUMANIFY_FEATURE_ORDER,
  HUMANIFY_PLANS,
  type HumanifyPlanId,
} from '@/lib/saas/plan-entitlements';

function formatIdr(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
}

const PLAN_RANK: Record<string, number> = { trial: 0, starter: 1, growth: 2, enterprise: 3 };

export default function HumanifyBillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [midtransConfigured, setMidtransConfigured] = useState(false);
  const [offboarding, setOffboarding] = useState<any>(null);

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
        setMidtransConfigured(Boolean(p.data.midtransConfigured));
      }
      if (c.success) setCurrent(c.data);
      if (ob?.success) setOffboarding(ob.data);
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
    if (router.query.paid === '1') {
      toast.success('Pembayaran diterima — paket akan aktif setelah konfirmasi Midtrans');
      load();
    }
  }, [router.query.paid, load]);

  async function checkout(planId: string) {
    setActing(planId);
    try {
      const res = await fetch('/api/humanify/billing?action=checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, interval }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(mapApiJsonError(j, 'Checkout gagal'));

      const data = j.data;
      if (data.provider === 'midtrans' && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      // Manual path (no Midtrans key yet)
      toast('Order dibuat (manual). Mengaktifkan paket…', { icon: '💳' });
      const conf = await fetch('/api/humanify/billing?action=confirm-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderCode: data.orderCode }),
      });
      const confJ = await conf.json();
      if (!confJ.success) throw new Error(confJ.error || 'Konfirmasi gagal');
      toast.success(`Paket ${planId} aktif`);
      load();
    } catch (e: any) {
      toast.error(humanifyErrorMessage(e, 'Checkout gagal'));
    } finally {
      setActing(null);
    }
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

  if (status === 'loading' || loading) {
    return (
      <HumanifyLayout title="Billing">
        <div className="flex justify-center py-20 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat paket…
        </div>
      </HumanifyLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Billing — {HUMANIFY_BRAND.name}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <HumanifyLayout title="Billing & Upgrade" subtitle="Pilih paket Humanify sesuai kebutuhan HR Anda">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-violet-600 font-semibold">Paket saat ini</p>
                <h2 className="text-2xl font-bold text-slate-900 capitalize">{current?.planName || current?.plan || '—'}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Status tenant: {current?.status || '—'}
                  {current?.subscriptionEnd ? ` · berlaku s/d ${new Date(current.subscriptionEnd).toLocaleDateString('id-ID')}` : ''}
                </p>
              </div>
              <div className="text-xs text-slate-500 max-w-xs text-right">
                {midtransConfigured
                  ? 'Pembayaran via Midtrans Snap'
                  : 'Mode manual aktif (MIDTRANS_SERVER_KEY belum di-set di server)'}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-violet-50/60 px-5 py-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900 mb-1">Kenapa Humanify?</p>
            <p className="text-slate-600">
              Multi-tenant SaaS + Action Inbox + payroll fiscal audit + SSO enterprise — bukan HRIS generik saja.
              Ringkas positioning: lihat{' '}
              <a className="text-violet-700 font-medium hover:underline" href="/humanify/pricing/roi-calculator">
                ROI calculator
              </a>
              {' '}· docs <code className="text-xs bg-white/80 px-1 rounded">humanify-positioning.md</code>
              {' '}· partner channel{' '}
              <a className="text-violet-700 font-medium hover:underline" href="/humanify/partners">
                daftar mitra
              </a>
              {' '}(<code className="text-xs bg-white/80 px-1 rounded">humanify-partner-channel.md</code>).
            </p>
          </div>

          {current && (current.trialExpired || current.trialExpiringSoon || (current.plan === 'trial' && current.trialDaysLeft != null && current.trialDaysLeft <= 14)) && (
            <div className={`rounded-2xl border px-5 py-4 text-sm flex flex-wrap items-center justify-between gap-3 ${
              current.trialExpired ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-950'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  {current.trialExpired
                    ? 'Trial berakhir — pilih paket di bawah untuk mengaktifkan kembali fitur penuh.'
                    : `Trial berakhir dalam ${current.trialDaysLeft} hari (${current.trialEndsAt ? new Date(current.trialEndsAt).toLocaleDateString('id-ID') : '—'}).`}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setInterval('monthly')}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${interval === 'monthly' ? 'bg-violet-600 text-white' : 'bg-white border text-slate-600'}`}
            >
              Bulanan
            </button>
            <button
              type="button"
              onClick={() => setInterval('yearly')}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${interval === 'yearly' ? 'bg-violet-600 text-white' : 'bg-white border text-slate-600'}`}
            >
              Tahunan (−20%)
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const price = interval === 'yearly' ? plan.priceYearlyIdr : plan.priceMonthlyIdr;
              const isCurrent = current?.plan === plan.id;
              const currentRank = PLAN_RANK[current?.plan] ?? 0;
              const isDowngrade = (PLAN_RANK[plan.id] ?? 0) < currentRank;
              return (
                <div
                  key={plan.id}
                  className={`relative bg-white border rounded-2xl p-6 ${isCurrent ? 'border-violet-500 ring-2 ring-violet-100' : 'border-slate-200'}`}
                >
                  {plan.id === 'growth' && (
                    <span className="absolute -top-2 right-4 text-[10px] font-bold uppercase bg-violet-600 text-white px-2 py-0.5 rounded-full">
                      Populer
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                    <h3 className="font-bold text-slate-900">{plan.name}</h3>
                  </div>
                  <p className="text-sm text-slate-500 mb-4 min-h-[40px]">{plan.description}</p>
                  <p className="text-2xl font-bold text-slate-900 mb-1">{formatIdr(price)}</p>
                  <p className="text-xs text-slate-400 mb-4">/{interval === 'yearly' ? 'tahun' : 'bulan'}</p>
                  <ul className="space-y-1.5 mb-6">
                    {(plan.features || []).map((f: string) => (
                      <li key={f} className="text-sm text-slate-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500" /> {f}
                      </li>
                    ))}
                    <li className="text-sm text-slate-600 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500" /> Max {plan.maxEmployees} karyawan
                    </li>
                  </ul>
                  <button
                    type="button"
                    disabled={isCurrent || acting === plan.id}
                    onClick={() => (isDowngrade ? changePlan(plan.id) : checkout(plan.id))}
                    className={`w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 ${
                      isDowngrade
                        ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                        : 'bg-violet-600 text-white hover:bg-violet-700'
                    }`}
                  >
                    {acting === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                    {isCurrent ? 'Paket aktif' : isDowngrade ? 'Turunkan' : 'Upgrade'}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 overflow-x-auto">
            <h3 className="font-semibold text-slate-900 mb-1">Matriks fitur paket</h3>
            <p className="text-sm text-slate-500 mb-4">Perbandingan entitlement — sumber: plan matrix Humanify.</p>
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2 pr-3 font-medium">Fitur</th>
                  {(['starter', 'growth', 'enterprise'] as HumanifyPlanId[]).map((pid) => (
                    <th key={pid} className="py-2 px-2 font-medium capitalize text-center">{HUMANIFY_PLANS[pid].name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HUMANIFY_FEATURE_ORDER.map((feat) => (
                  <tr key={feat} className="border-b border-slate-100">
                    <td className="py-2 pr-3 text-slate-700">{HUMANIFY_FEATURE_LABELS[feat]}</td>
                    {(['starter', 'growth', 'enterprise'] as HumanifyPlanId[]).map((pid) => {
                      const on = HUMANIFY_PLANS[pid].features.includes(feat);
                      return (
                        <td key={pid} className="py-2 px-2 text-center">
                          {on ? (
                            <Check className="w-4 h-4 text-emerald-500 inline-block" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 inline-block" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(current?.orders || []).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h3 className="font-semibold text-slate-900 mb-3">Riwayat order</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-500 border-b">
                    <tr>
                      <th className="py-2 pr-3">Order</th>
                      <th className="py-2 pr-3">Plan</th>
                      <th className="py-2 pr-3">Jumlah</th>
                      <th className="py-2 pr-3">Provider</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {current.orders.map((o: any) => (
                      <tr key={o.id}>
                        <td className="py-2 pr-3 font-mono text-xs">{o.order_code}</td>
                        <td className="py-2 pr-3 capitalize">{o.plan}</td>
                        <td className="py-2 pr-3">{formatIdr(o.amount_idr)}</td>
                        <td className="py-2 pr-3">{o.provider}</td>
                        <td className="py-2 pr-3 capitalize">{o.status}</td>
                        <td className="py-2">
                          {o.status === 'paid' ? (
                            <button
                              type="button"
                              disabled={acting === `inv-${o.order_code}`}
                              onClick={() => downloadInvoice(o.order_code)}
                              className="inline-flex items-center gap-1 text-violet-700 hover:underline text-xs font-medium disabled:opacity-50"
                            >
                              {acting === `inv-${o.order_code}` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              PDF + PPN
                            </button>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white border border-red-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h3 className="font-semibold text-slate-900">Zona berbahaya — Data & penutupan akun</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Ekspor seluruh data karyawan Anda kapan saja, atau jadwalkan penutupan akun (masa tenggang 14 hari, bisa dibatalkan).
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={acting === 'export'}
                onClick={exportAccountData}
                className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                {acting === 'export' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Ekspor data (JSON)
              </button>
              {offboarding?.status === 'requested' ? (
                <>
                  <span className="text-sm text-red-700">
                    Penutupan dijadwalkan
                    {offboarding.graceUntil ? ` · s/d ${new Date(offboarding.graceUntil).toLocaleDateString('id-ID')}` : ''}
                  </span>
                  <button
                    type="button"
                    disabled={acting === 'offboard'}
                    onClick={cancelClose}
                    className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {acting === 'offboard' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Batalkan penutupan
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={acting === 'offboard'}
                  onClick={requestClose}
                  className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {acting === 'offboard' ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  Tutup akun
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center">
            Login sebagai {session?.user?.email}. Setelah Midtrans dikonfigurasi, webhook:
            <code className="ml-1 bg-slate-100 px-1 rounded">/api/humanify/billing/webhook</code>
          </p>
        </div>
      </HumanifyLayout>
    </>
  );
}
