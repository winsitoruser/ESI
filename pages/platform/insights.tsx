import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import OpsLayout from '@/components/humanify/OpsLayout';
import {
  OpsBadge, OpsPageIntro, OpsPageSkeleton, OpsPanel, OpsStat, OpsToast,
} from '@/components/humanify/ops-ui';
import { usePlatformOperator } from '@/lib/humanify/use-platform-operator';
import { RefreshCw } from 'lucide-react';

function idr(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}

type Rec = { id: string; tone: string; title: string; detail: string; href: string };

export default function PlatformInsightsPage() {
  const { gating } = usePlatformOperator('/platform/insights');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform?action=insights').then((r) => r.json());
      if (res.success) setData(res.data);
      else setToast(res.error || 'Gagal memuat insight');
    } catch {
      setToast('Gagal memuat insight');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!gating) load(); }, [gating, load]);

  return (
    <OpsLayout title="Insight" subtitle="Forecast & rekomendasi operasional">
      <OpsToast message={toast} onDismiss={() => setToast('')} />
      {gating || (loading && !data) ? (
        <OpsPageSkeleton variant="detail" />
      ) : (
        <div className="space-y-5">
          <OpsPageIntro
            eyebrow="Intelligence"
            title="Insight bisnis"
            description="Perkiraan revenue dari MRR, sinyal churn, dan rekomendasi tindak lanjut. Bukan model AI — rumus yang bisa diaudit."
            actions={
              <>
                <Link href="/platform/analytics" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  Analytics
                </Link>
                <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Segarkan
                </button>
              </>
            }
          />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <OpsStat label="MRR" value={idr(data?.mrrIdr || 0)} tone="success" />
            <OpsStat label="Forecast 30 hari" value={idr(data?.forecast30Idr || 0)} />
            <OpsStat label="Forecast 90 hari" value={idr(data?.forecast90Idr || 0)} />
            <OpsStat label="Churn watch" value={data?.churnRisk || 0} tone="danger" />
          </div>

          <OpsPanel title="Rekomendasi" description="Tindakan yang bisa diambil hari ini">
            <ul className="space-y-2">
              {(data?.recommendations || []).map((r: Rec) => (
                <li key={r.id}>
                  <Link href={r.href} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{r.title}</p>
                      <p className="text-[11px] text-slate-500">{r.detail}</p>
                    </div>
                    <OpsBadge tone={r.tone === 'danger' ? 'danger' : r.tone === 'warning' ? 'warning' : r.tone === 'success' ? 'success' : 'brand'}>
                      buka
                    </OpsBadge>
                  </Link>
                </li>
              ))}
            </ul>
          </OpsPanel>

          <OpsPanel title="Aktivitas operator" description="Jejak audit terbaru">
            {(data?.recentActions || []).length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada jejak.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {(data?.recentActions || []).map((a: any, i: number) => (
                  <li key={`${a.createdAt}-${i}`} className="flex justify-between gap-3 border-b border-slate-100 py-1.5 last:border-0">
                    <span className="text-slate-800">{a.action}</span>
                    <span className="text-[11px] text-slate-400">{a.actorEmail || '—'}</span>
                  </li>
                ))}
              </ul>
            )}
          </OpsPanel>
        </div>
      )}
    </OpsLayout>
  );
}
