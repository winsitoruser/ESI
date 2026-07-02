import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '../../../components/hq/HQLayout';
import { ArrowLeft, CreditCard, RefreshCw, ShieldCheck, AlertTriangle, CheckCircle, Building2, Smartphone, Banknote } from 'lucide-react';

interface PreviewItem { type: string; description: string; amount: number; quantity: number }
interface Preview {
  baseAmount: number;
  addonAmount: number;
  overageAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  items: PreviewItem[];
}

const formatIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const providers = [
  { id: 'midtrans', name: 'Midtrans (SNAP)', desc: 'QRIS, VA, Credit Card, E-Wallet', icon: Smartphone },
  { id: 'xendit', name: 'Xendit Invoice', desc: 'VA, Credit Card, E-Wallet, Retail', icon: CreditCard },
  { id: 'manual', name: 'Transfer Manual', desc: 'Transfer bank lalu konfirmasi admin', icon: Banknote }
];

export default function CheckoutPage() {
  const router = useRouter();
  const { planId, interval = 'monthly', addons } = router.query;
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<'midtrans' | 'xendit' | 'manual'>('midtrans');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady || !planId) return;
    const params = new URLSearchParams({
      planId: planId as string,
      interval: interval as string
    });
    if (addons) params.set('addonModuleIds', addons as string);
    fetch(`/api/hq/subscription/checkout?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setPreview(j.data);
        else setError(j.error || 'Gagal memuat preview');
      })
      .finally(() => setLoading(false));
  }, [router.isReady, planId, interval, addons]);

  const submit = async () => {
    if (!planId) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch('/api/hq/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          interval,
          addonModuleIds: typeof addons === 'string' ? addons.split(',').filter(Boolean) : [],
          provider
        })
      });
      const j = await res.json();
      if (!j.success) {
        setError(j.error || 'Checkout gagal');
        return;
      }
      const redirectUrl = j.data?.payment?.redirectUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        router.push('/hq/billing-info');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <HQLayout title="Checkout">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </HQLayout>
    );
  }

  return (
    <HQLayout title="Checkout Langganan">
      <div className="max-w-5xl space-y-6">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold mb-4">Ringkasan Order</h3>
              {preview?.items.map((it, i) => (
                <div key={i} className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{it.description}</p>
                    <p className="text-xs text-gray-500 capitalize">{it.type} × {it.quantity}</p>
                  </div>
                  <span className="font-semibold text-gray-900">{formatIDR(it.amount)}</span>
                </div>
              ))}
            </section>

            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-blue-600" /> Metode Pembayaran</h3>
              <div className="space-y-3">
                {providers.map((p) => {
                  const Icon = p.icon;
                  const selected = provider === p.id;
                  return (
                    <label key={p.id} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="provider" value={p.id} checked={selected} onChange={() => setProvider(p.id as any)} />
                      <Icon className="w-5 h-5 text-blue-600" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.desc}</p>
                      </div>
                      {selected && <CheckCircle className="w-5 h-5 text-blue-600" />}
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Pembayaran Aman</p>
                <p className="text-xs text-blue-600 mt-0.5">Semua pembayaran dienkripsi dan diproses oleh payment gateway resmi (Midtrans / Xendit). Kami tidak pernah menyimpan detail kartu Anda.</p>
              </div>
            </section>
          </div>

          <aside className="bg-white rounded-2xl border border-gray-200 p-6 h-fit sticky top-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Total Pembayaran</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Paket</span><span>{formatIDR(preview?.baseAmount || 0)}</span></div>
              {preview && preview.addonAmount > 0 && <div className="flex justify-between"><span className="text-gray-500">Modul Add-on</span><span>{formatIDR(preview.addonAmount)}</span></div>}
              {preview && preview.overageAmount > 0 && <div className="flex justify-between"><span className="text-gray-500">Overage</span><span>{formatIDR(preview.overageAmount)}</span></div>}
              {preview && preview.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Diskon</span><span>-{formatIDR(preview.discountAmount)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">PPN</span><span>{formatIDR(preview?.taxAmount || 0)}</span></div>
              <div className="pt-3 border-t border-gray-200 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-blue-700">{formatIDR(preview?.totalAmount || 0)}</span>
              </div>
            </div>
            <button onClick={submit} disabled={processing || !preview} className="w-full mt-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-50">
              {processing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Memproses...</> : 'Bayar Sekarang'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">Dengan melanjutkan, Anda setuju dengan Syarat & Ketentuan berlangganan.</p>
          </aside>
        </div>
      </div>
    </HQLayout>
  );
}
