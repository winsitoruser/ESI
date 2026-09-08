import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import OpsLayout from '@/components/humanify/OpsLayout';
import { OpsBadge, OpsPageIntro, OpsPageSkeleton, OpsPanel, OpsToast } from '@/components/humanify/ops-ui';
import { usePlatformOperator } from '@/lib/humanify/use-platform-operator';
import { HUMANIFY_FEATURE_LABELS, HUMANIFY_FEATURE_ORDER } from '@/lib/saas/plan-entitlements';
import { Package, RefreshCw } from 'lucide-react';

/**
 * Admin Total — product / package catalog (read + jump to Billing for edits).
 */
export default function PlatformProductsPage() {
  const { gating } = usePlatformOperator('/platform/products');
  const [catalog, setCatalog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform?action=plan-catalog').then((r) => r.json());
      if (res.success) setCatalog(res.data);
      else setToast(res.error || 'Gagal memuat katalog');
    } catch {
      setToast('Gagal memuat katalog produk');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!gating) load();
  }, [gating, load]);

  const plans = catalog?.plans || [];
  const labels = catalog?.featureLabels || HUMANIFY_FEATURE_LABELS;
  const order = catalog?.featureOrder || HUMANIFY_FEATURE_ORDER;

  return (
    <OpsLayout title="Produk" subtitle="Paket, harga, dan fitur Humanify">
      <OpsToast message={toast} onDismiss={() => setToast('')} />
      {gating || (loading && !catalog) ? (
        <OpsPageSkeleton variant="detail" />
      ) : (
        <div className="space-y-5">
          <OpsPageIntro
            eyebrow="Product"
            title="Katalog paket"
            description="Kontrol produk tanpa menunggu developer: harga dan modul diubah dari Billing. Halaman ini merangkum eligibility & quota."
            actions={
              <>
                <Link href="/platform/billing?tab=plans" className="hf-btn-primary text-xs">
                  Ubah harga & fitur
                </Link>
                <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Segarkan
                </button>
              </>
            }
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {plans.map((p: any) => {
              const features: string[] = p.features || [];
              return (
                <OpsPanel
                  key={p.id || p.planId}
                  title={p.name || p.planId}
                  description={p.description || ''}
                  action={<OpsBadge tone="brand">{p.planId || p.id}</OpsBadge>}
                >
                  <p className="text-lg font-semibold tabular-nums text-slate-900">
                    Rp {Number(p.priceMonthlyIdr || 0).toLocaleString('id-ID')}
                    <span className="text-xs font-normal text-slate-400"> / bulan</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Kuota {p.maxUsers ?? '—'} user · {p.maxEmployees ?? '—'} karyawan
                  </p>
                  <ul className="mt-3 grid grid-cols-2 gap-1.5">
                    {order.map((f: string) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Package className={`h-3 w-3 ${features.includes(f) ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span className={features.includes(f) ? '' : 'text-slate-400 line-through'}>
                          {labels[f] || f}
                        </span>
                      </li>
                    ))}
                  </ul>
                </OpsPanel>
              );
            })}
          </div>
          {plans.length === 0 && (
            <p className="text-sm text-slate-500">Katalog kosong — buka Billing untuk men-seed paket.</p>
          )}
        </div>
      )}
    </OpsLayout>
  );
}
