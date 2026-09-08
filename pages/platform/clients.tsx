import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import OpsLayout from '@/components/humanify/OpsLayout';
import {
  OpsPageIntro, OpsPanel, OpsStat, OpsToast, OpsBadge, OpsPageSkeleton, OpsConfirm,
} from '@/components/humanify/ops-ui';
import OpsDataTable, { type OpsTableColumn } from '@/components/humanify/OpsDataTable';
import { usePlatformOperator } from '@/lib/humanify/use-platform-operator';
import {
  Building2, Users, Briefcase, ExternalLink,
  CheckCircle2, PauseCircle, Clock, Loader2, RefreshCw, Eye,
  ClipboardList, Archive, Plus,
} from 'lucide-react';

/**
 * Platform ops — kelola klien / perusahaan Humanify
 */
export default function PlatformClientsPage() {
  const { gating, update: updateSession } = usePlatformOperator('/platform/clients');

  const [tenants, setTenants] = useState<any[]>([]);
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
  const [confirm, setConfirm] = useState<null | {
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    run: () => void | Promise<void>;
  }>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all: any[] = [];
      for (let page = 1; page <= 20; page += 1) {
        const q = new URLSearchParams({
          action: 'tenants',
          status: 'all',
          limit: '100',
          page: String(page),
        });
        const tn = await fetch(`/api/platform?${q}`).then((r) => r.json());
        if (!tn.success) {
          setToast(tn.error || 'Gagal memuat klien');
          break;
        }
        const batch = tn.data?.tenants || [];
        all.push(...batch);
        if (batch.length < 100) break;
      }
      setTenants(all);
    } catch {
      setToast('Gagal memuat data klien');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!gating) load();
  }, [gating, load]);

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
      // Tenant HRIS lives on apex — ops cookies are host-only
      window.location.assign(`https://humanify.id${j.data.redirectTo || '/humanify'}`);
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

  const columns: OpsTableColumn<any>[] = useMemo(() => [
    {
      id: 'name',
      header: 'Perusahaan',
      exportWidth: 28,
      exportValue: (t) => `${t.name || ''} | /${t.slug || ''} | ${t.business_email || ''}`,
      cell: (t) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[color:var(--hf-brand-500)] shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{t.name}</p>
            <p className="text-xs text-slate-500 truncate">/{t.slug || '—'} · {t.business_email || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'plan',
      header: 'Plan',
      exportValue: (t) => (t.subscription_plan || 'trial').toLowerCase(),
      cell: (t) => (
        <select
          disabled={acting === t.id}
          value={(t.subscription_plan || 'trial').toLowerCase()}
          onChange={(e) => setTenantPlan(t.id, e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white"
        >
          <option value="trial">trial</option>
          <option value="starter">starter</option>
          <option value="growth">growth</option>
          <option value="enterprise">enterprise</option>
        </select>
      ),
    },
    {
      id: 'users',
      header: 'Users',
      align: 'center',
      exportValue: (t) => t.user_count ?? 0,
      cell: (t) => (
        <span className="tabular-nums"><Users className="w-3.5 h-3.5 inline mr-1 text-slate-400" />{t.user_count ?? 0}</span>
      ),
    },
    {
      id: 'employees',
      header: 'Employees',
      align: 'center',
      exportValue: (t) => t.employee_count ?? 0,
      cell: (t) => (
        <span className="tabular-nums"><Briefcase className="w-3.5 h-3.5 inline mr-1 text-slate-400" />{t.employee_count ?? 0}</span>
      ),
    },
    {
      id: 'health',
      header: 'Health',
      exportValue: (t) => `${t.health?.score ?? ''} ${t.health?.label || ''}`.trim(),
      cell: (t) => (
        <OpsBadge
          tone={
            t.health?.label === 'healthy' ? 'success' :
            t.health?.label === 'watch' ? 'warning' : 'danger'
          }
        >
          <span title={(t.health?.factors || []).join(', ')}>
            {t.health?.score ?? '—'} {t.health?.label || ''}
          </span>
        </OpsBadge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      exportValue: (t) => t.status || '',
      cell: (t) => (
        <div className="flex items-center gap-1.5">
          <OpsBadge
            tone={
              t.status === 'active' ? 'success' :
              t.status === 'suspended' ? 'danger' :
              t.status === 'trial' ? 'warning' : 'neutral'
            }
          >
            {t.status || '—'}
          </OpsBadge>
          {t.setup_completed && (
            <span title="Setup selesai">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'careers',
      header: 'Careers',
      exportValue: (t) => (t.slug ? `https://humanify.id/c/${t.slug}/careers` : ''),
      cell: (t) => (
        t.slug ? (
          <Link href={`/c/${t.slug}/careers`} target="_blank" className="text-xs text-[color:var(--hf-brand-600)] hover:underline inline-flex items-center gap-1">
            Buka <ExternalLink className="w-3 h-3" />
          </Link>
        ) : '—'
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      align: 'right',
      exportOmit: true,
      searchable: false,
      cell: (t) => (
        <div className="space-x-1 whitespace-nowrap">
          <Link
            href={`/platform/tenants/${t.id}`}
            className="text-[11px] px-2 py-1 rounded border text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1"
          ><ClipboardList className="w-3 h-3" /> Detail</Link>
          <button
            disabled={acting === t.id || t.status === 'suspended'}
            onClick={() => setConfirm({
              title: 'Buka support mode',
              message: `Sesi operator akan berpindah ke portal tenant ${t.name || t.slug} di humanify.id. Jangan ubah data produksi kecuali untuk support.`,
              confirmLabel: 'Buka portal tenant',
              run: () => impersonateTenant(t.id),
            })}
            className="text-[11px] px-2 py-1 rounded border border-[var(--hf-brand-100)] text-[color:var(--hf-brand)] hover:bg-[var(--hf-brand-50)] disabled:opacity-50"
          ><Eye className="w-3 h-3 inline" /> Support</button>
          {t.status !== 'active' && (
            <button disabled={acting === t.id} onClick={() => setTenantStatus(t.id, 'active')} className="text-[11px] px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">Activate</button>
          )}
          {t.status !== 'suspended' && (
            <button
              disabled={acting === t.id}
              onClick={() => setConfirm({
                title: 'Suspend klien',
                message: `${t.name || t.slug} tidak bisa login sampai diaktifkan kembali.`,
                confirmLabel: 'Suspend',
                danger: true,
                run: () => setTenantStatus(t.id, 'suspended'),
              })}
              className="text-[11px] px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
            ><PauseCircle className="w-3 h-3 inline" /> Suspend</button>
          )}
          {t.status === 'suspended' && (
            <button disabled={acting === t.id} onClick={() => setTenantStatus(t.id, 'trial')} className="text-[11px] px-2 py-1 rounded border text-slate-600 hover:bg-slate-50 disabled:opacity-50"><Clock className="w-3 h-3 inline" /> Trial</button>
          )}
        </div>
      ),
    },
  ], [acting]);

  if (gating || (loading && tenants.length === 0)) {
    return (
      <OpsLayout title="Klien" subtitle="Tenant lifecycle & support">
        <OpsPageSkeleton variant="table" />
      </OpsLayout>
    );
  }

  const statusCounts = {
    active: tenants.filter((t) => t.status === 'active').length,
    trial: tenants.filter((t) => t.status === 'trial' || (t.subscription_plan || '').toLowerCase() === 'trial').length,
    suspended: tenants.filter((t) => t.status === 'suspended').length,
    watch: tenants.filter((t) => t.health?.label === 'watch' || t.health?.label === 'risk').length,
  };

  return (
    <OpsLayout title="Klien" subtitle="Tenant lifecycle & support">
      <div className="space-y-5">
        <OpsToast message={toast} onDismiss={() => setToast('')} />
        <OpsConfirm
          open={!!confirm}
          title={confirm?.title || ''}
          message={confirm?.message || ''}
          confirmLabel={confirm?.confirmLabel}
          danger={confirm?.danger}
          busy={!!acting || cleanupBusy}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            const job = confirm;
            setConfirm(null);
            if (job) await job.run();
          }}
        />

        <OpsPageIntro
          eyebrow="Tenants"
          title="Daftar klien"
          description="Buat perusahaan, activate/suspend, ubah plan, atau buka support mode ke portal tenant di humanify.id."
          actions={
            <>
              <button
                onClick={() => runCleanupQa(false)}
                disabled={cleanupBusy}
                className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Preview QA cleanup
              </button>
              <button
                onClick={() => setConfirm({
                  title: 'Apply QA cleanup',
                  message: 'Semua tenant QA/smoke yang berumur lebih dari 1 jam akan di-suspend. Tindakan ini memengaruhi data lab.',
                  confirmLabel: 'Suspend tenant QA',
                  danger: true,
                  run: () => runCleanupQa(true),
                })}
                disabled={cleanupBusy}
                className="text-xs px-2.5 py-1.5 border border-red-200 text-red-700 rounded-xl bg-white hover:bg-red-50 disabled:opacity-50"
              >
                Apply QA cleanup
              </button>
              <button
                onClick={() => runArchiveQa(false)}
                disabled={archiveBusy}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                <Archive className="w-3 h-3" /> Preview archive
              </button>
              <button
                onClick={runDunning}
                disabled={dunningBusy}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-amber-200 text-amber-900 rounded-xl bg-amber-50 hover:bg-amber-100 disabled:opacity-50"
              >
                {dunningBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <PauseCircle className="w-3 h-3" />}
                Dunning
              </button>
              <button
                onClick={() => { setShowCreate((v) => !v); setCreatedCreds(null); }}
                className="flex items-center gap-1.5 text-sm px-3 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800"
              >
                <Plus className="w-4 h-4" /> Buat klien
              </button>
              <button onClick={load} className="flex items-center gap-2 text-sm px-3 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </>
          }
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <OpsStat label="Total (filter)" value={tenants.length} icon={Building2} hint="Hasil filter saat ini" />
          <OpsStat label="Active" value={statusCounts.active} tone="success" icon={CheckCircle2} />
          <OpsStat label="Suspended" value={statusCounts.suspended} tone="danger" icon={PauseCircle} />
          <OpsStat label="Health watch" value={statusCounts.watch} tone="warning" icon={Clock} hint="Perlu perhatian" />
        </div>

        {showCreate && (
          <OpsPanel title="Provision klien baru" description="Owner mendapat akun login di portal tenant (humanify.id).">
          <form onSubmit={createTenant} className="space-y-3">
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
          </OpsPanel>
        )}

        <OpsPanel title="Tabel klien" description="Cari, filter, paginasi, dan export CSV/Excel. Plan, seats, health, careers, aksi support.">
          <OpsDataTable
            rows={tenants}
            columns={columns}
            rowKey={(t) => t.id}
            loading={loading}
            searchPlaceholder="Cari nama / slug / email / plan…"
            exportFileName="humanify-ops-klien"
            exportSheetName="Klien"
            emptyTitle="Belum ada klien"
            emptyHint="Buat klien baru atau ubah filter."
            defaultPageSize={25}
            filters={[
              {
                id: 'status',
                label: 'Semua status',
                getValue: (t) => String(t.status || 'trial'),
                options: [
                  { value: 'active', label: 'Active' },
                  { value: 'trial', label: 'Trial' },
                  { value: 'suspended', label: 'Suspended' },
                  { value: 'inactive', label: 'Inactive' },
                ],
              },
              {
                id: 'plan',
                label: 'Semua plan',
                getValue: (t) => String(t.subscription_plan || 'trial').toLowerCase(),
                options: [
                  { value: 'trial', label: 'trial' },
                  { value: 'starter', label: 'starter' },
                  { value: 'growth', label: 'growth' },
                  { value: 'enterprise', label: 'enterprise' },
                ],
              },
            ]}
          />
        </OpsPanel>
      </div>
    </OpsLayout>
  );
}
