import { useState, useEffect, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import EssKpiCard from '@/components/humanify/EssKpiCard';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import EmployeePicker, { type PickedEmployee } from '@/components/humanify/EmployeePicker';
import EmployeeAvatar from '@/components/humanify/EmployeeAvatar';
import ClaimReceiptGallery, { parseClaimReceipts } from '@/components/humanify/ClaimReceiptGallery';
import { EnterpriseTabBar } from '@/components/humanify/PerformanceModuleChrome';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import {
  User, FileText, DollarSign, Clock, Bell, Shield, Award, Send, Plus, RefreshCw,
  UploadCloud, Trash2, Loader2, Smartphone, CheckCircle, AlertTriangle,
  X, Eye, Calendar, Users, Settings,
} from 'lucide-react';
import { PlatformAccessShell } from '@/components/humanify/PlatformAccessNav';
import { ESS_PORTAL_MODULES, parseEssPortalConfig, type EssPortalConfig } from '@/lib/hris/ess-portal-config';

type ESSTab = 'overview' | 'config' | 'claims' | 'policies' | 'reminders';

const EMPTY_WORKFLOW = { claims: { pending: 0, approved: 0, rejected: 0 }, mutations: { pending: 0, approved: 0 } };
const EMPTY_REMINDER_SUMMARY = { contractExpiring30d: 0, certExpiring30d: 0, activeReminders: 0, overdueReminders: 0 };

const CLAIM_TYPES = [
  { value: 'medical', label: 'Medis & kesehatan' },
  { value: 'transport', label: 'Transportasi' },
  { value: 'meal', label: 'Makan & representasi' },
  { value: 'travel', label: 'Perjalanan dinas' },
  { value: 'training', label: 'Pelatihan' },
  { value: 'equipment', label: 'Peralatan' },
  { value: 'other', label: 'Lainnya' },
];

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Menunggu', cls: 'bg-amber-50 text-amber-800' },
  approved: { label: 'Disetujui', cls: 'bg-emerald-50 text-emerald-800' },
  rejected: { label: 'Ditolak', cls: 'bg-rose-50 text-rose-800' },
  paid: { label: 'Dibayar', cls: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]' },
  reimbursed: { label: 'Direimburse', cls: 'bg-emerald-50 text-emerald-800' },
  cancelled: { label: 'Dibatalkan', cls: 'bg-slate-100 text-slate-600' },
};

