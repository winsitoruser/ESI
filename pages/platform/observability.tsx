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
  const [docStorage, setDocStorage] = useState<any>(null);
  const [alertInfo, setAlertInfo] = useState<any>(null);
  const [alertBusy, setAlertBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [obsRes, healthRes, alertRes, docRes] = await Promise.all([
        fetch('/api/platform/observability').then((r) => r.json()),
        fetch('/api/health?deep=1').then((r) => r.json()).catch(() => null),
        fetch('/api/platform/obs-alerts').then((r) => r.json()).catch(() => null),
        fetch('/api/humanify/docs-storage-health').then((r) => r.json()).catch(() => null),
      ]);
      if (obsRes.success) setObs(obsRes.data);
      if (healthRes) setHealth(healthRes);
      if (alertRes?.success) setAlertInfo(alertRes.data);
      if (docRes?.success) setDocStorage(docRes.data);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  const runAlertCheck = useCallback(async () => {
    setAlertBusy(true);
    try {
      const r = await fetch('/api/platform/obs-alerts', { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      if (j.success) setAlertInfo((prev: any) => ({ ...prev, alert: j.data }));
      await load();
    } finally {
      setAlertBusy(false);
    }
  }, [load]);

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
            <button
              onClick={runAlertCheck}
              disabled={alertBusy}
              className="flex items-center gap-2 text-sm px-3 py-2 border rounded-lg hover:bg-amber-50 text-amber-800 border-amber-200"
            >
              <AlertTriangle className={`w-4 h-4 ${alertBusy ? 'animate-pulse' : ''}`} /> Cek alert
            </button>
            <Link
              href="/platform/email-preview"
              className="flex items-center gap-2 text-sm px-3 py-2 border rounded-lg hover:bg-violet-50 text-violet-800 border-violet-200"
            >
              Preview email
            </Link>
            <button onClick={load} className="flex items-center gap-2 text-sm px-3 py-2 border rounded-lg hover:bg-slate-50 text-slate-700">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {alertInfo?.alert && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${
            alertInfo.alert.triggered
              ? 'border-rose-200 bg-rose-50 text-rose-900'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}>
            <p className="font-semibold">
              Alert: {alertInfo.alert.triggered ? 'SPIKE' : 'OK'} — {alertInfo.alert.message}
            </p>
            <p className="text-[11px] mt-1 opacity-80">
              Threshold {alertInfo.configured?.threshold ?? alertInfo.alert.threshold} /
              {alertInfo.configured?.windowMin ?? alertInfo.alert.windowMin}m
              · email {alertInfo.configured?.email ? 'on' : 'off'}
              · webhook {alertInfo.configured?.webhook ? 'on' : 'off'}
            </p>
            {!alertInfo.configured?.webhook && (
              <p className="text-[11px] mt-1 opacity-70">
                Webhook belum di-set — Discord Incoming Webhook (docs/humanify-ops-alerts.md). Email tetap aktif.
              </p>
            )}
          </div>
        )}

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
            <p className={`text-[11px] mt-1 ${obs?.externalUptime?.configured ? 'text-emerald-700' : 'text-amber-700'}`}>
              External: {obs?.externalUptime?.configured ? 'API key set' : 'manual checklist'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Probe:{' '}
              {!obs?.externalUptime?.lastRun?.present
                ? 'Never'
                : `${obs.externalUptime.lastRun.result || '—'}${obs.externalUptime.lastRun.ageHours != null ? ` · ${obs.externalUptime.lastRun.ageHours}h ago` : ''}`}
            </p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Cpu className="w-3.5 h-3.5 text-amber-600" /> Memory (RSS)</div>
            <p className="text-lg font-bold text-slate-800">{obs?.memory?.rssMb != null ? `${obs.memory.rssMb} MB` : '—'}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Heap {obs?.memory?.heapUsedMb ?? '—'}/{obs?.memory?.heapTotalMb ?? '—'} MB
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Activity className="w-3.5 h-3.5 text-rose-600" /> Requests</div>
            <p className="text-lg font-bold text-slate-800">{obs?.counters?.requests ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {obs?.counters?.errors ?? 0} error · {obs?.counters?.slow ?? 0} slow (&gt;{obs?.slowMs ?? '—'}ms)
            </p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Database className="w-3.5 h-3.5 text-emerald-600" /> Monitoring</div>
            <p className="text-lg font-bold text-emerald-700">
              {obs?.monitorMode === 'internal' || obs?.sentryMode === 'internal' ? 'Internal' : obs?.sentryMode || '—'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Persist: {obs?.persist?.tableReady
                ? `${obs.persist.total ?? 0} rows · ${obs.persist.errors24h ?? 0} err/24h`
                : 'ring only'}
            </p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Database className="w-3.5 h-3.5 text-indigo-600" /> RLS</div>
            <p className="text-lg font-bold text-slate-800">
              {obs?.rlsMode === 'strict' ? 'Strict' : 'Soft'}
              {obs?.rlsRequestBound ? ' + bound' : ''}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Request-bound: {obs?.rlsRequestBound ? 'on' : 'off'}
            </p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Database className="w-3.5 h-3.5 text-slate-500" /> Redis URL</div>
            <p className="text-lg font-bold text-slate-800">{obs?.redisUrl ? 'Set' : '—'}</p>
            <p className="text-[11px] text-slate-400 mt-1">Sentry.io: {obs?.sentryExternalAllowed ? 'opt-in' : 'disabled'}</p>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <p className="text-sm font-semibold text-slate-800">Document storage</p>
            <span className="text-[11px] text-slate-400">GET /api/humanify/docs-storage-health</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Mode</p>
              <p className="font-semibold text-slate-800">{docStorage?.mode || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">S3 ready</p>
              <p className={`font-semibold ${docStorage?.s3Ready ? 'text-emerald-700' : 'text-slate-600'}`}>
                {docStorage ? (docStorage.s3Ready ? 'Yes' : docStorage.s3Configured ? 'Incomplete' : 'Off (local)') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Local writable</p>
              <p className={`font-semibold ${docStorage?.localWritable ? 'text-emerald-700' : 'text-amber-700'}`}>
                {docStorage ? (docStorage.localWritable ? 'Yes' : 'No') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Outside public/</p>
              <p className={`font-semibold ${docStorage?.outsidePublic ? 'text-emerald-700' : 'text-rose-700'}`}>
                {docStorage ? (docStorage.outsidePublic ? 'Yes' : 'Risk') : '—'}
              </p>
            </div>
          </div>
          {docStorage?.localRoot && (
            <p className="text-[11px] text-slate-400 mt-2 font-mono truncate">root: {docStorage.localRoot}</p>
          )}
          {docStorage?.bucket && (
            <p className="text-[11px] text-slate-400 mt-1 font-mono truncate">
              bucket: {docStorage.bucket}{docStorage.endpoint ? ` · ${docStorage.endpoint}` : ''}
            </p>
          )}
        </div>

        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <p className="text-sm font-semibold text-slate-800">DB backup freshness</p>
            <span className="text-[11px] text-slate-400">BACKUP_DIR/latest.sql.gz</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <p className={`font-semibold ${
                obs?.backup?.skipped ? 'text-slate-500'
                  : obs?.backup?.ok ? 'text-emerald-700'
                    : 'text-amber-700'
              }`}>
                {obs?.backup?.skipped ? 'n/a (local)'
                  : obs?.backup?.ok ? 'Fresh'
                    : obs?.backup?.present ? 'Stale'
                      : 'Missing'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Age</p>
              <p className="font-semibold text-slate-800">
                {obs?.backup?.ageHours != null ? `${obs.backup.ageHours}h` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Max age</p>
              <p className="font-semibold text-slate-800">{obs?.backup?.maxAgeHours ?? 36}h</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Size</p>
              <p className="font-semibold text-slate-800">
                {obs?.backup?.sizeMb != null ? `${obs.backup.sizeMb} MB` : '—'}
              </p>
            </div>
          </div>
          {obs?.backup?.reason && !obs.backup.ok && (
            <p className="text-[11px] text-amber-700 mt-2">reason: {obs.backup.reason}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <p className="text-sm font-semibold text-slate-800">Security scorecard</p>
              <span className="text-[11px] text-slate-400">last cron run</span>
            </div>
            <p className={`text-lg font-bold ${
              !obs?.scorecard?.present ? 'text-slate-500'
                : obs.scorecard.seed ? 'text-amber-700'
                  : obs.scorecard.ok ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {!obs?.scorecard?.present ? 'Never'
                : obs.scorecard.seed ? 'Seed'
                  : obs.scorecard.ok ? 'Green' : `Fail · ${obs.scorecard.failedTotal ?? '?'}`}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {obs?.scorecard?.ageHours != null
                ? `${obs.scorecard.ageHours}h ago · ${obs.scorecard.seed ? 'deploy seed' : `${obs.scorecard.passedTotal ?? 0} passed`}`
                : 'Run: npm run security:scorecard'}
            </p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <p className="text-sm font-semibold text-slate-800">Action Inbox digest</p>
              <span className="text-[11px] text-slate-400">last cron run</span>
            </div>
            <p className={`text-lg font-bold ${
              !obs?.actionDigest?.present ? 'text-slate-500'
                : obs.actionDigest.dryRun ? 'text-amber-700' : 'text-emerald-700'
            }`}>
              {!obs?.actionDigest?.present ? 'Never'
                : obs.actionDigest.dryRun
                  ? 'Dry-run'
                  : `${obs.actionDigest.sent ?? 0} sent`}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {obs?.actionDigest?.ageHours != null
                ? `${obs.actionDigest.ageHours}h ago`
                : 'Cron Mon 01:00 UTC'}
            </p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <p className="text-sm font-semibold text-slate-800">Doc soft-deactivate</p>
              <span className="text-[11px] text-slate-400">last cron run</span>
            </div>
            <p className={`text-lg font-bold ${
              !obs?.docExpirySoft?.present ? 'text-slate-500'
                : obs.docExpirySoft.seed ? 'text-amber-700'
                  : obs.docExpirySoft.dryRun ? 'text-amber-700' : 'text-emerald-700'
            }`}>
              {!obs?.docExpirySoft?.present ? 'Never'
                : obs.docExpirySoft.seed
                  ? 'Seed'
                  : obs.docExpirySoft.dryRun
                    ? `Dry · ${obs.docExpirySoft.expiredActive ?? 0}`
                    : `Updated ${obs.docExpirySoft.updated ?? 0}`}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {obs?.docExpirySoft?.ageHours != null
                ? `${obs.docExpirySoft.ageHours}h ago`
                : 'Cron Mon 02:00 UTC'}
            </p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <p className="text-sm font-semibold text-slate-800">Privy webhook</p>
              <span className="text-[11px] text-slate-400">sandbox health</span>
            </div>
            <p className={`text-lg font-bold ${
              obs?.privyWebhook?.mode === 'signed' ? 'text-emerald-700' : 'text-amber-700'
            }`}>
              {obs?.privyWebhook?.mode === 'signed' ? 'Signed' : 'Open'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              table {obs?.privyWebhook?.tableReady ? 'ready' : '—'}
              {' · '}{obs?.privyWebhook?.events24h ?? 0} events/24h
              {obs?.privyWebhook?.lastEventAt
                ? ` · last ${new Date(obs.privyWebhook.lastEventAt).toLocaleString('id-ID')}`
                : ''}
            </p>
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
            <p className="text-sm font-semibold text-slate-800">Event terbaru (live ring + Postgres)</p>
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
