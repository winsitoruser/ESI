import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Check, CreditCard, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

function formatIdr(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
}

export default function HumanifyBillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [midtransConfigured, setMidtransConfigured] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        fetch('/api/humanify/billing?action=plans').then((r) => r.json()),
        fetch('/api/humanify/billing?action=current').then((r) => r.json()),
      ]);
      if (p.success) {
        setPlans(p.data.plans || []);
        setMidtransConfigured(Boolean(p.data.midtransConfigured));
      }
      if (c.success) setCurrent(c.data);
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
      if (!j.success) throw new Error(j.error || 'Checkout gagal');

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
      toast.error(e.message || 'Checkout gagal');
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
      </Head>
      <HumanifyLayout title="Billing & Upgrade" subtitle="Pilih paket Humanify sesuai kebutuhan HR Anda">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Paket saat ini</p>
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

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setInterval('monthly')}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${interval === 'monthly' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}
            >
              Bulanan
            </button>
            <button
              type="button"
              onClick={() => setInterval('yearly')}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${interval === 'yearly' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}
            >
              Tahunan (−20%)
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const price = interval === 'yearly' ? plan.priceYearlyIdr : plan.priceMonthlyIdr;
              const isCurrent = current?.plan === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`relative bg-white border rounded-2xl p-6 ${isCurrent ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}
                >
                  {plan.id === 'growth' && (
                    <span className="absolute -top-2 right-4 text-[10px] font-bold uppercase bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      Populer
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
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
                    onClick={() => checkout(plan.id)}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {acting === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                    {isCurrent ? 'Paket aktif' : 'Upgrade'}
                  </button>
                </div>
              );
            })}
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
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {current.orders.map((o: any) => (
                      <tr key={o.id}>
                        <td className="py-2 pr-3 font-mono text-xs">{o.order_code}</td>
                        <td className="py-2 pr-3 capitalize">{o.plan}</td>
                        <td className="py-2 pr-3">{formatIdr(o.amount_idr)}</td>
                        <td className="py-2 pr-3">{o.provider}</td>
                        <td className="py-2 capitalize">{o.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-400 text-center">
            Login sebagai {session?.user?.email}. Setelah Midtrans dikonfigurasi, webhook:
            <code className="ml-1 bg-slate-100 px-1 rounded">/api/humanify/billing/webhook</code>
          </p>
        </div>
      </HumanifyLayout>
    </>
  );
}
