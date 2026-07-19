import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import {
  ArrowLeft, Building2, Users, Briefcase, HeartPulse, Eye, Clock,
  PauseCircle, CheckCircle2, Loader2, RefreshCw, ExternalLink, Receipt,
} from 'lucide-react';

/**
 * Humanify Platform — single tenant detail & ops (Phase 3+)
 */
export default function TenantDetailPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const id = String(router.query.id || '');
  const role = ((session?.user as any)?.role || '').toLowerCase();
  const allowed = role === 'super_admin' || role === 'superadmin' || role === 'platform_admin';

  const [tenant, setTenant] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersAvailable, setOrdersAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [tRes, bRes] = await Promise.all([
        fetch(`/api/platform?action=tenant-detail&id=${encodeURIComponent(id)}`).then((r) => r.json()),
        fetch(`/api/platform?action=billing-orders&tenantId=${encodeURIComponent(id)}&limit=25`).then((r) => r.json()),
      ]);
      if (tRes.success) setTenant(tRes.data);
      else setToast(tRes.error || 'Gagal memuat tenant');
      if (bRes.success) {
        setOrders(bRes.data?.orders || []);
        setOrdersAvailable(bRes.data?.available !== false);
      }
    } catch {
      setToast('Gagal memuat data tenant');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/humanify/login?callbackUrl=/platform');
      return;
    }
    if (status === 'authenticated' && !allowed) {
      router.replace('/humanify');
      return;
    }
    if (status === 'authenticated' && allowed && id) load();
  }, [status, allowed, id, load, router]);

  async function setTenantStatus(next: string) {
    setActing(true);
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
      } else setToast(j.error || 'Gagal update status');
    } finally {
      setActing(false);
      setTimeout(() => setToast(''), 2500);
    }
  }

  async function setTenantPlan(plan: string) {
    setActing(true);
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
      setActing(false);
      setTimeout(() => setToast(''), 2500);
    }
  }

  async function impersonateTenant() {
    setActing(true);
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
      setActing(false);
      setTimeout(() => setToast(''), 2500);
    }
  }

  if (status === 'loading' || (status === 'authenticated' && !allowed)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat...
      </div>
    );
  }

  const health = tenant?.health;
  const amountFmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

  return (
    <HumanifyLayout title={tenant?.name || 'Tenant'} subtitle="Detail tenant & operasi" >
      <div className="space-y-6">
        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow">{toast}</div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link href="/platform" className="inline-flex items-center gap-1 text-sm text-[color:var(--hf-brand-600)] hover:underline">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Platform
          </Link>
          <button onClick={load} className="flex items-center gap-2 text-sm px-3 py-2 border rounded-lg hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {loading && !tenant && (
          <div className="bg-white border rounded-xl p-8 text-center text-slate-400">Memuat tenant...</div>
        )}

        {!loading && !tenant && (
          <div className="bg-white border rounded-xl p-8 text-center text-slate-400">Tenant tidak ditemukan.</div>
        )}

        {tenant && (
          <>
            <div className="bg-white border rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[var(--hf-brand-50)] flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-[color:var(--hf-brand-600)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{tenant.name}</h2>
                    <p className="text-xs text-slate-500">
                      /{tenant.slug || '—'} · {tenant.business_email || tenant.contact_email || '—'}
                      {' · dibuat '}{tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('id-ID') : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold uppercase px-2 py-1 rounded ${
                    tenant.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    tenant.status === 'trial' ? 'bg-amber-100 text-amber-700' :
                    tenant.status === 'suspended' ? 'bg-red-100 text-red-700' :
                    tenant.status === 'archived' ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-600'
                  }`}>{tenant.status || 'trial'}</span>
                  <span className="text-[11px] font-bold uppercase px-2 py-1 rounded bg-[var(--hf-brand-50)] text-[color:var(--hf-brand)]">
                    {tenant.subscription_plan || 'trial'}
                  </span>
                  {tenant.setup_completed && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  disabled={acting || tenant.status === 'suspended'}
                  onClick={impersonateTenant}
                  className="text-xs px-3 py-1.5 rounded border border-[var(--hf-brand-100)] text-[color:var(--hf-brand)] hover:bg-[var(--hf-brand-50)] disabled:opacity-50 inline-flex items-center gap-1"
                ><Eye className="w-3.5 h-3.5" /> Buka sebagai support</button>
                {tenant.status !== 'active' && (
                  <button
                    disabled={acting}
                    onClick={() => setTenantStatus('active')}
                    className="text-xs px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >Activate</button>
                )}
                {tenant.status !== 'suspended' && (
                  <button
                    disabled={acting}
                    onClick={() => setTenantStatus('suspended')}
                    className="text-xs px-3 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 inline-flex items-center gap-1"
                  ><PauseCircle className="w-3.5 h-3.5" /> Suspend</button>
                )}
                {tenant.status !== 'trial' && (
                  <button
                    disabled={acting}
                    onClick={() => setTenantStatus('trial')}
                    className="text-xs px-3 py-1.5 rounded border text-slate-600 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1"
                  ><Clock className="w-3.5 h-3.5" /> Set trial</button>
                )}
                <select
                  disabled={acting}
                  value={(tenant.subscription_plan || 'trial').toLowerCase()}
                  onChange={(e) => setTenantPlan(e.target.value)}
                  className="text-xs border rounded-lg px-2 py-1.5 bg-white"
                >
                  <option value="trial">trial</option>
                  <option value="starter">starter</option>
                  <option value="growth">growth</option>
                  <option value="enterprise">enterprise</option>
                </select>
                {tenant.slug && (
                  <Link
                    href={`/c/${tenant.slug}/careers`}
                    target="_blank"
                    className="text-xs px-3 py-1.5 rounded border text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1"
                  >Careers <ExternalLink className="w-3 h-3" /></Link>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white border rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Users className="w-3.5 h-3.5" /> Users</div>
                <p className="text-2xl font-bold">
                  {tenant.seats ? `${tenant.seats.users}/${tenant.seats.maxUsers}` : (tenant.user_count ?? 0)}
                </p>
                {tenant.seats && (
                  <p className={`text-[11px] mt-1 ${tenant.seats.overLimit ? 'text-red-600' : tenant.seats.nearLimit ? 'text-amber-600' : 'text-slate-400'}`}>
                    {tenant.seats.usersPct}% kuota · {tenant.seats.planId}
                  </p>
                )}
              </div>
              <div className="bg-white border rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Briefcase className="w-3.5 h-3.5" /> Employees</div>
                <p className="text-2xl font-bold">
                  {tenant.seats ? `${tenant.seats.employees}/${tenant.seats.maxEmployees}` : (tenant.employee_count ?? 0)}
                </p>
                {tenant.seats?.upgradeHint && (
                  <p className="text-[11px] text-amber-600 mt-1">{tenant.seats.upgradeHint}</p>
                )}
              </div>
              <div className="bg-white border rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><HeartPulse className="w-3.5 h-3.5 text-[color:var(--hf-brand-600)]" /> Health</div>
                <p className={`text-sm font-bold ${
                  health?.label === 'healthy' ? 'text-emerald-600' :
                  health?.label === 'watch' ? 'text-amber-600' : 'text-red-600'
                }`}>{health?.score ?? '—'} · {health?.label || '—'}</p>
                <p className="text-[11px] text-slate-400 mt-1 truncate" title={(health?.factors || []).join(', ')}>
                  {(health?.factors || []).join(', ') || '—'}
                </p>
              </div>
              <div className="bg-white border rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Aktivitas 30 hari</p>
                <p className="text-sm text-slate-800">{tenant.leaveRequests30d ?? 0} cuti · {tenant.overtimeRequests30d ?? 0} lembur</p>
                {tenant.trialEndsAt && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Trial s.d. {new Date(tenant.trialEndsAt).toLocaleDateString('id-ID')}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white border rounded-xl p-4">
              <p className="text-sm font-semibold text-slate-800 mb-2">Owner / kontak</p>
              {tenant.owner ? (
                <p className="text-sm text-slate-700">
                  {tenant.owner.name || '—'} · {tenant.owner.email || '—'}
                  {' · '}<span className="text-xs text-slate-500 uppercase">{tenant.owner.role || '—'}</span>
                </p>
              ) : (
                <p className="text-sm text-slate-400">Belum ada user terdaftar.</p>
              )}
              {tenant.partnerCode && (
                <p className="text-xs text-slate-500 mt-1">
                  Partner ref: <code className="bg-slate-100 px-1 rounded">{tenant.partnerCode}</code>
                  {tenant.partnerCommission && (
                    <span>
                      {' '}· {tenant.partnerCommission.commissionPct}% · est.{' '}
                      {amountFmt(tenant.partnerCommission.sampleCommissionIdr)} / {amountFmt(tenant.partnerCommission.sampleAmountIdr)}
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="bg-white border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Kebijakan MFA</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {tenant.mfa?.requireMfa ? 'Wajib 2FA untuk semua member' : '2FA opsional'}
                  {' · '}{tenant.mfa?.enrolledUsers ?? 0} user sudah enroll
                </p>
              </div>
              <button
                type="button"
                disabled={acting}
                onClick={async () => {
                  setActing(true);
                  try {
                    const next = !tenant.mfa?.requireMfa;
                    const res = await fetch('/api/platform?action=tenant-mfa-policy', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id, requireMfa: next }),
                    });
                    const j = await res.json();
                    if (j.success) {
                      setToast(j.message || 'MFA policy updated');
                      await load();
                    } else setToast(j.error || 'Gagal update MFA');
                  } catch {
                    setToast('Gagal update MFA');
                  } finally {
                    setActing(false);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50 ${
                  tenant.mfa?.requireMfa ? 'bg-slate-600 hover:bg-slate-700' : ''
                }`}
                style={!tenant.mfa?.requireMfa ? { background: 'var(--hf-brand-600)' } : undefined}
              >
                {tenant.mfa?.requireMfa ? 'Nonaktifkan wajib MFA' : 'Paksa MFA tenant'}
              </button>
            </div>

            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-800">Riwayat billing orders</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-4 py-2">Order</th>
                    <th className="px-4 py-2">Plan</th>
                    <th className="px-4 py-2">Interval</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-right">Komisi (est.)</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Dibayar</th>
                    <th className="px-4 py-2">Dibuat</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {!ordersAvailable && (
                    <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-400">Tabel billing belum tersedia.</td></tr>
                  )}
                  {ordersAvailable && orders.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-400">Belum ada order.</td></tr>
                  )}
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="px-4 py-2 font-mono text-xs text-slate-600">{o.order_code || o.midtrans_order_id || o.id}</td>
                      <td className="px-4 py-2 capitalize">{o.plan || '—'}</td>
                      <td className="px-4 py-2">{o.interval || '—'}</td>
                      <td className="px-4 py-2 text-right">{amountFmt(o.amount_idr)}</td>
                      <td className="px-4 py-2 text-right text-xs text-slate-600">
                        {o.commission_idr != null
                          ? `${amountFmt(o.commission_idr)}${o.partner_code ? ` (${o.partner_code})` : ''}`
                          : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          o.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          o.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          o.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                        }`}>{o.status || '—'}</span>
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500">{o.paid_at ? new Date(o.paid_at).toLocaleString('id-ID') : '—'}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">{o.created_at ? new Date(o.created_at).toLocaleString('id-ID') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </HumanifyLayout>
  );
}
