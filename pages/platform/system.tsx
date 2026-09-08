import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import OpsLayout from '@/components/humanify/OpsLayout';
import { OpsBadge, OpsPageIntro, OpsPageSkeleton, OpsPanel, OpsStat, OpsToast } from '@/components/humanify/ops-ui';
import { usePlatformOperator } from '@/lib/humanify/use-platform-operator';
import { CheckCircle2, RefreshCw, Settings, AlertTriangle, XCircle } from 'lucide-react';

type SystemCheck = {
  id: string;
  label: string;
  ok: boolean;
  warning?: boolean;
  detail: string;
  href?: string;
};

type SystemData = {
  checks: SystemCheck[];
  okCount: number;
  warnCount: number;
  failCount: number;
};

/**
 * Admin Total — platform system scorecard (no secrets).
 */
export default function PlatformSystemPage() {
  const { gating } = usePlatformOperator('/platform/system');
  const [data, setData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform?action=system-status').then((r) => r.json());
      if (res.success) setData(res.data);
      else setToast(res.error || 'Gagal memuat status sistem');
    } catch {
      setToast('Gagal memuat status sistem');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!gating) load();
  }, [gating, load]);

  return (
    <OpsLayout title="Sistem" subtitle="Scorecard infrastruktur platform">
      <OpsToast message={toast} onDismiss={() => setToast('')} />
      {gating || (loading && !data) ? (
        <OpsPageSkeleton variant="detail" />
      ) : (
        <div className="space-y-5">
          <OpsPageIntro
            eyebrow="Infra"
            title="Status sistem"
            description="SMTP, RLS, Redis, backup, dan cron — tanpa menampilkan secret. Untuk probe live, buka Observability."
            actions={
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Segarkan
              </button>
            }
          />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <OpsStat label="Sehat" value={data?.okCount ?? 0} tone="success" icon={CheckCircle2} />
            <OpsStat label="Perhatian" value={data?.warnCount ?? 0} tone="warning" icon={AlertTriangle} />
            <OpsStat label="Gagal" value={data?.failCount ?? 0} tone="danger" icon={XCircle} />
            <OpsStat label="Cek" value={data?.checks?.length ?? 0} icon={Settings} />
          </div>

          <OpsPanel title="Komponen" description="Flag lingkungan dan artefak last-run">
            <ul className="divide-y divide-slate-100">
              {(data?.checks || []).map((c) => (
                <li key={c.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{c.label}</p>
                    <p className="text-xs text-slate-500">{c.detail}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <OpsBadge tone={!c.ok ? 'danger' : c.warning ? 'warning' : 'success'}>
                      {!c.ok ? 'gagal' : c.warning ? 'perhatian' : 'ok'}
                    </OpsBadge>
                    {c.href && (
                      <Link
                        href={c.href}
                        className="text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline"
                      >
                        Detail
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </OpsPanel>
        </div>
      )}
    </OpsLayout>
  );
}
