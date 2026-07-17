import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import HQLayout from '@/components/hq/HQLayout';
import {
  ArrowLeft, Activity, Database, Cpu, Clock, RefreshCw, Loader2,
  AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react';

/**
 * Humanify Platform — process observability (Phase 18)
 * Auto-refreshes every 30s.
 */
export default function PlatformObservabilityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = ((session?.user as any)?.role || '').toLowerCase();
  const allowed = role === 'super_admin' || role === 'superadmin' || role === 'platform_admin';

  const [obs, setObs] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [obsRes, healthRes] = await Promise.all([
        fetch('/api/platform/observability').then((r) => r.json()),
        fetch('/api/health?deep=1').then((r) => r.json()).catch(() => null),
      ]);
      if (obsRes.success) setObs(obsRes.data);
      if (healthRes) setHealth(healthRes);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/humanify/login?callbackUrl=/platform/observability');
      return;
    }
    if (status === 'authenticated' && !allowed) {
      router.replace('/humanify');
      return;
    }
    if (status === 'authenticated' && allowed) load();
  }, [status, allowed, load, router]);

  useEffect(() => {
    if (status !== 'authenticated' || !allowed) return;
    timerRef.current = setInterval(load, 30_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, allowed, load]);

  if (status === 'loading' || (status === 'authenticated' && !allowed)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat...
      </div>
    );
  }

  const fmtUptime = (sec: number) => {
    if (!sec && sec !== 0) return '—';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${h}j ${m}m ${s}d`;
  };

  return (
    <HQLayout title="Observability" subtitle="Process health, memory & recent errors" platform="humanify">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link href="/platform" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Platform
          </Link>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {lastRefresh && <span>Update terakhir: {lastRefresh.toLocaleTimeString('id-ID')} · auto-refresh 30s</span>}
            <button onClick={load} className="flex items-center gap-2 text-sm px-3 py-2 border rounded-lg hover:bg-slate-50 text-slate-700">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              {health?.db ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-red-600" />}
              Database
            </div>
            <p className={`text-lg font-bold ${health?.db ? 'text-emerald-700' : 'text-red-700'}`}>
              {health ? (health.db ? 'Connected' : 'Down') : '—'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Latency {health?.dbLatencyMs != null ? `${health.dbLatencyMs}ms` : '—'}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              {obs?.redis?.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-amber-500" />}
              Redis
            </div>
            <p className={`text-lg font-bold ${obs?.redis?.ok ? 'text-emerald-700' : obs?.redis?.configured ? 'text-amber-700' : 'text-slate-500'}`}>
              {!obs?.redis?.configured ? 'Not configured' : obs.redis.ok ? 'Connected' : 'Down'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {obs?.redis?.latencyMs != null ? `${obs.redis.latencyMs}ms` : obs?.redis?.error || '—'}
            </p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Clock className="w-3.5 h-3.5 text-indigo-600" /> Uptime</div>
            <p className="text-lg font-bold text-slate-800">{fmtUptime(obs?.uptimeSec)}</p>
            <p className="text-[11px] text-slate-400 mt-1">PID {obs?.pid ?? '—'} · Node {obs?.node ?? '—'}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Cpu className="w-3.5 h-3.5 text-amber-600" /> Memory (RSS)</div>
            <p className="text-lg font-bold text-slate-800">{obs?.memory?.rssMb != null ? `${obs.memory.rssMb} MB` : '—'}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Heap {obs?.memory?.heapUsedMb ?? '—'}/{obs?.memory?.heapTotalMb ?? '—'} MB
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Activity className="w-3.5 h-3.5 text-rose-600" /> Requests</div>
            <p className="text-lg font-bold text-slate-800">{obs?.counters?.requests ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {obs?.counters?.errors ?? 0} error · {obs?.counters?.slow ?? 0} slow (&gt;{obs?.slowMs ?? '—'}ms)
            </p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Database className="w-3.5 h-3.5 text-indigo-600" /> Integrations</div>
            <p className="text-sm text-slate-700">
              Sentry: {obs?.sentry ? (obs?.sentrySdk ? 'DSN + SDK aktif' : 'DSN diset, SDK belum load') : 'nonaktif'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Redis URL: {obs?.redisUrl ? 'diset' : 'tidak diset'}</p>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm font-semibold text-slate-800 mb-2">Status kode respons</p>
          <div className="flex gap-4 text-sm text-slate-600 flex-wrap">
            {Object.entries(obs?.counters?.byStatus || {}).length === 0 && (
              <span className="text-slate-400">Belum ada data.</span>
            )}
            {Object.entries(obs?.counters?.byStatus || {}).map(([k, v]) => (
              <span key={k} className={`px-2 py-1 rounded ${k === '2xx' ? 'bg-emerald-50 text-emerald-700' : k === '4xx' ? 'bg-amber-50 text-amber-700' : k === '5xx' ? 'bg-red-50 text-red-700' : 'bg-slate-50'}`}>
                {k}: {v as any}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-3">Notifikasi Humanify: SSE ~15s (fallback poll 60s)</p>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-semibold text-slate-800">Event terbaru (error / slow request)</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-2">Waktu</th>
                <th className="px-4 py-2">Level</th>
                <th className="px-4 py-2">Route</th>
                <th className="px-4 py-2">Pesan</th>
                <th className="px-4 py-2 text-right">Durasi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(!obs?.recent || obs.recent.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Belum ada event tercatat.</td></tr>
              )}
              {(obs?.recent || []).map((ev: any) => (
                <tr key={ev.id}>
                  <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">{ev.at ? new Date(ev.at).toLocaleString('id-ID') : '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      ev.level === 'error' ? 'bg-red-100 text-red-700' :
                      ev.level === 'warn' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}>{ev.level}</span>
                  </td>
                  <td className="px-4 py-2 text-xs font-mono text-slate-600">{ev.route || '—'} {ev.method ? `(${ev.method})` : ''}</td>
                  <td className="px-4 py-2 text-xs text-slate-700 max-w-[420px] truncate" title={ev.msg}>{ev.msg}</td>
                  <td className="px-4 py-2 text-xs text-right text-slate-500">{ev.durationMs != null ? `${ev.durationMs}ms` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </HQLayout>
  );
}
