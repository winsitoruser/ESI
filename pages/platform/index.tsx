import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import PlatformOpsNav from '@/components/humanify/PlatformOpsNav';
import {
  Building2, TrendingUp, HeartPulse, Loader2, RefreshCw, ArrowRight,
} from 'lucide-react';

/**
 * Humanify Platform Control Plane — overview hub (ops)
 */
export default function PlatformDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = ((session?.user as any)?.role || '').toLowerCase();
  const allowed = role === 'super_admin' || role === 'superadmin' || role === 'platform_admin';

  const [overview, setOverview] = useState<any>(null);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, ex] = await Promise.all([
        fetch('/api/platform?action=overview').then((r) => r.json()),
        fetch('/api/platform?action=expiring-trials&days=7').then((r) => r.json()),
      ]);
      if (ov.success) setOverview(ov.data);
      if (ex.success) setExpiring(ex.data || []);
    } catch {
      setToast('Gagal memuat data platform');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/humanify/login?callbackUrl=/platform');
      return;
    }
    if (status === 'authenticated' && !allowed) {
      router.replace('/humanify');
      return;
    }
    if (status === 'authenticated' && allowed) load();
  }, [status, allowed, load, router]);

  const m = overview?.metrics || {};
  const s = overview?.summary || overview || {};
  const maxPlanCount = Math.max(1, ...(m.byPlan || []).map((p: any) => p.count || 0));

  if (status === 'loading' || (status === 'authenticated' && !allowed)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat...
      </div>
    );
  }

  return (
    <HumanifyLayout title="Platform Control Plane" subtitle="Humanify SaaS — ringkasan operasional">
      <div className="space-y-6">
        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow">{toast}</div>
        )}

        <PlatformOpsNav />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wide text-[color:var(--hf-brand-600)] font-semibold">Ops · Control Plane</p>
            <h2 className="text-lg font-semibold text-slate-900">MRR, kesehatan tenant & pintu masuk ops</h2>
          </div>
          <button onClick={load} className="flex items-center gap-2 text-sm px-3 py-2 border rounded-lg hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link href="/platform/clients" className="bg-white border rounded-xl p-4 hover:border-[var(--hf-brand-200)] transition-colors group">
            <div className="flex items-center justify-between">
              <Building2 className="w-5 h-5 text-[color:var(--hf-brand-600)]" />
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[color:var(--hf-brand-600)]" />
            </div>
            <p className="mt-3 font-semibold text-slate-900">Klien / Perusahaan</p>
            <p className="text-xs text-slate-500 mt-1">List tenant, buat klien, activate / suspend / support</p>
          </Link>
          <Link href="/platform/partners" className="bg-white border rounded-xl p-4 hover:border-[var(--hf-brand-200)] transition-colors group">
            <div className="flex items-center justify-between">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600" />
            </div>
            <p className="mt-3 font-semibold text-slate-900">Partner & Billing</p>
            <p className="text-xs text-slate-500 mt-1">Referral codes, leads, komisi, payout ledger</p>
          </Link>
          <Link href="/platform/observability" className="bg-white border rounded-xl p-4 hover:border-[var(--hf-brand-200)] transition-colors group">
            <div className="flex items-center justify-between">
              <HeartPulse className="w-5 h-5 text-amber-600" />
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600" />
            </div>
            <p className="mt-3 font-semibold text-slate-900">Observability</p>
            <p className="text-xs text-slate-500 mt-1">Health events, alerts, probe internal</p>
          </Link>
        </div>

        {expiring.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-900 mb-2">Trial berakhir ≤ 7 hari ({expiring.length})</p>
            <ul className="text-xs text-amber-900 space-y-1 max-h-28 overflow-y-auto">
              {expiring.map((t) => (
                <li key={t.id}>
                  <Link href={`/platform/tenants/${t.id}`} className="font-medium hover:underline">{t.name}</Link>
                  {' · '}/{t.slug || '—'}
                  {' · '}{t.days_left != null ? `${t.days_left}h` : '—'}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Estimated MRR
            </div>
            <p className="text-xl font-bold text-emerald-700">{m.mrrFormatted || 'Rp0'}</p>
            <p className="text-[11px] text-slate-400 mt-1">ARR {m.arrFormatted || '—'}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-2xl font-bold">{m.payingTenants ?? 0}</p>
            <p className="text-xs text-slate-500">Paying tenants</p>
            <p className="text-[11px] text-slate-400 mt-1">Trial → paid {m.trialToPaidPct ?? 0}%</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-2xl font-bold">{s.signups7 ?? 0}</p>
            <p className="text-xs text-slate-500">Signup 7 hari</p>
            <p className="text-[11px] text-slate-400 mt-1">30 hari: {s.signups30 ?? 0}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <HeartPulse className="w-3.5 h-3.5 text-[color:var(--hf-brand-600)]" /> Health mix
            </div>
            <p className="text-sm font-medium text-slate-800">
              <span className="text-emerald-600">{m.health?.healthy ?? 0} healthy</span>
              {' · '}
              <span className="text-amber-600">{m.health?.watch ?? 0} watch</span>
              {' · '}
              <span className="text-red-600">{m.health?.at_risk ?? 0} risk</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{s.total_tenants ?? 0} tenant total</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white border rounded-xl p-4">
            <p className="text-2xl font-bold">{s.total_tenants ?? '—'}</p>
            <p className="text-xs text-slate-500">Total tenant</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-2xl font-bold text-emerald-600">{s.active ?? '—'}</p>
            <p className="text-xs text-slate-500">Active</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-2xl font-bold text-amber-600">{s.trial ?? '—'}</p>
            <p className="text-xs text-slate-500">Trial</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-2xl font-bold text-red-600">{s.suspended ?? '—'}</p>
            <p className="text-xs text-slate-500">Suspended</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-2xl font-bold">{s.activeEmployees ?? '—'}</p>
            <p className="text-xs text-slate-500">Karyawan aktif (all)</p>
          </div>
        </div>

        {(s.archived != null || s.qa_noise != null) && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-slate-50 border rounded-xl p-4">
              <p className="text-2xl font-bold text-slate-500">{s.archived ?? 0}</p>
              <p className="text-xs text-slate-500">Archived</p>
            </div>
            <div className="bg-slate-50 border rounded-xl p-4">
              <p className="text-2xl font-bold text-slate-500">{s.qa_noise ?? 0}</p>
              <p className="text-xs text-slate-500">QA/smoke noise</p>
            </div>
          </div>
        )}

        {(m.byPlan || []).length > 0 && (
          <div className="bg-white border rounded-xl p-4">
            <p className="text-sm font-semibold text-slate-800 mb-3">Distribusi plan & kontribusi MRR</p>
            <div className="space-y-2">
              {m.byPlan.map((p: any) => (
                <div key={p.plan} className="flex items-center gap-3 text-sm">
                  <span className="w-24 text-slate-600 capitalize">{p.name || p.plan}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--hf-brand-500)] rounded-full"
                      style={{ width: `${Math.round((p.count / maxPlanCount) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-slate-500">{p.count}</span>
                  <span className="w-28 text-right text-xs text-slate-600">{p.mrrFormatted}</span>
                </div>
              ))}
            </div>
            {m.pricingNote && (
              <p className="text-[11px] text-slate-400 mt-3">{m.pricingNote}</p>
            )}
          </div>
        )}

        <div className="bg-[var(--hf-brand-50)] border border-[var(--hf-brand-100)] rounded-xl p-4 text-sm text-[color:var(--hf-brand-600)] flex flex-wrap items-center justify-between gap-2">
          <span>
            Kelola klien di <Link href="/platform/clients" className="underline font-medium">/platform/clients</Link>
            {' · '}signup publik: <code className="bg-white/70 px-1 rounded">/humanify/signup?ref=CODE</code>
          </span>
          <Link href="/platform/clients" className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
            Buka daftar klien <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </HumanifyLayout>
  );
}
