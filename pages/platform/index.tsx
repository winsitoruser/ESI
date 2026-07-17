import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import HQLayout from '@/components/hq/HQLayout';
import {
  Building2, Users, Briefcase, Search, ExternalLink,
  CheckCircle2, PauseCircle, Clock, Loader2, RefreshCw, TrendingUp, HeartPulse, Eye,
  Activity, ClipboardList, Archive,
} from 'lucide-react';

/**
 * Humanify Platform Control Plane — MRR + tenant ops (Phase 3)
 */
export default function PlatformDashboardPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const role = ((session?.user as any)?.role || '').toLowerCase();
  const allowed = role === 'super_admin' || role === 'superadmin' || role === 'platform_admin';

  const [overview, setOverview] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [expiring, setExpiring] = useState<any[]>([]);
  const [dunningBusy, setDunningBusy] = useState(false);
  const [partners, setPartners] = useState<any[]>([]);
  const [partnerForm, setPartnerForm] = useState({ code: '', name: '', contactEmail: '' });
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ action: 'tenants', status: filterStatus, search });
      const [ov, tn, ex, pn] = await Promise.all([
        fetch('/api/platform?action=overview').then((r) => r.json()),
        fetch(`/api/platform?${q}`).then((r) => r.json()),
        fetch('/api/platform?action=expiring-trials&days=7').then((r) => r.json()),
        fetch('/api/platform?action=partners').then((r) => r.json()),
      ]);
      if (ov.success) setOverview(ov.data);
      if (tn.success) setTenants(tn.data?.tenants || []);
      if (ex.success) setExpiring(ex.data || []);
      if (pn.success) setPartners(pn.data || []);
    } catch {
      setToast('Gagal memuat data platform');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

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

  async function setTenantStatus(id: string, next: string) {
    setActing(id);
    try {
      const res = await fetch('/api/platform?action=tenant-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: next }),
      });
      const j = await res.json();
      if (j.success) {
        setToast(j.message);
        load();
      } else setToast(j.error || 'Gagal update');
    } finally {
      setActing(null);
      setTimeout(() => setToast(''), 2500);
    }
  }

  async function setTenantPlan(id: string, plan: string) {
    setActing(id);
    try {
      const res = await fetch('/api/platform?action=tenant-plan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, plan }),
      });
      const j = await res.json();
      if (j.success) {
        setToast(j.message);
        load();
      } else setToast(j.error || 'Gagal update plan');
    } finally {
      setActing(null);
      setTimeout(() => setToast(''), 2500);
    }
  }

  async function impersonateTenant(id: string) {
    setActing(id);
    try {
      const res = await fetch('/api/platform?action=impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: id }),
      });
      const j = await res.json();
      if (!j.success) {
        setToast(j.error || 'Impersonate gagal');
        return;
      }
      await updateSession(j.data.sessionPatch);
      setToast(j.message || 'Support mode aktif');
      router.push(j.data.redirectTo || '/humanify');
    } catch {
      setToast('Impersonate gagal');
    } finally {
      setActing(null);
      setTimeout(() => setToast(''), 2500);
    }
  }

  async function runDunning() {
    setDunningBusy(true);
    try {
      const res = await fetch('/api/platform?action=dunning-scan', { method: 'POST' });
      const j = await res.json();
      if (j.success) {
        setToast(j.message || `Dunning: suspended ${j.data?.suspended || 0}`);
        load();
      } else setToast(j.error || 'Dunning gagal');
    } finally {
      setDunningBusy(false);
      setTimeout(() => setToast(''), 3500);
    }
  }

  async function createPartnerCode() {
    if (!partnerForm.code || !partnerForm.name) {
      setToast('Kode & nama partner wajib');
      return;
    }
    const res = await fetch('/api/platform?action=partner-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partnerForm),
    });
    const j = await res.json();
    if (j.success) {
      setToast(`Partner ${j.data.code} dibuat`);
      setPartnerForm({ code: '', name: '', contactEmail: '' });
      load();
    } else setToast(j.error || 'Gagal buat partner');
    setTimeout(() => setToast(''), 3000);
  }

  async function runCleanupQa(apply: boolean) {
    setCleanupBusy(true);
    try {
      const res = await fetch('/api/platform?action=cleanup-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: !apply, olderThanHours: 1 }),
      });
      const j = await res.json();
      if (j.success) {
        setToast(j.message + (j.data?.slugs?.length ? `: ${j.data.slugs.slice(0, 5).join(', ')}` : ''));
        if (apply) load();
      } else setToast(j.error || 'Cleanup gagal');
    } finally {
      setCleanupBusy(false);
      setTimeout(() => setToast(''), 4000);
    }
  }

  async function runArchiveQa(apply: boolean) {
    setArchiveBusy(true);
    try {
      const res = await fetch('/api/platform?action=archive-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: !apply, olderThanHours: 24 }),
      });
      const j = await res.json();
      if (j.success) {
        setToast(j.message + (j.data?.slugs?.length ? `: ${j.data.slugs.slice(0, 5).join(', ')}` : ''));
        if (apply) load();
      } else setToast(j.error || 'Archive gagal');
    } finally {
      setArchiveBusy(false);
      setTimeout(() => setToast(''), 4000);
    }
  }

  const s = overview?.summary || {};
  const m = overview?.metrics || {};
  const maxPlanCount = Math.max(1, ...(m.byPlan || []).map((p: any) => p.count || 0));

  if (status === 'loading' || (status === 'authenticated' && !allowed)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat...
      </div>
    );
  }

  return (
    <HQLayout title="Platform Control Plane" subtitle="Humanify SaaS — monitor tenant & bisnis" platform="humanify">
      <div className="space-y-6">
        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow">{toast}</div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">Phase 3 · Control Plane</p>
            <h2 className="text-lg font-semibold text-slate-900">MRR, kesehatan tenant & operasi</h2>
          </div>
          <Link href="/platform/observability" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
            <Activity className="w-4 h-4" /> Observability
          </Link>
        </div>

        <div className="flex items-center justify-end gap-2 flex-wrap">
          <button
            onClick={() => runCleanupQa(false)}
            disabled={cleanupBusy}
            className="text-sm px-3 py-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Preview QA cleanup
          </button>
          <button
            onClick={() => {
              if (confirm('Suspend semua QA/smoke tenants (>1 jam)?')) runCleanupQa(true);
            }}
            disabled={cleanupBusy}
            className="text-sm px-3 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            Apply QA cleanup
          </button>
          <button
            onClick={() => runArchiveQa(false)}
            disabled={archiveBusy}
            className="flex items-center gap-1.5 text-sm px-3 py-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            <Archive className="w-3.5 h-3.5" /> Preview archive QA
          </button>
          <button
            onClick={() => {
              if (confirm('Arsipkan tenant QA/smoke yang sudah suspended (>24 jam)?')) runArchiveQa(true);
            }}
            disabled={archiveBusy}
            className="flex items-center gap-1.5 text-sm px-3 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            <Archive className="w-3.5 h-3.5" /> Apply archive QA
          </button>
          <button
            onClick={runDunning}
            disabled={dunningBusy}
            className="flex items-center gap-2 text-sm px-3 py-2 border border-amber-300 text-amber-900 rounded-lg hover:bg-amber-50 disabled:opacity-50"
          >
            {dunningBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PauseCircle className="w-4 h-4" />}
            Run dunning
          </button>
          <button onClick={load} className="flex items-center gap-2 text-sm px-3 py-2 border rounded-lg hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        <div className="bg-white border rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-900">Partner / referral codes</p>
          <div className="flex flex-wrap gap-2">
            <input
              className="border rounded-lg px-3 py-2 text-sm uppercase"
              placeholder="CODE"
              value={partnerForm.code}
              onChange={(e) => setPartnerForm({ ...partnerForm, code: e.target.value.toUpperCase() })}
            />
            <input
              className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[140px]"
              placeholder="Nama partner"
              value={partnerForm.name}
              onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
            />
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Email"
              value={partnerForm.contactEmail}
              onChange={(e) => setPartnerForm({ ...partnerForm, contactEmail: e.target.value })}
            />
            <button onClick={createPartnerCode} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm">
              Tambah
            </button>
          </div>
          <ul className="text-xs text-slate-600 divide-y max-h-28 overflow-y-auto">
            {partners.map((p) => (
              <li key={p.id} className="py-1.5 flex justify-between gap-2">
                <span>
                  <code className="bg-slate-100 px-1 rounded">{p.code}</code> · {p.name}
                </span>
                <span className="text-slate-400">{p.tenant_count || 0} tenants · signup ?ref={p.code}</span>
              </li>
            ))}
            {!partners.length && <li className="py-1 text-slate-400">Belum ada partner.</li>}
          </ul>
        </div>

        {expiring.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-900 mb-2">Trial berakhir ≤ 7 hari ({expiring.length})</p>
            <ul className="text-xs text-amber-900 space-y-1 max-h-28 overflow-y-auto">
              {expiring.map((t) => (
                <li key={t.id}>
                  <span className="font-medium">{t.name}</span>
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
              <HeartPulse className="w-3.5 h-3.5 text-indigo-600" /> Health mix
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
              <p className="text-xs text-slate-500">QA/smoke noise (semua status)</p>
              <p className="text-[11px] text-slate-400 mt-1">Dikeluarkan dari MRR & health</p>
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
                      className="h-full bg-indigo-500 rounded-full"
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

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Cari nama / slug / email..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
            <option value="all">Semua status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
          <button onClick={load} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Filter</button>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3">Perusahaan</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3 text-center">Users</th>
                <th className="px-4 py-3 text-center">Employees</th>
                <th className="px-4 py-3">Health</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Careers</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Memuat tenant...</td></tr>
              )}
              {!loading && tenants.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Belum ada tenant</td></tr>
              )}
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-500" />
                      <div>
                        <p className="font-medium text-slate-900">{t.name}</p>
                        <p className="text-xs text-slate-500">/{t.slug || '—'} · {t.business_email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <select
                      disabled={acting === t.id}
                      value={(t.subscription_plan || 'trial').toLowerCase()}
                      onChange={(e) => setTenantPlan(t.id, e.target.value)}
                      className="text-xs border rounded-lg px-2 py-1 bg-white"
                    >
                      <option value="trial">trial</option>
                      <option value="starter">starter</option>
                      <option value="growth">growth</option>
                      <option value="enterprise">enterprise</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center"><Users className="w-3.5 h-3.5 inline mr-1 text-slate-400" />{t.user_count ?? 0}</td>
                  <td className="px-4 py-3 text-center"><Briefcase className="w-3.5 h-3.5 inline mr-1 text-slate-400" />{t.employee_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <span
                      title={(t.health?.factors || []).join(', ')}
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        t.health?.label === 'healthy' ? 'bg-emerald-100 text-emerald-700' :
                        t.health?.label === 'watch' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}
                    >
                      {t.health?.score ?? '—'} {t.health?.label || ''}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      t.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      t.status === 'trial' ? 'bg-amber-100 text-amber-700' :
                      t.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                    }`}>{t.status || 'trial'}</span>
                    {t.setup_completed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline ml-1" />}
                  </td>
                  <td className="px-4 py-3">
                    {t.slug ? (
                      <Link href={`/c/${t.slug}/careers`} target="_blank" className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1">
                        Buka <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Link
                      href={`/platform/tenants/${t.id}`}
                      title="Lihat detail tenant"
                      className="text-[11px] px-2 py-1 rounded border text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1"
                    ><ClipboardList className="w-3 h-3" /> Detail</Link>
                    <button
                      disabled={acting === t.id || t.status === 'suspended'}
                      onClick={() => impersonateTenant(t.id)}
                      title="Buka sebagai support (tenant context)"
                      className="text-[11px] px-2 py-1 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                    ><Eye className="w-3 h-3 inline" /> Support</button>
                    {t.status !== 'active' && (
                      <button
                        disabled={acting === t.id}
                        onClick={() => setTenantStatus(t.id, 'active')}
                        className="text-[11px] px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                      >Activate</button>
                    )}
                    {t.status !== 'suspended' && (
                      <button
                        disabled={acting === t.id}
                        onClick={() => setTenantStatus(t.id, 'suspended')}
                        className="text-[11px] px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      ><PauseCircle className="w-3 h-3 inline" /> Suspend</button>
                    )}
                    {t.status === 'suspended' && (
                      <button
                        disabled={acting === t.id}
                        onClick={() => setTenantStatus(t.id, 'trial')}
                        className="text-[11px] px-2 py-1 rounded border text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      ><Clock className="w-3 h-3 inline" /> Trial</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-900">
          <strong>Phase 8:</strong> Partner referral (?ref=CODE) · QA cleanup · go-live.
          Signup: <code className="bg-white/70 px-1 rounded">/humanify/signup?ref=CODE</code>
        </div>
      </div>
    </HQLayout>
  );
}
