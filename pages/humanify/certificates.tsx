import { useState, useEffect, useCallback, useMemo, type MouseEvent } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { PageGuard } from '@/components/permissions';
import Link from 'next/link';
import {
  Award, AlertTriangle, CheckCircle2, XCircle, Search, Bell,
  RefreshCw, ArrowRightLeft, Ban, Plus, X, Gem, Clock, ShieldAlert,
} from 'lucide-react';
import TrainingLmsBridge from '@/components/humanify/TrainingLmsBridge';
import HRStatCard from '@/components/humanify/HRStatCard';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import { OpsKpiShell, OpsToolbar } from '@/components/humanify/OpsPageChrome';
import { TalentShell } from '@/components/humanify/TalentModuleChrome';
import EmployeePicker, { type PickedEmployee } from '@/components/humanify/EmployeePicker';

type Cert = {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string;
  issuer: string;
  source: string;
  certificateNumber?: string;
  issuedDate?: string;
  expiryDate?: string;
  status: string;
  department?: string;
  reminderSent?: boolean;
  daysToExpiry?: number | null;
  rarity?: string;
  holderCount?: number;
  writable?: boolean;
  notes?: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  valid: { label: 'Valid', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  expiring_soon: { label: 'Segera Expired', color: 'bg-amber-50 text-amber-800 border-amber-100' },
  expired: { label: 'Expired', color: 'bg-rose-50 text-rose-700 border-rose-100' },
  revoked: { label: 'Dicabut', color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const RARITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: 'Kritis (1)', color: 'bg-rose-100 text-rose-800' },
  rare: { label: 'Langka', color: 'bg-orange-100 text-orange-800' },
  uncommon: { label: 'Terbatas', color: 'bg-amber-100 text-amber-800' },
  common: { label: 'Umum', color: 'bg-slate-100 text-slate-600' },
};

function daysLabel(d?: number | null) {
  if (d == null) return '—';
  if (d < 0) return `${Math.abs(d)}h lewat`;
  if (d === 0) return 'Hari ini';
  return `${d} hari`;
}

function handleBackdropMouseDown(e: MouseEvent, close: () => void) {
  if (e.target === e.currentTarget) close();
}

export default function CertificatesPage() {
  const [certs, setCerts] = useState<Cert[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [windowFilter, setWindowFilter] = useState('');
  const [rarityFilter, setRarityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [modal, setModal] = useState<null | {
    kind: 'renew' | 'transfer' | 'create' | 'revoke' | 'remind';
    cert?: Cert;
  }>(null);
  const [renewDate, setRenewDate] = useState('');
  const [note, setNote] = useState('');
  const [transferEmp, setTransferEmp] = useState<PickedEmployee | null>(null);
  const [createForm, setCreateForm] = useState({
    title: '',
    issuer: '',
    source: 'external',
    certificateNumber: '',
    issuedDate: new Date().toISOString().slice(0, 10),
    expiryDate: '',
    notes: '',
  });
  const [createEmp, setCreateEmp] = useState<PickedEmployee | null>(null);

  const showToast = (type: 'ok' | 'err', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4200);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, a] = await Promise.all([
        fetch('/api/humanify/certificates').then((r) => r.json()),
        fetch('/api/humanify/certificates?action=analytics').then((r) => r.json()),
      ]);
      setCerts(c.data || []);
      setAnalytics(a.data || {});
      setDataSource(c.dataSource || a.dataSource || (c.data?.length ? 'live' : 'empty'));
    } catch {
      setCerts([]);
      setDataSource('empty');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return certs.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (rarityFilter && c.rarity !== rarityFilter) return false;
      if (windowFilter === 'd30' && !(c.daysToExpiry != null && c.daysToExpiry >= 0 && c.daysToExpiry <= 30)) return false;
      if (windowFilter === 'd60' && !(c.daysToExpiry != null && c.daysToExpiry >= 0 && c.daysToExpiry <= 60)) return false;
      if (windowFilter === 'd90' && !(c.daysToExpiry != null && c.daysToExpiry >= 0 && c.daysToExpiry <= 90)) return false;
      if (windowFilter === 'expired' && c.status !== 'expired') return false;
      if (windowFilter === 'rare' && !(c.rarity === 'rare' || c.rarity === 'critical')) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.employeeName?.toLowerCase().includes(q) && !c.title?.toLowerCase().includes(q) && !c.issuer?.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [certs, statusFilter, windowFilter, rarityFilter, search]);

  const closeModal = () => {
    setModal(null);
    setNote('');
    setRenewDate('');
    setTransferEmp(null);
  };

  const postAction = async (action: string, body: Record<string, unknown>) => {
    const id = String(body.id || 'create');
    setBusyId(id);
    try {
      const res = await fetch(`/api/humanify/certificates?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal');
      showToast('ok', json.message || 'Berhasil');
      closeModal();
      await load();
    } catch (e: any) {
      showToast('err', e.message || 'Gagal memproses');
    } finally {
      setBusyId(null);
    }
  };

  const openRenew = (c: Cert) => {
    const base = new Date();
    base.setFullYear(base.getFullYear() + 1);
    setRenewDate(c.expiryDate && new Date(c.expiryDate) > new Date()
      ? (() => { const d = new Date(c.expiryDate!); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); })()
      : base.toISOString().slice(0, 10));
    setModal({ kind: 'renew', cert: c });
  };

  return (
    <PageGuard anyPermission={['training.view', 'training.*', 'employees.*']} title="Sertifikat" description="Registry sertifikat karyawan">
      <HQLayout title="Certificate Registry" subtitle="Expiry hub, kredensial langka, dan aksi HR">
        <TalentShell
          current="certificates"
          title="Registri Sertifikat"
          subtitle="Pantau kedaluwarsa, deteksi kredensial langka, pindahkan kepemilikan, dan jalankan aksi HR: reminder, perpanjang, cabut."
          icon={Award}
          chips={[
            { label: `${analytics.valid ?? 0} valid` },
            { label: `${analytics.critical30 ?? 0} ≤ 30 hari` },
          ]}
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <DataSourceBadge source={dataSource} />
              <Link href="/humanify/lms/competency" className="hf-btn-secondary inline-flex items-center gap-1.5 text-sm">
                <Award className="h-4 w-4" /> LMS Kompetensi
              </Link>
              <button
                type="button"
                onClick={() => {
                  setCreateEmp(null);
                  setCreateForm({
                    title: '',
                    issuer: '',
                    source: 'external',
                    certificateNumber: '',
                    issuedDate: new Date().toISOString().slice(0, 10),
                    expiryDate: '',
                    notes: '',
                  });
                  setModal({ kind: 'create' });
                }}
                className="hf-btn-primary inline-flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Tambah sertifikat
              </button>
            </div>
          )}
        >
          {toast && (
            <div
              role="status"
              className={`fixed right-4 top-4 z-[60] rounded-lg border px-4 py-2.5 text-sm shadow-lg ${
                toast.type === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {toast.text}
            </div>
          )}

          <TrainingLmsBridge currentModule="certificates" />

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <OpsKpiShell>
              <HRStatCard icon={Award} label="Total" value={analytics.total ?? certs.length} accent="violet" />
            </OpsKpiShell>
            <OpsKpiShell>
              <HRStatCard icon={CheckCircle2} label="Valid" value={analytics.valid ?? 0} accent="emerald" />
            </OpsKpiShell>
            <OpsKpiShell>
              <button type="button" className="w-full text-left" onClick={() => { setWindowFilter('d30'); setStatusFilter(''); }}>
                <HRStatCard icon={Clock} label="≤ 30 hari" value={analytics.critical30 ?? 0} accent="orange" />
              </button>
            </OpsKpiShell>
            <OpsKpiShell>
              <button type="button" className="w-full text-left" onClick={() => { setWindowFilter('expired'); setStatusFilter('expired'); }}>
                <HRStatCard icon={XCircle} label="Expired" value={analytics.expired ?? 0} accent="rose" />
              </button>
            </OpsKpiShell>
            <OpsKpiShell>
              <button type="button" className="w-full text-left" onClick={() => { setWindowFilter('rare'); setRarityFilter(''); setStatusFilter(''); }}>
                <HRStatCard icon={Gem} label="Jenis Langka" value={analytics.rareCount ?? 0} accent="violet" />
              </button>
            </OpsKpiShell>
            <OpsKpiShell>
              <HRStatCard icon={ShieldAlert} label="Single Holder" value={analytics.criticalRare ?? 0} accent="rose" />
            </OpsKpiShell>
          </div>

          {/* Expiry urgency + rare insights */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="hf-card p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
                <AlertTriangle className="h-4 w-4" /> Antrian kedaluwarsa & aksi HR
              </h3>
              {(analytics.actionQueue || []).length === 0 ? (
                <p className="text-sm text-amber-800/70">Tidak ada item mendesak. Semua kredensial dalam jendela aman.</p>
              ) : (
                <ul className="space-y-2">
                  {(analytics.actionQueue || []).slice(0, 6).map((q: any) => (
                    <li key={q.id} className="flex items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">{q.title}</p>
                        <p className="truncate text-xs text-slate-500">
                          {q.employeeName} · {daysLabel(q.daysToExpiry)}
                          {q.rarity === 'critical' ? ' · single holder' : ''}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                        {q.suggestedAction === 'renew' ? 'Perpanjang'
                          : q.suggestedAction === 'remind_or_renew' ? 'Remind / Renew'
                            : q.suggestedAction === 'plan_backup' ? 'Backup holder' : 'Monitor'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-amber-900/80">
                <span className="rounded-md bg-white/80 px-2 py-1 border border-amber-100">≤30h: {analytics.critical30 ?? 0}</span>
                <span className="rounded-md bg-white/80 px-2 py-1 border border-amber-100">31–60h: {analytics.warning60 ?? 0}</span>
                <span className="rounded-md bg-white/80 px-2 py-1 border border-amber-100">Segera (90h): {analytics.expiringSoon ?? 0}</span>
              </div>
            </div>

            <div className="hf-card p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Gem className="h-4 w-4 text-[color:var(--hf-brand-600)]" /> Kredensial langka (risiko organisasi)
              </h3>
              {(analytics.rare || []).length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada sertifikat dengan ≤5 pemegang. Coverage masih merata.</p>
              ) : (
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                  {(analytics.rare || []).slice(0, 8).map((r: any) => (
                    <li key={r.title} className="rounded-lg border border-[var(--hf-border)] px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{r.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{r.risk}</p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            Pemegang: {r.holders.map((h: any) => h.employeeName).join(', ')}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${RARITY_CONFIG[r.rarity]?.color || ''}`}>
                          {r.holderCount} orang
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--hf-brand-100)] bg-[var(--hf-brand-50)]/50 px-4 py-3 text-sm text-slate-700">
            <p className="font-medium text-slate-800 mb-1">Playbook aksi HR</p>
            <ul className="grid gap-1 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <li><strong className="text-slate-800">Remind</strong> — kirim/catat pengingat ke karyawan & manager sebelum expiry.</li>
              <li><strong className="text-slate-800">Renew</strong> — perpanjang tanggal kedaluwarsa setelah pelatihan/ujian ulang.</li>
              <li><strong className="text-slate-800">Transfer / Move</strong> — pindahkan kepemilikan kredensial saat mutasi/knowledge transfer.</li>
              <li><strong className="text-slate-800">Revoke</strong> — cabut jika tidak valid, salah terbit, atau compliance gagal.</li>
            </ul>
          </div>

          <OpsToolbar>
            <div className="flex flex-1 flex-wrap gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--hf-ink-faint)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari karyawan, judul, atau penerbit..."
                  className="hf-input w-full pl-9"
                />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="hf-input">
                <option value="">Semua status</option>
                <option value="valid">Valid</option>
                <option value="expiring_soon">Segera expired</option>
                <option value="expired">Expired</option>
                <option value="revoked">Dicabut</option>
              </select>
              <select value={windowFilter} onChange={(e) => setWindowFilter(e.target.value)} className="hf-input">
                <option value="">Jendela waktu</option>
                <option value="d30">≤ 30 hari</option>
                <option value="d60">≤ 60 hari</option>
                <option value="d90">≤ 90 hari</option>
                <option value="expired">Sudah expired</option>
                <option value="rare">Langka / kritis</option>
              </select>
              <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} className="hf-input">
                <option value="">Semua raritas</option>
                <option value="critical">Kritis (1 holder)</option>
                <option value="rare">Langka (≤2)</option>
                <option value="uncommon">Terbatas (≤5)</option>
                <option value="common">Umum</option>
              </select>
            </div>
            <button type="button" onClick={load} className="hf-btn-secondary inline-flex items-center gap-1">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </OpsToolbar>

          <div className="hf-card hf-analytics-panel relative overflow-hidden">
            <div className="hf-analytics-panel__rail" aria-hidden />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-[var(--hf-surface-muted)] text-xs uppercase text-[color:var(--hf-ink-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-left">Karyawan</th>
                    <th className="px-4 py-3 text-left">Sertifikat</th>
                    <th className="px-4 py-3 text-left">Sumber</th>
                    <th className="px-4 py-3 text-left">Expired</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Raritas</th>
                    <th className="px-4 py-3 text-right">Aksi HR</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && [0, 1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-4 py-3">
                        <div className="h-8 w-full animate-pulse rounded-[var(--hf-radius)] bg-[var(--hf-surface-muted)]" />
                      </td>
                    </tr>
                  ))}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6">
                        <HrisEmptyState
                          title="Belum ada sertifikat"
                          description="Tambahkan kredensial manual, atau selesaikan kursus LMS agar sertifikat otomatis masuk registry."
                          source={dataSource}
                          action={(
                            <button type="button" onClick={() => setModal({ kind: 'create' })} className="hf-btn-primary inline-flex items-center gap-2">
                              <Plus className="h-4 w-4" /> Tambah Sertifikat
                            </button>
                          )}
                        />
                      </td>
                    </tr>
                  )}
                  {!loading && filtered.map((c) => {
                    const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.valid;
                    const rar = RARITY_CONFIG[c.rarity || 'common'];
                    const canAct = c.writable !== false && !String(c.id).startsWith('emp-') && !String(c.id).startsWith('legacy-');
                    return (
                      <tr key={c.id} className="border-t hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{c.employeeName}</div>
                          <div className="text-xs text-slate-500">{c.department || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{c.title}</div>
                          <div className="text-xs text-slate-500">{c.issuer}{c.certificateNumber ? ` · ${c.certificateNumber}` : ''}</div>
                        </td>
                        <td className="px-4 py-3 capitalize text-xs text-slate-600">{c.source}</td>
                        <td className="px-4 py-3">
                          <div className="text-xs">{c.expiryDate || 'Tanpa batas'}</div>
                          {c.daysToExpiry != null && (
                            <div className={`text-xs font-semibold ${
                              c.daysToExpiry < 0 ? 'text-rose-600'
                                : c.daysToExpiry <= 30 ? 'text-orange-600'
                                  : c.daysToExpiry <= 90 ? 'text-amber-600' : 'text-slate-400'
                            }`}>
                              {daysLabel(c.daysToExpiry)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                          {c.reminderSent && <div className="mt-1 text-[10px] text-slate-400">Reminded</div>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${rar?.color || ''}`}>
                            {rar?.label || '—'}
                            {c.holderCount != null ? ` · ${c.holderCount}` : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {canAct ? (
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                title="Kirim reminder"
                                disabled={busyId === c.id || c.status === 'revoked'}
                                onClick={() => setModal({ kind: 'remind', cert: c })}
                                className="rounded p-1.5 text-amber-700 hover:bg-amber-50 disabled:opacity-40"
                              >
                                <Bell className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Perpanjang"
                                disabled={busyId === c.id || c.status === 'revoked'}
                                onClick={() => openRenew(c)}
                                className="rounded p-1.5 text-[color:var(--hf-brand-600)] hover:bg-[var(--hf-brand-50)] disabled:opacity-40"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Pindahkan / transfer"
                                disabled={busyId === c.id || c.status === 'revoked'}
                                onClick={() => { setTransferEmp(null); setModal({ kind: 'transfer', cert: c }); }}
                                className="rounded p-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                              >
                                <ArrowRightLeft className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Cabut"
                                disabled={busyId === c.id || c.status === 'revoked'}
                                onClick={() => setModal({ kind: 'revoke', cert: c })}
                                className="rounded p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="text-right text-[10px] text-slate-400">Read-only (profil/LMS)</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TalentShell>

        {/* Remind */}
        {modal?.kind === 'remind' && modal.cert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => handleBackdropMouseDown(e, closeModal)}>
            <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h3 className="font-semibold">Kirim reminder kedaluwarsa</h3>
                <button type="button" onClick={closeModal}><X className="h-5 w-5 text-slate-400" /></button>
              </div>
              <div className="space-y-3 p-5 text-sm">
                <p><strong>{modal.cert.title}</strong> — {modal.cert.employeeName}</p>
                <p className="text-slate-500">Expiry: {modal.cert.expiryDate || '—'} ({daysLabel(modal.cert.daysToExpiry)})</p>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan untuk karyawan/manager (opsional)" className="hf-input w-full min-h-[80px]" />
                <div className="flex justify-end gap-2">
                  <button type="button" className="hf-btn-secondary" onClick={closeModal}>Batal</button>
                  <button
                    type="button"
                    className="hf-btn-primary"
                    disabled={busyId === modal.cert.id}
                    onClick={() => postAction('remind', { id: modal.cert!.id, note })}
                  >
                    Catat reminder
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Renew */}
        {modal?.kind === 'renew' && modal.cert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => handleBackdropMouseDown(e, closeModal)}>
            <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h3 className="font-semibold">Perpanjang sertifikat</h3>
                <button type="button" onClick={closeModal}><X className="h-5 w-5 text-slate-400" /></button>
              </div>
              <div className="space-y-3 p-5 text-sm">
                <p><strong>{modal.cert.title}</strong> — {modal.cert.employeeName}</p>
                <label className="block text-xs font-medium">Tanggal kedaluwarsa baru *</label>
                <input type="date" value={renewDate} onChange={(e) => setRenewDate(e.target.value)} className="hf-input w-full" />
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan perpanjangan" className="hf-input w-full min-h-[72px]" />
                <div className="flex justify-end gap-2">
                  <button type="button" className="hf-btn-secondary" onClick={closeModal}>Batal</button>
                  <button
                    type="button"
                    className="hf-btn-primary"
                    disabled={!renewDate || busyId === modal.cert.id}
                    onClick={() => postAction('renew', { id: modal.cert!.id, newExpiryDate: renewDate, note })}
                  >
                    Simpan perpanjangan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transfer */}
        {modal?.kind === 'transfer' && modal.cert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => handleBackdropMouseDown(e, closeModal)}>
            <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h3 className="font-semibold">Pindahkan / transfer kepemilikan</h3>
                <button type="button" onClick={closeModal}><X className="h-5 w-5 text-slate-400" /></button>
              </div>
              <div className="space-y-3 p-5 text-sm">
                <p className="text-slate-600">
                  Dari <strong>{modal.cert.employeeName}</strong> → karyawan baru. Cocok untuk mutasi, handover, atau backup holder kredensial langka.
                </p>
                <p className="text-xs text-slate-500">{modal.cert.title}</p>
                <EmployeePicker
                  label="Penerima baru"
                  required
                  value={transferEmp?.id}
                  onChange={setTransferEmp}
                />
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Alasan transfer / knowledge transfer" className="hf-input w-full min-h-[72px]" />
                <div className="flex justify-end gap-2">
                  <button type="button" className="hf-btn-secondary" onClick={closeModal}>Batal</button>
                  <button
                    type="button"
                    className="hf-btn-primary"
                    disabled={!transferEmp || busyId === modal.cert.id}
                    onClick={() => postAction('transfer', {
                      id: modal.cert!.id,
                      toEmployeeId: transferEmp!.id,
                      toEmployeeName: transferEmp!.name,
                      toDepartment: transferEmp!.department,
                      note,
                    })}
                  >
                    Pindahkan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Revoke */}
        {modal?.kind === 'revoke' && modal.cert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => handleBackdropMouseDown(e, closeModal)}>
            <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h3 className="font-semibold text-rose-700">Cabut sertifikat</h3>
                <button type="button" onClick={closeModal}><X className="h-5 w-5 text-slate-400" /></button>
              </div>
              <div className="space-y-3 p-5 text-sm">
                <p>Cabut <strong>{modal.cert.title}</strong> milik {modal.cert.employeeName}? Status menjadi <em>revoked</em> dan tidak bisa diperpanjang.</p>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Alasan pencabutan" className="hf-input w-full min-h-[72px]" />
                <div className="flex justify-end gap-2">
                  <button type="button" className="hf-btn-secondary" onClick={closeModal}>Batal</button>
                  <button
                    type="button"
                    className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
                    disabled={busyId === modal.cert.id}
                    onClick={() => postAction('revoke', { id: modal.cert!.id, note })}
                  >
                    Cabut sekarang
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create */}
        {modal?.kind === 'create' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => handleBackdropMouseDown(e, closeModal)}>
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h3 className="font-semibold">Tambah sertifikat manual</h3>
                <button type="button" onClick={closeModal}><X className="h-5 w-5 text-slate-400" /></button>
              </div>
              <div className="space-y-3 p-5 text-sm">
                <EmployeePicker label="Karyawan" required value={createEmp?.id} onChange={setCreateEmp} />
                <div>
                  <label className="mb-1 block text-xs font-medium">Judul sertifikat *</label>
                  <input className="hf-input w-full" value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium">Penerbit</label>
                    <input className="hf-input w-full" value={createForm.issuer} onChange={(e) => setCreateForm((f) => ({ ...f, issuer: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Sumber</label>
                    <select className="hf-input w-full" value={createForm.source} onChange={(e) => setCreateForm((f) => ({ ...f, source: e.target.value }))}>
                      <option value="external">Eksternal</option>
                      <option value="license">Lisensi</option>
                      <option value="compliance">Compliance</option>
                      <option value="training">Training</option>
                      <option value="internal">Internal</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium">Tanggal terbit</label>
                    <input type="date" className="hf-input w-full" value={createForm.issuedDate} onChange={(e) => setCreateForm((f) => ({ ...f, issuedDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Tanggal expired</label>
                    <input type="date" className="hf-input w-full" value={createForm.expiryDate} onChange={(e) => setCreateForm((f) => ({ ...f, expiryDate: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Nomor sertifikat</label>
                  <input className="hf-input w-full" value={createForm.certificateNumber} onChange={(e) => setCreateForm((f) => ({ ...f, certificateNumber: e.target.value }))} />
                </div>
                <textarea className="hf-input w-full min-h-[72px]" placeholder="Catatan" value={createForm.notes} onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))} />
                <div className="flex justify-end gap-2">
                  <button type="button" className="hf-btn-secondary" onClick={closeModal}>Batal</button>
                  <button
                    type="button"
                    className="hf-btn-primary"
                    disabled={!createEmp || !createForm.title || busyId === 'create'}
                    onClick={() => postAction('create', {
                      employeeId: createEmp!.id,
                      employeeName: createEmp!.name,
                      department: createEmp!.department,
                      ...createForm,
                      expiryDate: createForm.expiryDate || undefined,
                    })}
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </HQLayout>
    </PageGuard>
  );
}
