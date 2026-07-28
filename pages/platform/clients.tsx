import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import PlatformOpsNav from '@/components/humanify/PlatformOpsNav';
import {
  Building2, Users, Briefcase, Search, ExternalLink,
  CheckCircle2, PauseCircle, Clock, Loader2, RefreshCw, Eye,
  ClipboardList, Archive, Plus,
} from 'lucide-react';

/**
 * Platform ops — kelola klien / perusahaan Humanify
 */
export default function PlatformClientsPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const role = ((session?.user as any)?.role || '').toLowerCase();
  const allowed = role === 'super_admin' || role === 'superadmin' || role === 'platform_admin';

  const [tenants, setTenants] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    companyName: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    plan: 'trial',
    partnerCode: '',
    markEmailVerified: false,
  });
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password?: string; tenantId: string } | null>(null);
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [dunningBusy, setDunningBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ action: 'tenants', status: filterStatus, search });
      const tn = await fetch(`/api/platform?${q}`).then((r) => r.json());
      if (tn.success) setTenants(tn.data?.tenants || []);
      else setToast(tn.error || 'Gagal memuat klien');
    } catch {
      setToast('Gagal memuat data klien');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/humanify/login?callbackUrl=/platform/clients');
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
      if (j.success) { setToast(j.message); load(); }
      else setToast(j.error || 'Gagal update');
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
      if (j.success) { setToast(j.message); load(); }
      else setToast(j.error || 'Gagal update plan');
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
      if (!j.success) { setToast(j.error || 'Impersonate gagal'); return; }
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

  async function createTenant(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreatedCreds(null);
    try {
      const res = await fetch('/api/platform?action=tenant-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: createForm.companyName,
          ownerName: createForm.ownerName,
          email: createForm.email,
          phone: createForm.phone || undefined,
          password: createForm.password || undefined,
          plan: createForm.plan,
          partnerCode: createForm.partnerCode || undefined,
          markEmailVerified: createForm.markEmailVerified,
        }),
      });
      const j = await res.json();
      if (!j.success) {
        setToast(j.error || 'Gagal buat tenant');
        return;
      }
      setCreatedCreds({
        email: j.data.email,
        password: j.data.temporaryPassword,
        tenantId: j.data.tenantId,
      });
      setToast(j.message || 'Tenant dibuat');
      load();
    } catch {
      setToast('Gagal buat tenant');
    } finally {
      setCreating(false);
      setTimeout(() => setToast(''), 3000);
    }
  }

  async function runCleanupQa(apply: boolean) {
    setCleanupBusy(true);
    try {
      const res = await fetch('/api/platform?action=cleanup-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: !apply }),
      });
      const j = await res.json();
      setToast(j.message || (j.success ? 'OK' : j.error));
      if (apply && j.success) load();
    } finally {
      setCleanupBusy(false);
      setTimeout(() => setToast(''), 3000);
    }
  }

  async function runArchiveQa(apply: boolean) {
    setArchiveBusy(true);
    try {
      const res = await fetch('/api/platform?action=archive-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: !apply }),
      });
      const j = await res.json();
      setToast(j.message || (j.success ? 'OK' : j.error));
      if (apply && j.success) load();
    } finally {
      setArchiveBusy(false);
      setTimeout(() => setToast(''), 3000);
    }
  }

  async function runDunning() {
    setDunningBusy(true);
    try {
      const res = await fetch('/api/platform?action=dunning-scan', { method: 'POST' });
      const j = await res.json();
      setToast(j.message || (j.success ? 'Dunning selesai' : j.error));
      if (j.success) load();
    } finally {
      setDunningBusy(false);
      setTimeout(() => setToast(''), 3000);
    }
  }

  if (status === 'loading' || (status === 'authenticated' && !allowed)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat...
      </div>
    );
  }

  return (
    <HumanifyLayout title="Klien Humanify" subtitle="Kelola perusahaan yang memakai Humanify">
      <div className="space-y-6">
        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow">{toast}</div>
        )}

        <PlatformOpsNav />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Daftar klien</h2>
            <p className="text-xs text-slate-500">Aktifkan, suspend, ubah plan, atau buka sebagai support</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => runCleanupQa(false)}
              disabled={cleanupBusy}
              className="text-xs px-2.5 py-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              Preview QA cleanup
            </button>
            <button
              onClick={() => { if (confirm('Suspend semua QA/smoke tenants (>1 jam)?')) runCleanupQa(true); }}
              disabled={cleanupBusy}
              className="text-xs px-2.5 py-1.5 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              Apply QA cleanup
            </button>
            <button
              onClick={() => runArchiveQa(false)}
              disabled={archiveBusy}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              <Archive className="w-3 h-3" /> Preview archive
            </button>
            <button
              onClick={runDunning}
              disabled={dunningBusy}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-amber-300 text-amber-900 rounded-lg hover:bg-amber-50 disabled:opacity-50"
            >
              {dunningBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <PauseCircle className="w-3 h-3" />}
              Dunning
            </button>
            <button
              onClick={() => { setShowCreate((v) => !v); setCreatedCreds(null); }}
              className="flex items-center gap-1.5 text-sm px-3 py-2 bg-[var(--hf-brand-600)] text-white rounded-lg"
            >
              <Plus className="w-4 h-4" /> Buat klien
            </button>
            <button onClick={load} className="flex items-center gap-2 text-sm px-3 py-2 border rounded-lg hover:bg-slate-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {showCreate && (
          <form onSubmit={createTenant} className="bg-white border rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-900">Provision klien baru</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                required
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Nama perusahaan *"
                value={createForm.companyName}
                onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })}
              />
              <input
                required
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Nama pemilik *"
                value={createForm.ownerName}
                onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })}
              />
              <input
                required
                type="email"
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Email pemilik *"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Telepon"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Password (kosong = auto-generate)"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm uppercase"
                placeholder="Partner code (opsional)"
                value={createForm.partnerCode}
                onChange={(e) => setCreateForm({ ...createForm, partnerCode: e.target.value.toUpperCase() })}
              />
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={createForm.plan}
                onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}
              >
                <option value="trial">trial</option>
                <option value="starter">starter</option>
                <option value="growth">growth</option>
                <option value="enterprise">enterprise</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={createForm.markEmailVerified}
                  onChange={(e) => setCreateForm({ ...createForm, markEmailVerified: e.target.checked })}
                />
                Tandai email terverifikasi
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-[var(--hf-brand-600)] text-white rounded-lg text-sm disabled:opacity-50"
              >
                {creating ? 'Menyimpan…' : 'Buat tenant'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-2 border rounded-lg text-sm">
                Batal
              </button>
            </div>
            {createdCreds && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-900">
                <p className="font-medium">Tenant siap</p>
                <p>Email: <code className="bg-white/80 px-1 rounded">{createdCreds.email}</code></p>
                {createdCreds.password && (
                  <p>Password sementara: <code className="bg-white/80 px-1 rounded">{createdCreds.password}</code></p>
                )}
                <Link href={`/platform/tenants/${createdCreds.tenantId}`} className="text-[color:var(--hf-brand-600)] underline text-xs">
                  Buka detail →
                </Link>
              </div>
            )}
          </form>
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
          <button onClick={load} className="px-4 py-2 bg-[var(--hf-brand-600)] text-white rounded-lg text-sm">Filter</button>
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
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Memuat klien...</td></tr>
              )}
              {!loading && tenants.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Belum ada klien</td></tr>
              )}
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[color:var(--hf-brand-500)]" />
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
                      <Link href={`/c/${t.slug}/careers`} target="_blank" className="text-xs text-[color:var(--hf-brand-600)] hover:underline inline-flex items-center gap-1">
                        Buka <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Link
                      href={`/platform/tenants/${t.id}`}
                      className="text-[11px] px-2 py-1 rounded border text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1"
                    ><ClipboardList className="w-3 h-3" /> Detail</Link>
                    <button
                      disabled={acting === t.id || t.status === 'suspended'}
                      onClick={() => impersonateTenant(t.id)}
                      className="text-[11px] px-2 py-1 rounded border border-[var(--hf-brand-100)] text-[color:var(--hf-brand)] hover:bg-[var(--hf-brand-50)] disabled:opacity-50"
                    ><Eye className="w-3 h-3 inline" /> Support</button>
                    {t.status !== 'active' && (
                      <button disabled={acting === t.id} onClick={() => setTenantStatus(t.id, 'active')} className="text-[11px] px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">Activate</button>
                    )}
                    {t.status !== 'suspended' && (
                      <button disabled={acting === t.id} onClick={() => setTenantStatus(t.id, 'suspended')} className="text-[11px] px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"><PauseCircle className="w-3 h-3 inline" /> Suspend</button>
                    )}
                    {t.status === 'suspended' && (
                      <button disabled={acting === t.id} onClick={() => setTenantStatus(t.id, 'trial')} className="text-[11px] px-2 py-1 rounded border text-slate-600 hover:bg-slate-50 disabled:opacity-50"><Clock className="w-3 h-3 inline" /> Trial</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </HumanifyLayout>
  );
}