const REMINDER_TYPE: Record<string, string> = {
  contract_expiry: 'Kontrak',
  certification_expiry: 'Sertifikasi',
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-[color:var(--hf-ink-muted)]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function claimTypeLabel(code: string) {
  return CLAIM_TYPES.find((c) => c.value === code)?.label || code;
}

export default function ESSPortalPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ESSTab>('overview');
  const [claims, setClaims] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [workflowSummary, setWorkflowSummary] = useState<any>(EMPTY_WORKFLOW);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [reminderSummary, setReminderSummary] = useState<any>(EMPTY_REMINDER_SUMMARY);
  const [policyPending, setPolicyPending] = useState<any[]>([]);
  const [policyAcked, setPolicyAcked] = useState<any[]>([]);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimForm, setClaimForm] = useState<any>({});
  const [pickedEmployee, setPickedEmployee] = useState<PickedEmployee | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [claimSearch, setClaimSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const [portalConfig, setPortalConfig] = useState<EssPortalConfig>(() => parseEssPortalConfig(null));
  const [savingConfig, setSavingConfig] = useState(false);

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => { setMounted(true); }, []);

  const fetchWorkflowSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/humanify/workflow?action=summary');
      const json = await res.json();
      const summary = json.data || EMPTY_WORKFLOW;
      setWorkflowSummary(summary);
      const activity = (summary.claims?.pending || 0) + (summary.claims?.approved || 0)
        + (summary.mutations?.pending || 0) + (summary.mutations?.approved || 0);
      setDataSource(activity > 0 ? 'live' : 'empty');
    } catch {
      setWorkflowSummary(EMPTY_WORKFLOW);
      setDataSource('empty');
    }
  }, []);

  const fetchReminderSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/humanify/reminders?action=summary');
      const json = await res.json();
      setReminderSummary(json.data || EMPTY_REMINDER_SUMMARY);
    } catch {
      setReminderSummary(EMPTY_REMINDER_SUMMARY);
    }
  }, []);

  const fetchReminders = useCallback(async () => {
    try {
      const res = await fetch('/api/humanify/reminders?action=upcoming&days=60');
      const json = await res.json();
      const rows = json.data || [];
      setReminders(rows);
      if (rows.length) setDataSource('live');
    } catch {
      setReminders([]);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchWorkflowSummary(),
      fetchReminderSummary(),
      fetchReminders(),
      fetchPolicies(),
      fetch('/api/humanify/ess-config')
        .then((r) => r.json())
        .then((j) => { if (j.success) setPortalConfig(j.data); })
        .catch(() => {}),
    ]);
    setLoading(false);
  }, [fetchWorkflowSummary, fetchReminderSummary, fetchReminders]);

  useEffect(() => { if (mounted) loadAll(); }, [mounted, loadAll]);

  useEffect(() => {
    (async () => {
      try {
        const ctx = await fetch('/api/humanify/saas-context');
        if (!ctx.ok) return;
        const j = await ctx.json();
        const tid = j?.data?.tenantId;
        if (tid) localStorage.setItem(`humanify-ess-visited:${tid}`, '1');
      } catch { /* first-run checklist */ }
    })();
  }, []);

  const fetchPolicies = async () => {
    setPolicyLoading(true);
    try {
      const res = await fetch('/api/humanify/policies?action=my');
      const json = await res.json();
      setPolicyPending(json.data?.pending || []);
      setPolicyAcked(json.data?.acknowledged || []);
      if ((json.data?.pending || []).length || (json.data?.acknowledged || []).length) setDataSource('live');
    } catch {
      setPolicyPending([]);
      setPolicyAcked([]);
    } finally {
      setPolicyLoading(false);
    }
  };

  const fetchClaims = async () => {
    try {
      const res = await fetch('/api/humanify/workflow?action=claims');
      const json = await res.json();
      setClaims(json.data || []);
    } catch {
      setClaims([]);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    if (activeTab === 'claims') fetchClaims();
    if (activeTab === 'policies') fetchPolicies();
  }, [activeTab, mounted]);

  useEffect(() => {
    if (!showClaimModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowClaimModal(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showClaimModal]);

  const acknowledgePolicy = async (regulationId: string) => {
    try {
      const res = await fetch('/api/humanify/policies?action=acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regulationId }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', json.message || 'Ditandai sudah dibaca');
        fetchPolicies();
      } else showToast('error', json.error || 'Gagal');
    } catch {
      showToast('error', 'Gagal menandai kebijakan');
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append('files', f));
      const res = await fetch('/api/humanify/upload-claim', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.success && json.data) {
        setUploadedFiles((prev) => [...prev, ...json.data]);
        showToast('success', `${json.data.length} file berhasil diunggah`);
      } else {
        showToast('error', json.error || 'Gagal unggah file');
      }
    } catch {
      showToast('error', 'Gagal unggah file');
    }
    setUploading(false);
  };

  const openClaimModal = () => {
    setClaimForm({ claim_date: new Date().toISOString().split('T')[0], claim_type: 'transport' });
    setPickedEmployee(null);
    setUploadedFiles([]);
    setShowClaimModal(true);
  };

  const submitClaim = async () => {
    if (!pickedEmployee) { showToast('error', 'Pilih karyawan'); return; }
    if (!claimForm.claim_type || !claimForm.amount) {
      showToast('error', 'Lengkapi tipe dan jumlah klaim');
      return;
    }
    try {
      const receipt_url = uploadedFiles.length > 0
        ? JSON.stringify(uploadedFiles.map((f) => ({
          storageKey: f.storageKey,
          filename: f.filename,
          mimetype: f.mimetype,
        })))
        : claimForm.receipt_url || null;
      const res = await fetch('/api/humanify/workflow?action=claim', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...claimForm,
          employee_id: pickedEmployee.id,
          amount: parseFloat(claimForm.amount),
          receipt_url,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', 'Klaim berhasil diajukan');
        setShowClaimModal(false);
        setClaimForm({});
        setPickedEmployee(null);
        setUploadedFiles([]);
        fetchClaims();
        fetchWorkflowSummary();
      } else showToast('error', json.error || 'Gagal mengajukan');
    } catch {
      showToast('error', 'Gagal mengajukan');
    }
  };

  const generateReminders = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/humanify/reminders?action=generate', { method: 'POST' });
      const json = await res.json();
      showToast('success', json.message || 'Pengingat diperbarui');
      fetchReminders();
      fetchReminderSummary();
    } catch {
      showToast('error', 'Gagal membuat pengingat');
    } finally {
      setGenerating(false);
    }
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const fmtCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

  const filteredClaims = claims.filter((c) => {
    const q = claimSearch.trim().toLowerCase();
    if (!q) return true;
    return `${c.claim_number || ''} ${c.employee_name || ''} ${c.claim_type || ''} ${c.description || ''}`.toLowerCase().includes(q);
  });

  const reminderUrgency = (due: string) => {
    const daysLeft = Math.ceil((new Date(due).getTime() - Date.now()) / 86400000);
    if (daysLeft <= 0) return { daysLeft, bar: 'border-l-rose-600', text: 'text-rose-700', label: 'Lewat batas' };
    if (daysLeft <= 7) return { daysLeft, bar: 'border-l-rose-500', text: 'text-rose-700', label: `${daysLeft} hari lagi` };
    if (daysLeft <= 14) return { daysLeft, bar: 'border-l-amber-500', text: 'text-amber-800', label: `${daysLeft} hari lagi` };
    return { daysLeft, bar: 'border-l-[var(--hf-brand-500)]', text: 'text-[color:var(--hf-brand-600)]', label: `${daysLeft} hari lagi` };
  };

  if (!mounted) return null;

  const savePortalConfig = async () => {
    if (!portalConfig || savingConfig) return;
    setSavingConfig(true);
    try {
      const res = await fetch('/api/humanify/ess-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portalConfig),
      });
      const j = await res.json();
      if (j.success) {
        setPortalConfig(j.data);
        showToast('success', 'Konfigurasi portal tersimpan');
      } else showToast('error', j.error || 'Gagal menyimpan');
    } catch {
      showToast('error', 'Gagal menyimpan konfigurasi');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <HQLayout title={t('hris.essTitle')} subtitle="Konsol HR untuk portal karyawan">
        {toast && (
          <div role="status" className={`fixed top-4 right-4 z-50 rounded-[var(--hf-radius)] px-4 py-3 text-sm text-white shadow-[var(--hf-shadow-md)] ${toast.type === 'error' ? 'bg-[var(--hf-danger)]' : 'bg-[var(--hf-success)]'}`}>
            {toast.message}
          </div>
        )}

        <PlatformAccessShell
            current="ess"
            title="Konfigurasi & konsol ESS"
            subtitle="Atur modul portal karyawan, pengumuman, dan pantau klaim atau pengingat kontrak dari sisi HR."
            icon={User}
            actions={
              <>
                <DataSourceBadge source={dataSource} />
                <button type="button" onClick={loadAll} className="hf-btn-secondary inline-flex items-center gap-2">
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Segarkan
                </button>
                <Link href="/employee" target="_blank" rel="noopener noreferrer" className="hf-btn-primary inline-flex items-center gap-2">
                  <Smartphone className="h-4 w-4" /> Buka portal karyawan
                </Link>
              </>
            }
          >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[156px] animate-pulse hf-card" />
              ))
            ) : (
              <>
                <EssKpiCard
                  label="Klaim tertunda"
                  value={workflowSummary?.claims?.pending || 0}
                  subLabel="Menunggu persetujuan HR"
                  helpText="Klik untuk review dan setujui klaim karyawan."
                  icon={Clock}
                  severity={(workflowSummary?.claims?.pending || 0) > 0 ? 'warning' : 'normal'}
                  progress={workflowSummary?.claims?.pending || 0}
                  progressMax={(workflowSummary?.claims?.pending || 0) + (workflowSummary?.claims?.approved || 0) + (workflowSummary?.claims?.rejected || 0) || 1}
                  onClick={() => setActiveTab('claims')}
                  actionLabel="Proses klaim"
                />
                <EssKpiCard
                  label="Klaim disetujui"
                  value={workflowSummary?.claims?.approved || 0}
                  subLabel="Total disetujui bulan ini"
                  icon={CheckCircle}
                  severity="success"
                  progress={workflowSummary?.claims?.approved || 0}
                  progressMax={(workflowSummary?.claims?.pending || 0) + (workflowSummary?.claims?.approved || 0) + (workflowSummary?.claims?.rejected || 0) || 1}
                  onClick={() => setActiveTab('claims')}
                  actionLabel="Lihat semua klaim"
                />
                <EssKpiCard
                  label="Kontrak akan habis"
                  value={reminderSummary?.contractExpiring30d || 0}
                  subLabel="Dalam 30 hari ke depan"
                  helpText="Segera tindak lanjuti perpanjangan kontrak."
                  icon={AlertTriangle}
                  severity={(reminderSummary?.contractExpiring30d || 0) > 0 ? 'danger' : 'normal'}
                  onClick={() => setActiveTab('reminders')}
                  actionLabel="Kelola pengingat"
                />
                <EssKpiCard
                  label="Sertifikasi kedaluwarsa"
                  value={reminderSummary?.certExpiring30d || 0}
                  subLabel="Dalam 30 hari ke depan"
                  helpText="Perbarui sertifikasi karyawan sebelum kedaluwarsa."
                  icon={Award}
                  severity={(reminderSummary?.certExpiring30d || 0) > 0 ? 'danger' : 'normal'}
                  onClick={() => setActiveTab('reminders')}
                  actionLabel="Kelola sertifikasi"
                />
              </>
            )}
          </div>


          <EnterpriseTabBar
            tabs={[
              { key: 'overview', label: 'Ringkasan', icon: User },
              { key: 'config', label: 'Konfigurasi portal', icon: Settings },
              { key: 'claims', label: 'Klaim', icon: DollarSign, count: workflowSummary?.claims?.pending || undefined },
              { key: 'policies', label: 'Kebijakan', icon: Shield, count: policyPending.length || undefined },
              { key: 'reminders', label: 'Pengingat', icon: Bell, count: reminderSummary?.overdueReminders || reminders.length || undefined },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === 'config' && (
            <div className="hf-card space-y-5 p-5">
              <div>
                <h2 className="text-sm font-semibold text-[color:var(--hf-ink)]">Modul yang tampil di portal karyawan</h2>
                <p className="mt-0.5 text-xs text-[color:var(--hf-ink-muted)]">Absensi dan beranda tetap ada. Nonaktifkan modul yang tidak dipakai perusahaan.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {ESS_PORTAL_MODULES.map((mod) => (
                  <label key={mod.key} className="flex items-center gap-2 rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-white px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={portalConfig?.modules?.[mod.key] !== false}
                      onChange={(e) => setPortalConfig((prev) => prev ? {
                        ...prev,
                        modules: { ...prev.modules, [mod.key]: e.target.checked },
                      } : prev)}
                    />
                    {mod.label}
                  </label>
                ))}
              </div>
              <label className="flex items-start gap-2 rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-white px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={portalConfig?.requireFaceEnrollment !== false}
                  onChange={(e) => setPortalConfig((prev) => prev ? { ...prev, requireFaceEnrollment: e.target.checked } : prev)}
                />
                <span>
                  <span className="font-medium text-[color:var(--hf-ink)]">Wajib daftar wajah saat pertama masuk</span>
                  <span className="mt-0.5 block text-xs text-[color:var(--hf-ink-muted)]">Clock in/out tetap memakai liveness kamera. Matikan hanya jika onboarding wajah ditunda.</span>
                </span>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-[color:var(--hf-ink-muted)]">Pengumuman di beranda portal</span>
                <textarea
                  rows={3}
                  maxLength={280}
                  value={portalConfig?.announcement || ''}
                  onChange={(e) => setPortalConfig((prev) => prev ? { ...prev, announcement: e.target.value } : prev)}
                  placeholder="Contoh: Isi slip gaji sebelum tanggal 5."
                  className="mt-1 w-full rounded-[var(--hf-radius)] border border-[var(--hf-border)] px-3 py-2 text-sm"
                />
              </label>
              <button type="button" onClick={savePortalConfig} disabled={savingConfig} className="hf-btn-primary text-sm disabled:opacity-50">
                {savingConfig ? 'Menyimpan…' : 'Simpan konfigurasi portal'}
              </button>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { title: 'Portal vs konsol ini', desc: 'Karyawan absen, cuti, dan slip gaji di /employee. Halaman ini untuk HR memantau antrian dan pengingat.' },
                  { title: 'Klaim & reimbursement', desc: 'Ajukan atas nama karyawan, atau kelola approval penuh di Reimbursement HR dan MSS.' },
                  { title: 'Kebijakan & kontrak', desc: 'Tanda terima peraturan, plus pengingat kontrak dan sertifikasi 30 hari ke depan.' },
                ].map((item) => (
                  <div key={item.title} className="rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-white p-4">
                    <p className="text-sm font-semibold text-[color:var(--hf-ink)]">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[color:var(--hf-ink-muted)]">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="hf-card p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[color:var(--hf-ink)]">Pengingat mendatang</h2>
                  <button type="button" onClick={() => setActiveTab('reminders')} className="text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline">Lihat semua</button>
                </div>
                {reminders.length === 0 ? (
                  <HrisEmptyState
                    source={dataSource}
                    title="Tidak ada pengingat"
                    description="Generate pengingat dari tab Pengingat setelah data kontrak atau sertifikasi terisi."
                  />
                ) : (
                  <div className="space-y-2">
                    {reminders.slice(0, 5).map((r: any) => {
                      const u = reminderUrgency(r.due_date);
                      return (
                        <div key={r.id} className={`rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] border-l-4 ${u.bar} bg-white px-3 py-3`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[color:var(--hf-ink)]">{r.title}</p>
                              <p className="text-xs text-[color:var(--hf-ink-muted)]">{r.employee_name} · {r.department}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-xs text-[color:var(--hf-ink-secondary)]">{fmtDate(r.due_date)}</p>
                              <p className={`text-[11px] font-semibold ${u.text}`}>{u.label}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'claims' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <input
                  value={claimSearch}
                  onChange={(e) => setClaimSearch(e.target.value)}
                  placeholder="Cari no. klaim, karyawan, atau tipe…"
                  className="hf-input sm:max-w-sm"
                  aria-label="Cari klaim"
                />
                <button type="button" onClick={openClaimModal} className="hf-btn-primary inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Ajukan klaim
                </button>
              </div>
              {filteredClaims.length === 0 ? (
                <HrisEmptyState
                  source={dataSource}
                  title={claims.length === 0 ? 'Belum ada klaim' : 'Tidak ada yang cocok'}
                  description="Ajukan klaim atas nama karyawan, atau buka Reimbursement HR untuk approval lengkap."
                  action={
                    <button type="button" onClick={openClaimModal} className="hf-btn-primary inline-flex items-center gap-2">
                      <Plus className="h-4 w-4" /> Ajukan klaim
                    </button>
                  }
                />
              ) : (
                <div className="hf-table-wrap overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>No. klaim</th>
                        <th>Karyawan</th>
                        <th>Tipe</th>
                        <th className="text-right">Jumlah</th>
                        <th>Tanggal</th>
                        <th>Bukti</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClaims.map((c: any) => {
                        const st = STATUS_MAP[c.status] || { label: c.status, cls: 'bg-slate-100 text-slate-600' };
                        const proofs = parseClaimReceipts(c.receipt_url);
                        return (
                          <tr key={c.id}>
                            <td className="font-medium text-[color:var(--hf-ink)]">{c.claim_number}</td>
                            <td>
                              <div className="flex items-center gap-2.5">
                                <EmployeeAvatar name={c.employee_name} photoUrl={c.photo_url} size="sm" />
                                <div>
                                  <p className="text-[color:var(--hf-ink)]">{c.employee_name}</p>
                                  <p className="text-xs text-[color:var(--hf-ink-faint)]">{c.department} · {c.position}</p>
                                </div>
                              </div>
                            </td>
                            <td>{claimTypeLabel(c.claim_type)}</td>
                            <td className="text-right tabular-nums font-medium">{fmtCurrency(c.amount)}</td>
                            <td className="text-xs">{fmtDate(c.claim_date)}</td>
                            <td>
                              {proofs.length > 0 ? <ClaimReceiptGallery receiptUrl={c.receipt_url} compact maxThumbs={2} /> : <span className="text-[color:var(--hf-ink-faint)]">—</span>}
                            </td>
                            <td>
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${st.cls}`}>{st.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'policies' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[color:var(--hf-ink)]">Tanda terima kebijakan</h2>
                <button type="button" onClick={fetchPolicies} className="hf-btn-secondary inline-flex items-center gap-1.5 text-xs">
                  <RefreshCw className="h-3.5 w-3.5" /> Muat ulang
                </button>
              </div>
              {policyLoading ? (
                <p className="flex items-center gap-2 text-sm text-[color:var(--hf-ink-muted)]"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</p>
              ) : (
                <>
                  <div>
                    <p className="hf-section-label mb-2">Menunggu tanda terima ({policyPending.length})</p>
                    {policyPending.length === 0 ? (
                      <p className="text-sm text-[color:var(--hf-ink-muted)]">Tidak ada kebijakan pending.</p>
                    ) : (
                      <div className="space-y-2">
                        {policyPending.map((p: any) => (
                          <div key={p.id} className="flex flex-col gap-3 rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-white p-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="font-medium text-[color:var(--hf-ink)]">{p.title}</p>
                              <p className="mt-0.5 text-xs text-[color:var(--hf-ink-muted)]">{p.regulation_number || '—'} · {p.category}</p>
                              {p.description && <p className="mt-2 line-clamp-3 text-sm text-[color:var(--hf-ink-secondary)]">{p.description}</p>}
                            </div>
                            <button type="button" onClick={() => acknowledgePolicy(p.id)} className="hf-btn-primary shrink-0 text-sm">
                              Saya sudah baca
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="hf-section-label mb-2">Sudah ditandai ({policyAcked.length})</p>
                    {policyAcked.length === 0 ? (
                      <p className="text-sm text-[color:var(--hf-ink-faint)]">Belum ada.</p>
                    ) : (
                      <ul className="space-y-1.5 text-sm text-[color:var(--hf-ink-secondary)]">
                        {policyAcked.map((p: any) => (
                          <li key={p.id} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                            {p.title}
                            <span className="text-xs text-[color:var(--hf-ink-faint)]">{p.acknowledged_at ? fmtDate(p.acknowledged_at) : ''}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'reminders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[color:var(--hf-ink)]">Pengingat aktif</h2>
                <button type="button" onClick={generateReminders} disabled={generating} className="hf-btn-secondary inline-flex items-center gap-1.5 disabled:opacity-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} /> Buat pengingat
                </button>
              </div>
              {reminders.length === 0 ? (
                <HrisEmptyState
                  source={dataSource}
                  title="Tidak ada pengingat"
                  description="Sistem menandai kontrak dan sertifikasi yang akan habis. Klik Buat pengingat setelah data master terisi."
                  action={
                    <button type="button" onClick={generateReminders} className="hf-btn-primary">Buat pengingat</button>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {reminders.map((r: any) => {
                    const u = reminderUrgency(r.due_date);
                    return (
                      <div key={r.id} className={`rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] border-l-4 ${u.bar} bg-white p-4`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[var(--hf-surface-muted)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--hf-ink-muted)]">
                                {REMINDER_TYPE[r.reminder_type] || r.reminder_type}
                              </span>
                              <p className="text-sm font-medium text-[color:var(--hf-ink)]">{r.title}</p>
                            </div>
                            <p className="mt-0.5 text-xs text-[color:var(--hf-ink-muted)]">{r.employee_name} · {r.department} · {r.position}</p>
                            {r.description && <p className="mt-1 text-xs text-[color:var(--hf-ink-faint)]">{r.description}</p>}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs text-[color:var(--hf-ink-secondary)]">{fmtDate(r.due_date)}</p>
                            <p className={`text-xs font-semibold ${u.text}`}>{u.label}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </PlatformAccessShell>

        {showClaimModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowClaimModal(false)} role="presentation">
            <div role="dialog" aria-modal="true" aria-labelledby="ess-claim-title" className="max-h-[90vh] w-full max-w-md overflow-y-auto hf-card" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-[var(--hf-border)] px-5 py-4">
                <h3 id="ess-claim-title" className="text-sm font-semibold text-[color:var(--hf-ink)]">Ajukan klaim</h3>
                <button type="button" onClick={() => setShowClaimModal(false)} className="rounded-[var(--hf-radius)] p-1 hover:bg-[var(--hf-surface-muted)]" aria-label="Tutup">
                  <X className="h-5 w-5 text-[color:var(--hf-ink-faint)]" />
                </button>
              </div>
              <div className="space-y-3 p-5">
                <EmployeePicker
                  value={pickedEmployee?.id}
                  label="Karyawan *"
                  required
                  onChange={setPickedEmployee}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tipe klaim *">
                    <select className="hf-input w-full" value={claimForm.claim_type || ''} onChange={(e) => setClaimForm((f: any) => ({ ...f, claim_type: e.target.value }))}>
                      <option value="">Pilih</option>
                      {CLAIM_TYPES.map((ct) => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Jumlah (Rp) *">
                    <input type="number" className="hf-input w-full" value={claimForm.amount || ''} onChange={(e) => setClaimForm((f: any) => ({ ...f, amount: e.target.value }))} />
                  </Field>
                </div>
                <Field label="Tanggal klaim">
                  <input type="date" className="hf-input w-full" value={claimForm.claim_date || ''} onChange={(e) => setClaimForm((f: any) => ({ ...f, claim_date: e.target.value }))} />
                </Field>
                <Field label="Deskripsi">
                  <textarea className="hf-input w-full" rows={2} value={claimForm.description || ''} onChange={(e) => setClaimForm((f: any) => ({ ...f, description: e.target.value }))} />
                </Field>
                <Field label="No. bukti / kwitansi">
                  <input className="hf-input w-full" value={claimForm.receipt_number || ''} onChange={(e) => setClaimForm((f: any) => ({ ...f, receipt_number: e.target.value }))} />
                </Field>
                <div>
                  <span className="text-xs font-medium text-[color:var(--hf-ink-muted)]">Lampiran bukti (foto / PDF)</span>
                  <div
                    className={`mt-1 rounded-[var(--hf-radius)] border border-dashed p-4 text-center ${uploading ? 'border-[var(--hf-brand-100)] bg-[var(--hf-brand-50)]' : 'border-[var(--hf-border)]'}`}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFileUpload(e.dataTransfer.files); }}
                  >
                    {uploading ? (
                      <div className="flex items-center justify-center gap-2 text-[color:var(--hf-brand-600)]">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Mengunggah…</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="mx-auto mb-1 h-8 w-8 text-[color:var(--hf-ink-faint)]" />
                        <p className="text-xs text-[color:var(--hf-ink-muted)]">Seret file ke sini, atau</p>
                        <label className="hf-btn-primary mt-2 inline-block cursor-pointer text-xs">
                          Pilih file
                          <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
                        </label>
                        <p className="mt-1 text-[11px] text-[color:var(--hf-ink-faint)]">Maks 10MB. JPG, PNG, PDF</p>
                      </>
                    )}
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {uploadedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-[var(--hf-radius)] bg-[var(--hf-surface-muted)] px-3 py-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-[color:var(--hf-brand-600)]" />
                            <span className="truncate text-xs text-[color:var(--hf-ink)]">{file.filename}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {file.url && (
                              <a href={file.url} target="_blank" rel="noopener noreferrer" className="rounded p-1 text-[color:var(--hf-ink-faint)] hover:text-[color:var(--hf-brand-600)]">
                                <Eye className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <button type="button" onClick={() => setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))} className="rounded p-1 text-[color:var(--hf-ink-faint)] hover:text-rose-700">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-[var(--hf-border)] px-5 py-4">
                <button type="button" onClick={() => { setShowClaimModal(false); setUploadedFiles([]); }} className="hf-btn-secondary">Batal</button>
                <button type="button" onClick={submitClaim} disabled={uploading} className="hf-btn-primary inline-flex items-center gap-1.5 disabled:opacity-50">
                  <Send className="h-3.5 w-3.5" /> Ajukan
                </button>
              </div>
            </div>
          </div>
        )}
      </HQLayout>
  );
}
