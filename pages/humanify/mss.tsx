import { useState, useEffect } from 'react';
import Link from 'next/link';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import ClaimReceiptGallery, { parseClaimReceipts } from '@/components/humanify/ClaimReceiptGallery';
import EmployeeAvatar from '@/components/humanify/EmployeeAvatar';
import {
  Shield, Users, Clock, CheckCircle, XCircle, DollarSign,
  ArrowRightLeft, Bell, AlertTriangle, Eye, ChevronRight,
  BarChart3, FileText, RefreshCw, Send, Filter, Image, Paperclip,
  Timer, CalendarClock, TrendingUp, X, GraduationCap, Target, Plane,
} from 'lucide-react';
import { EnterpriseTabBar } from '@/components/humanify/PerformanceModuleChrome';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import HRStatCard from '@/components/humanify/HRStatCard';
import { OpsKpiShell } from '@/components/humanify/OpsPageChrome';
import { PlatformAccessShell } from '@/components/humanify/PlatformAccessNav';
import { isMutationDeferredPending } from '@/lib/hris/mutation-apply-due';

type MSSTab = 'overview' | 'claims-approval' | 'mutations-approval' | 'overtime-approval' | 'training-approval' | 'okr-approval' | 'travel-approval' | 'team';

const EMPTY_WORKFLOW = {
  claims: { pending: 0, approved: 0, rejected: 0 },
  mutations: { pending: 0, approved: 0 },
  overtime: { pending: 0, approved: 0 },
  training: { pending: 0 },
  okr: { pending: 0 },
  travel: { pending: 0 },
};
const EMPTY_REMINDER_SUMMARY = { contractExpiring30d: 0, certExpiring30d: 0, activeReminders: 0, overdueReminders: 0 };

export default function MSSPortalPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MSSTab>('overview');

  // Data
  const [workflowSummary, setWorkflowSummary] = useState<any>(EMPTY_WORKFLOW);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [reminderSummary, setReminderSummary] = useState<any>(EMPTY_REMINDER_SUMMARY);
  const [claims, setClaims] = useState<any[]>([]);
  const [mutations, setMutations] = useState<any[]>([]);
  const [overtimes, setOvertimes] = useState<any[]>([]);
  const [otLoading, setOtLoading] = useState(false);
  const [trainingReqs, setTrainingReqs] = useState<any[]>([]);
  const [okrPending, setOkrPending] = useState<any[]>([]);
  const [travelReqs, setTravelReqs] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('');

  // Approval modal
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalType, setApprovalType] = useState<'claim' | 'mutation' | 'overtime' | 'training' | 'okr' | 'travel'>('claim');
  const [approvalItem, setApprovalItem] = useState<any>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComments, setApprovalComments] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [proofClaim, setProofClaim] = useState<any>(null);

  // Toast
  const [toast, setToast] = useState<any>(null);
  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) loadAll(); }, [mounted]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchWorkflowSummary(), fetchReminderSummary()]);
    setLoading(false);
  };

  const fetchWorkflowSummary = async () => {
    try {
      const res = await fetch('/api/humanify/workflow?action=summary');
      const json = await res.json();
      const summary = json.data || EMPTY_WORKFLOW;
      setWorkflowSummary(summary);
      const activity = (summary.claims?.pending || 0) + (summary.claims?.approved || 0)
        + (summary.mutations?.pending || 0) + (summary.mutations?.approved || 0)
        + (summary.overtime?.pending || 0) + (summary.overtime?.approved || 0);
      setDataSource(activity > 0 ? 'live' : 'empty');
    } catch (e) { console.error(e); setWorkflowSummary(EMPTY_WORKFLOW); setDataSource('empty'); }
  };

  const fetchReminderSummary = async () => {
    try {
      const res = await fetch('/api/humanify/reminders?action=summary');
      const json = await res.json();
      setReminderSummary(json.data || EMPTY_REMINDER_SUMMARY);
    } catch (e) { console.error(e); setReminderSummary(EMPTY_REMINDER_SUMMARY); }
  };

  const fetchOvertimes = async (status?: string) => {
    setOtLoading(true);
    try {
      const params = new URLSearchParams({ action: 'list' });
      if (status) params.set('status', status);
      const res = await fetch(`/api/humanify/overtime?${params}`);
      const json = await res.json();
      if (json.success) setOvertimes(json.data?.records || []);
    } catch { setOvertimes([]); }
    finally { setOtLoading(false); }
  };

  const fetchClaims = async (status?: string) => {
    try {
      const params = new URLSearchParams({ action: 'claims' });
      if (status) params.set('status', status);
      const res = await fetch(`/api/humanify/workflow?${params}`);
      const json = await res.json();
      setClaims(json.data || []);
    } catch (e) { console.error(e); setClaims([]); }
  };

  const fetchMutations = async (status?: string) => {
    try {
      const params = new URLSearchParams({ action: 'mutations' });
      if (status) params.set('status', status);
      const res = await fetch(`/api/humanify/workflow?${params}`);
      const json = await res.json();
      setMutations(json.data || []);
    } catch (e) { console.error(e); setMutations([]); }
  };

  const fetchTraining = async () => {
    try {
      const res = await fetch('/api/humanify/training?action=requests&status=pending');
      const json = await res.json();
      setTrainingReqs(json.data || []);
    } catch { setTrainingReqs([]); }
  };

  const fetchOkr = async () => {
    try {
      const res = await fetch('/api/humanify/okr?status=pending_approval');
      const json = await res.json();
      setOkrPending(json.data || []);
    } catch { setOkrPending([]); }
  };

  const fetchTravel = async () => {
    try {
      const res = await fetch('/api/humanify/travel-expense?action=requests&status=pending');
      const json = await res.json();
      setTravelReqs(json.data || []);
    } catch { setTravelReqs([]); }
  };

  useEffect(() => {
    if (!mounted) return;
    if (activeTab === 'claims-approval')   fetchClaims(filterStatus || undefined);
    if (activeTab === 'mutations-approval') fetchMutations(filterStatus || undefined);
    if (activeTab === 'overtime-approval') fetchOvertimes(filterStatus || undefined);
    if (activeTab === 'training-approval') fetchTraining();
    if (activeTab === 'okr-approval') fetchOkr();
    if (activeTab === 'travel-approval') fetchTravel();
  }, [activeTab, filterStatus]);

  const OT_TYPE_LABEL: Record<string, string> = { regular: 'Reguler', emergency: 'Darurat', project: 'Proyek' };
  const DAY_TYPE_LABEL: Record<string, { label: string; color: string }> = { weekday: { label: 'Hari Kerja', color: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand)]' }, weekend: { label: 'Akhir Pekan', color: 'bg-purple-50 text-purple-700' }, holiday: { label: 'Hari Libur', color: 'bg-red-50 text-red-700' } };

  const openApproval = (type: 'claim' | 'mutation' | 'overtime' | 'training' | 'okr' | 'travel', item: any, action: 'approve' | 'reject') => {
    setApprovalType(type);
    setApprovalItem(item);
    setApprovalAction(action);
    setApprovalComments('');
    setApprovedAmount(item.amount ? String(item.amount) : '');
    setShowApprovalModal(true);
  };

  const submitApproval = async () => {
    if (approvalAction === 'reject' && !approvalComments.trim()) {
      showToast('error', 'Alasan penolakan wajib diisi');
      return;
    }

    try {
      let apiUrl = '';
      let body: any = { id: approvalItem.id, comments: approvalComments, rejection_reason: approvalAction === 'reject' ? approvalComments : undefined, notes: approvalComments, reason: approvalComments, note: approvalComments };

      if (approvalType === 'claim') {
        apiUrl = `/api/humanify/workflow?action=${approvalAction === 'approve' ? 'approve-claim' : 'reject-claim'}`;
        if (approvalAction === 'approve') body.approved_amount = parseFloat(approvedAmount) || approvalItem.amount;
      } else if (approvalType === 'mutation') {
        apiUrl = `/api/humanify/workflow?action=${approvalAction === 'approve' ? 'approve-mutation' : 'reject-mutation'}`;
      } else if (approvalType === 'overtime') {
        apiUrl = `/api/humanify/overtime?action=${approvalAction === 'approve' ? 'approve' : 'reject'}`;
      } else if (approvalType === 'training') {
        apiUrl = `/api/humanify/training?action=${approvalAction === 'approve' ? 'approve-request' : 'reject-request'}`;
      } else if (approvalType === 'okr') {
        apiUrl = `/api/humanify/okr?action=${approvalAction === 'approve' ? 'approve' : 'reject'}`;
      } else if (approvalType === 'travel') {
        apiUrl = `/api/humanify/travel-expense?action=${approvalAction === 'approve' ? 'approve-request' : 'reject-request'}`;
        body = { ...body, id: approvalItem.id };
      }

      const res = await fetch(apiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (json.success) {
        const deferred = !!json.deferred;
        const msg = deferred
          ? (json.message || 'Disetujui — penempatan menunggu tanggal efektif')
          : (approvalType === 'overtime' && json.compOffDays > 0
            ? (json.message || `Lembur disetujui — ${json.compOffDays} hari cuti pengganti`)
            : (json.message || 'Berhasil'));
        showToast('success', msg);
        setShowApprovalModal(false);
        if (approvalType === 'claim')    fetchClaims(filterStatus || undefined);
        else if (approvalType === 'mutation') fetchMutations(filterStatus || undefined);
        else if (approvalType === 'overtime') fetchOvertimes(filterStatus || undefined);
        else if (approvalType === 'training') fetchTraining();
        else if (approvalType === 'okr') fetchOkr();
        else if (approvalType === 'travel') fetchTravel();
        fetchWorkflowSummary();
      } else showToast('error', json.error || 'Gagal');
    } catch (e) { showToast('error', 'Gagal memproses'); }
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
  const fmtCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700', paid: 'bg-[var(--hf-brand-100)] text-[color:var(--hf-brand)]',
      executed: 'bg-[var(--hf-brand-100)] text-[color:var(--hf-brand)]', cancelled: 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)]'
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)]'}`}>{status}</span>;
  };

  if (!mounted) return null;

  return (
    <HQLayout title={t('hris.mssTitle')} currentMenu="hris">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-[var(--hf-radius)] px-4 py-3 text-sm text-white shadow-[var(--hf-shadow-md)] ${toast.type === 'success' ? 'bg-[var(--hf-success)]' : 'bg-[var(--hf-danger)]'}`}>
          {toast.message}
        </div>
      )}

      <PlatformAccessShell
        current="mss"
        title="Persetujuan HR (MSS)"
        subtitle="Antrian tenant-wide untuk klaim, mutasi, lembur, pelatihan, OKR, dan perjalanan dinas."
        icon={Shield}
        actions={<DataSourceBadge source={dataSource} />}
      >
        <p className="rounded-[var(--hf-radius)] border border-[color:var(--hf-warning)]/30 bg-[color:var(--hf-warning)]/10 px-3 py-2 text-xs text-[color:var(--hf-ink)]">
          Lingkup <strong>seluruh perusahaan</strong> (HR/ops). Persetujuan atasan langsung ada di{' '}
          <a href="/employee" target="_blank" rel="noopener noreferrer" className="font-semibold text-[color:var(--hf-brand-600)] hover:underline">Panel Manajer ESS</a>.
        </p>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <OpsKpiShell><HRStatCard label="Klaim" value={workflowSummary?.claims?.pending || 0} icon={Clock} accent="amber" onClick={() => setActiveTab('claims-approval')} /></OpsKpiShell>
          <OpsKpiShell><HRStatCard label="Mutasi" value={workflowSummary?.mutations?.pending || 0} icon={ArrowRightLeft} accent="orange" onClick={() => setActiveTab('mutations-approval')} /></OpsKpiShell>
          <OpsKpiShell><HRStatCard label="Lembur" value={workflowSummary?.overtime?.pending || 0} icon={Timer} accent="rose" onClick={() => setActiveTab('overtime-approval')} /></OpsKpiShell>
          <OpsKpiShell><HRStatCard label="Pelatihan" value={workflowSummary?.training?.pending || 0} icon={GraduationCap} accent="violet" onClick={() => setActiveTab('training-approval')} /></OpsKpiShell>
          <OpsKpiShell><HRStatCard label="OKR" value={workflowSummary?.okr?.pending || 0} icon={Target} accent="emerald" onClick={() => setActiveTab('okr-approval')} /></OpsKpiShell>
          <OpsKpiShell><HRStatCard label="Travel" value={workflowSummary?.travel?.pending || 0} icon={Plane} accent="blue" onClick={() => setActiveTab('travel-approval')} /></OpsKpiShell>
        </div>

        <EnterpriseTabBar
          tabs={[
            { key: 'overview', label: 'Ringkasan', icon: BarChart3 },
            { key: 'claims-approval', label: 'Klaim', icon: DollarSign, count: workflowSummary?.claims?.pending || undefined },
            { key: 'mutations-approval', label: 'Mutasi', icon: ArrowRightLeft, count: workflowSummary?.mutations?.pending || undefined },
            { key: 'overtime-approval', label: 'Lembur', icon: Timer, count: overtimes.filter((o) => o.status === 'pending').length || undefined },
            { key: 'training-approval', label: 'Pelatihan', icon: GraduationCap, count: workflowSummary?.training?.pending || undefined },
            { key: 'okr-approval', label: 'OKR', icon: Target, count: workflowSummary?.okr?.pending || undefined },
            { key: 'travel-approval', label: 'Travel', icon: Plane, count: workflowSummary?.travel?.pending || undefined },
          ]}
          active={activeTab}
          onChange={(key) => { setActiveTab(key); setFilterStatus(''); }}
        />

        <div className="hf-card p-5">
            {/* ===== OVERVIEW ===== */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pending Claims */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-[color:var(--hf-ink)] flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-yellow-600" /> Klaim Menunggu Persetujuan
                      </h4>
                      <button onClick={() => setActiveTab('claims-approval')} className="text-xs text-[color:var(--hf-brand-600)] hover:underline flex items-center gap-0.5">
                        Lihat Semua <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-3xl font-bold text-[color:var(--hf-ink)]">{workflowSummary?.claims?.pending || 0}</p>
                    <p className="text-xs text-[color:var(--hf-ink-faint)] mt-1">Klik untuk mereview dan menyetujui</p>
                  </div>

                  {/* Pending Mutations */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-[color:var(--hf-ink)] flex items-center gap-1.5">
                        <ArrowRightLeft className="w-4 h-4 text-orange-600" /> Mutasi Menunggu Persetujuan
                      </h4>
                      <button onClick={() => setActiveTab('mutations-approval')} className="text-xs text-[color:var(--hf-brand-600)] hover:underline flex items-center gap-0.5">
                        Lihat Semua <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-3xl font-bold text-[color:var(--hf-ink)]">{workflowSummary?.mutations?.pending || 0}</p>
                    <p className="text-xs text-[color:var(--hf-ink-faint)] mt-1">Transfer, promosi, dan rotasi karyawan</p>
                  </div>
                </div>

                {/* Alert reminders */}
                {(reminderSummary?.contractExpiring30d || 0) > 0 && (
                  <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium text-orange-800">Perhatian: {reminderSummary.contractExpiring30d} kontrak akan berakhir dalam 30 hari</p>
                        <p className="text-xs text-orange-600 mt-0.5">Segera review dan perpanjang kontrak karyawan yang akan habis masa berlakunya</p>
                      </div>
                    </div>
                  </div>
                )}
                {(reminderSummary?.overdueReminders || 0) > 0 && (
                  <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="text-sm font-medium text-red-800">{reminderSummary.overdueReminders} pengingat sudah melewati batas waktu!</p>
                        <p className="text-xs text-red-600 mt-0.5">Segera tindak lanjuti pengingat yang terlambat</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== CLAIMS APPROVAL ===== */}
            {activeTab === 'claims-approval' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[color:var(--hf-ink)]">Persetujuan Klaim Reimbursement</h3>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-1.5 border rounded-lg text-sm">
                    <option value="">Semua Status</option>
                    <option value="pending">Tertunda</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                    <option value="paid">Dibayar</option>
                  </select>
                </div>

                {claims.length === 0 ? (
                  <HrisEmptyState
                    source={dataSource}
                    title="Tidak ada klaim"
                    description="Klaim karyawan akan muncul di sini untuk persetujuan HR."
                  />
                ) : (
                  <div className="space-y-3">
                    {claims.map((c: any) => {
                      const proofCount = parseClaimReceipts(c.receipt_url).length || c.attachments_count || 0;
                      return (
                      <div key={c.id} className="border rounded-lg p-4 hover:bg-[var(--hf-surface-muted)]">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[color:var(--hf-ink)]">{c.claim_number}</span>
                              {statusBadge(c.status)}
                              <span className="px-2 py-0.5 bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)] text-[10px] rounded">{c.claim_type}</span>
                            </div>
                            <div className="mt-2 flex items-center gap-2.5">
                              <EmployeeAvatar name={c.employee_name} photoUrl={c.photo_url} size="sm" />
                              <p className="text-sm text-[color:var(--hf-ink-muted)]">{c.employee_name} • {c.department} • {c.position}</p>
                            </div>
                            <p className="text-xs text-[color:var(--hf-ink-faint)] mt-0.5">Tanggal: {fmtDate(c.claim_date)} {c.description ? `• ${c.description}` : ''}</p>
                            <p className="text-lg font-bold text-[color:var(--hf-ink)] mt-1">{fmtCurrency(c.amount)}</p>
                            {(c.travel_request_id || c.travel_destination) && (
                              <p className="mt-1 text-xs text-teal-700 font-medium">
                                ✈️ Trip:{' '}
                                <Link
                                  href={`/humanify/travel-expense?request=${c.travel_request_id || ''}`}
                                  className="underline hover:text-teal-900"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {c.travel_request_number || c.travel_destination || 'Lihat perjalanan'}
                                </Link>
                                {c.travel_purpose ? ` · ${c.travel_purpose}` : ''}
                              </p>
                            )}
                            {c.approved_amount && c.approved_amount !== c.amount && (
                              <p className="text-xs text-green-600">Disetujui: {fmtCurrency(c.approved_amount)}</p>
                            )}

                            {/* Rejection reason box */}
                            {c.status === 'rejected' && c.rejection_reason && (
                              <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> Alasan Penolakan
                                </p>
                                <p className="text-xs text-red-700">{c.rejection_reason}</p>
                                {c.rejected_by_name && (
                                  <p className="text-[10px] text-red-400 mt-1">
                                    Ditolak oleh: <span className="font-medium">{c.rejected_by_name}</span>
                                    {c.rejected_at && ` • ${fmtDate(c.rejected_at)}`}
                                  </p>
                                )}
                                {c.resubmit_count > 0 && (
                                  <p className="text-[10px] text-orange-500 mt-0.5">🔁 Diajukan ulang {c.resubmit_count}×</p>
                                )}
                              </div>
                            )}

                            {proofCount > 0 && (
                              <div className="mt-2">
                                <p className="text-[10px] font-medium text-[color:var(--hf-ink-faint)] mb-1 flex items-center gap-1">
                                  <Paperclip className="w-3 h-3" /> BUKTI ({proofCount})
                                </p>
                                <ClaimReceiptGallery receiptUrl={c.receipt_url} compact maxThumbs={4} />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 ml-3 shrink-0">
                            {proofCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setProofClaim(c)}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-[var(--hf-border)] text-[color:var(--hf-ink-secondary)] rounded-lg hover:bg-[var(--hf-surface-muted)]"
                              >
                                <Eye className="w-3.5 h-3.5" /> Lihat bukti
                              </button>
                            )}
                            {c.status === 'pending' && (
                              <>
                                <button onClick={() => openApproval('claim', c, 'approve')}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-[var(--hf-radius)] bg-[var(--hf-success)] text-white hover:opacity-90">
                                  <CheckCircle className="w-3.5 h-3.5" /> Setujui
                                </button>
                                <button onClick={() => openApproval('claim', c, 'reject')}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-[var(--hf-radius)] bg-[var(--hf-danger)] text-white hover:opacity-90">
                                  <XCircle className="w-3.5 h-3.5" /> Tolak
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );})}
                  </div>
                )}
              </div>
            )}

            {/* ===== MUTATIONS APPROVAL ===== */}
            {activeTab === 'mutations-approval' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[color:var(--hf-ink)]">Persetujuan Mutasi / Transfer</h3>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-1.5 border rounded-lg text-sm">
                    <option value="">Semua Status</option>
                    <option value="pending">Tertunda</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                  </select>
                </div>

                {mutations.length === 0 ? (
                  <HrisEmptyState
                    source={dataSource}
                    title="Tidak ada pengajuan mutasi"
                    description="Mutasi, promosi, dan rotasi yang menunggu persetujuan HR akan tampil di sini."
                  />
                ) : (
                  <div className="space-y-3">
                    {mutations.map((m: any) => (
                      <div key={m.id} className="border rounded-lg p-4 hover:bg-[var(--hf-surface-muted)]">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[color:var(--hf-ink)]">{m.mutation_number}</span>
                              {statusBadge(m.status)}
                              <span className="px-2 py-0.5 bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)] text-[10px] rounded font-medium">{m.mutation_type}</span>
                            </div>
                            <p className="text-sm text-[color:var(--hf-ink-muted)] mt-1 flex items-center gap-2">
                              <EmployeeAvatar name={m.employee_name} photoUrl={m.photo_url} size="xs" />
                              {m.employee_name} ({m.employee_code})
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-[color:var(--hf-ink-muted)]">
                              <div className="bg-[var(--hf-surface-muted)] rounded px-2 py-1">
                                <p className="text-[10px] text-[color:var(--hf-ink-faint)]">DARI</p>
                                <p>{m.from_department || '-'} • {m.from_position || '-'}</p>
                                {m.from_branch_name && <p className="text-[color:var(--hf-ink-faint)]">{m.from_branch_name}</p>}
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-300" />
                              <div className="bg-[var(--hf-brand-50)] rounded px-2 py-1">
                                <p className="text-[10px] text-[color:var(--hf-brand-500)]">KE</p>
                                <p className="text-[color:var(--hf-brand)]">{m.to_department || '-'} • {m.to_position || '-'}</p>
                                {m.to_branch_name && <p className="text-[color:var(--hf-brand-500)]">{m.to_branch_name}</p>}
                              </div>
                            </div>
                            <p className="text-xs text-[color:var(--hf-ink-faint)] mt-2">Efektif: {fmtDate(m.effective_date)} {m.reason ? `• Alasan: ${m.reason}` : ''}</p>
                            {isMutationDeferredPending(m.status, m.effective_date) && (
                              <p className="text-[11px] text-sky-700 mt-1 bg-sky-50 inline-block px-2 py-0.5 rounded">
                                Menunggu efektif — penempatan belum diterapkan
                              </p>
                            )}
                            {m.new_salary && <p className="text-xs text-[color:var(--hf-ink-muted)]">Gaji baru: {fmtCurrency(m.new_salary)}</p>}
                          </div>
                          {m.status === 'pending' && (
                            <div className="flex gap-2 ml-3">
                              <button onClick={() => openApproval('mutation', m, 'approve')}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-[var(--hf-radius)] bg-[var(--hf-success)] text-white hover:opacity-90">
                                <CheckCircle className="w-3.5 h-3.5" /> Setujui
                              </button>
                              <button onClick={() => openApproval('mutation', m, 'reject')}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-[var(--hf-radius)] bg-[var(--hf-danger)] text-white hover:opacity-90">
                                <XCircle className="w-3.5 h-3.5" /> Tolak
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Overtime Approval Tab ── */}
      {activeTab === 'overtime-approval' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[color:var(--hf-ink)]">Persetujuan Lembur</h3>
              <p className="text-sm text-[color:var(--hf-ink-muted)]">{overtimes.filter(o => o.status === 'pending').length} pengajuan menunggu persetujuan</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); fetchOvertimes(e.target.value || undefined); }} className="px-3 py-2 border rounded-lg text-sm bg-white">
                <option value="">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="approved">Disetujui</option>
                <option value="rejected">Ditolak</option>
              </select>
              <button onClick={() => fetchOvertimes(filterStatus || undefined)} className="p-2 border rounded-lg hover:bg-[var(--hf-surface-muted)]"><RefreshCw className={`w-4 h-4 ${otLoading ? 'animate-spin' : 'text-[color:var(--hf-ink-muted)]'}`} /></button>
            </div>
          </div>
          <div className="space-y-3">
            {overtimes.length === 0 ? (
              <div className="text-center py-12 text-[color:var(--hf-ink-faint)]"><Timer className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>Tidak ada pengajuan lembur</p></div>
            ) : overtimes.map(ot => (
              <div key={ot.id} className={`hf-card p-5 shadow-sm ${ot.status === 'pending' ? 'border-orange-200' : 'border-[var(--hf-border-subtle)]'}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-3">
                    <EmployeeAvatar name={ot.employee_name} photoUrl={ot.photo_url} size="md" />
                    <div><p className="font-semibold text-[color:var(--hf-ink)]">{ot.employee_name}</p><p className="text-xs text-[color:var(--hf-ink-muted)]">{ot.employee_no} · {ot.department}</p></div>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${ot.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ot.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {ot.status === 'pending' ? 'Menunggu' : ot.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-sm">
                  {[
                    { label: 'Tanggal', value: new Date(ot.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) },
                    { label: 'Jam', value: `${ot.start_time}–${ot.end_time} (${ot.duration_hours}j)` },
                    { label: 'Tipe Hari', value: ot.day_type === 'weekday' ? 'Hari Kerja' : ot.day_type === 'weekend' ? 'Akhir Pekan' : 'Hari Libur' },
                    { label: `Estimasi Upah (${ot.multiplier}×)`, value: `Rp ${(ot.calculated_pay || 0).toLocaleString('id-ID')}` },
                  ].map(r => <div key={r.label} className="bg-[var(--hf-surface-muted)] rounded-lg p-2.5"><p className="text-xs text-[color:var(--hf-ink-faint)]">{r.label}</p><p className="font-semibold text-[color:var(--hf-ink)] text-xs">{r.value}</p></div>)}
                </div>
                <div className="mb-3"><p className="text-xs font-semibold text-[color:var(--hf-ink-muted)] mb-1">Alasan</p><p className="text-sm text-[color:var(--hf-ink-secondary)]">{ot.reason}</p>{ot.work_description && <p className="text-xs text-[color:var(--hf-ink-muted)] mt-1 italic">{ot.work_description}</p>}</div>
                {ot.rejection_reason && <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-xs font-semibold text-red-600 mb-1">Alasan Penolakan</p><p className="text-sm text-red-700">{ot.rejection_reason}</p></div>}
                {ot.status === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t border-[var(--hf-border-subtle)]">
                    <button onClick={() => openApproval('overtime', ot, 'approve')} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--hf-radius)] bg-[var(--hf-success)] text-sm font-semibold text-white hover:opacity-90"><CheckCircle className="w-4 h-4" />Setujui</button>
                    <button onClick={() => openApproval('overtime', ot, 'reject')} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--hf-radius)] bg-[var(--hf-danger)] text-sm font-semibold text-white hover:opacity-90"><XCircle className="w-4 h-4" />Tolak</button>
                  </div>
                )}
                {ot.status === 'approved' && ot.approved_by_name && <p className="text-xs text-green-600 pt-2 border-t border-[var(--hf-border-subtle)] flex items-center gap-1"><CheckCircle className="w-3 h-3" />Disetujui oleh {ot.approved_by_name}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

            {activeTab === 'training-approval' && (
              <div className="space-y-3">
                <h3 className="font-semibold text-[color:var(--hf-ink)]">Permintaan Pelatihan</h3>
                {trainingReqs.length === 0 ? (
                  <HrisEmptyState source={dataSource} title="Tidak ada permintaan pelatihan" description="Pengajuan dari ESS akan muncul di sini." />
                ) : trainingReqs.map((r: any) => {
                  const preferred = r.preferredDate || r.preferred_date;
                  const programTitle = r.programTitle || r.program_title;
                  const statusCls = r.status === 'pending'
                    ? 'bg-amber-50 text-amber-800'
                    : r.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-slate-100 text-slate-600';
                  return (
                  <div key={r.id} className="border rounded-lg p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-[color:var(--hf-ink)]">{r.topic || programTitle || 'Pelatihan'}</p>
                      {programTitle && (
                        <p className="text-xs text-[color:var(--hf-brand-600)] mt-0.5 font-medium">Program: {programTitle}</p>
                      )}
                      <p className="text-xs text-[color:var(--hf-ink-muted)] mt-1 flex flex-wrap items-center gap-2">
                        <span>{r.employeeName || r.employee_name}</span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusCls}`}>
                          {r.status === 'pending' ? 'Menunggu' : r.status === 'approved' ? 'Disetujui' : r.status}
                        </span>
                        {preferred && (
                          <span className="tabular-nums">
                            Preferensi {new Date(preferred).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </p>
                      {r.justification && <p className="text-xs text-[color:var(--hf-ink-faint)] mt-1">{r.justification}</p>}
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={() => openApproval('training', r, 'approve')} className="px-3 py-1.5 text-sm rounded-[var(--hf-radius)] bg-[var(--hf-success)] text-white">Setujui</button>
                        <button type="button" onClick={() => openApproval('training', r, 'reject')} className="px-3 py-1.5 text-sm rounded-[var(--hf-radius)] bg-[var(--hf-danger)] text-white">Tolak</button>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'okr-approval' && (
              <div className="space-y-3">
                <h3 className="font-semibold text-[color:var(--hf-ink)]">Persetujuan OKR / Objective</h3>
                {okrPending.length === 0 ? (
                  <HrisEmptyState source={dataSource} title="Tidak ada OKR menunggu" description="Objective yang diajukan persetujuan akan tampil di sini." />
                ) : okrPending.map((o: any) => (
                  <div key={o.id} className="border rounded-lg p-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[color:var(--hf-ink)]">{o.title}</p>
                      <p className="text-xs text-[color:var(--hf-ink-muted)] mt-1">
                        <span className="font-semibold text-[color:var(--hf-ink)]">Owner: {o.ownerName || o.owner_name || '—'}</span>
                        {' · '}{o.level} · {o.period}
                      </p>
                      {o.description && <p className="text-xs text-[color:var(--hf-ink-faint)] mt-1 line-clamp-2">{o.description}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button type="button" onClick={() => openApproval('okr', o, 'approve')} className="px-3 py-1.5 text-sm rounded-[var(--hf-radius)] bg-[var(--hf-success)] text-white">Setujui</button>
                      <button type="button" onClick={() => openApproval('okr', o, 'reject')} className="px-3 py-1.5 text-sm rounded-[var(--hf-radius)] bg-[var(--hf-danger)] text-white">Tolak</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'travel-approval' && (
              <div className="space-y-3">
                <h3 className="font-semibold text-[color:var(--hf-ink)]">Persetujuan Perjalanan Dinas</h3>
                {travelReqs.length === 0 ? (
                  <HrisEmptyState source={dataSource} title="Tidak ada perjalanan pending" description="Pengajuan travel dari karyawan akan tampil di sini." />
                ) : travelReqs.map((t: any) => (
                  <div key={t.id} className="border rounded-lg p-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[color:var(--hf-ink)]">{t.purpose || t.destination || 'Perjalanan dinas'}</p>
                      <p className="text-xs text-[color:var(--hf-ink-muted)] mt-1">
                        {t.employee_name || t.employeeName || '-'} · {t.status}
                        {t.start_date ? ` · ${fmtDate(t.start_date)}` : ''}
                      </p>
                    </div>
                    {(t.status === 'pending') && (
                      <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={() => openApproval('travel', t, 'approve')} className="px-3 py-1.5 text-sm rounded-[var(--hf-radius)] bg-[var(--hf-success)] text-white">Setujui</button>
                        <button type="button" onClick={() => openApproval('travel', t, 'reject')} className="px-3 py-1.5 text-sm rounded-[var(--hf-radius)] bg-[var(--hf-danger)] text-white">Tolak</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
        </div>
      </PlatformAccessShell>

      {/* ===== APPROVAL MODAL ===== */}
      {showApprovalModal && approvalItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowApprovalModal(false)}>
          <div className="hf-card w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between p-4 border-b ${approvalAction === 'approve' ? 'bg-green-50' : 'bg-red-50'}`}>
              <h3 className="font-semibold text-[color:var(--hf-ink)]">
                {approvalAction === 'approve' ? 'Setujui' : 'Tolak'}{' '}
                {approvalType === 'claim' ? 'Klaim'
                  : approvalType === 'overtime' ? 'Lembur'
                  : approvalType === 'training' ? 'Pelatihan'
                  : approvalType === 'okr' ? 'OKR'
                  : approvalType === 'travel' ? 'Travel'
                  : 'Mutasi'}
              </h3>
              <button onClick={() => setShowApprovalModal(false)} className="p-1.5 hover:bg-[var(--hf-surface-muted)] rounded"><span className="text-lg">&times;</span></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-[var(--hf-surface-muted)] rounded-lg p-3">
                <p className="text-sm font-medium text-[color:var(--hf-ink)]">
                  {approvalType === 'claim' ? approvalItem.claim_number
                    : approvalType === 'mutation' ? approvalItem.mutation_number
                    : approvalType === 'training' ? (approvalItem.course_title || approvalItem.title || approvalItem.id)
                    : approvalType === 'okr' ? (approvalItem.title || approvalItem.objective || approvalItem.id)
                    : approvalType === 'travel' ? (approvalItem.destination || approvalItem.purpose || approvalItem.id)
                    : approvalItem.id}
                </p>
                <div className="flex items-center gap-2">
                  <EmployeeAvatar name={approvalItem.employee_name} photoUrl={approvalItem.photo_url} size="sm" />
                  <p className="text-xs text-[color:var(--hf-ink-muted)]">{approvalItem.employee_name}</p>
                </div>
                {approvalType === 'claim' && (
                  <p className="text-sm font-bold text-[color:var(--hf-ink)] mt-1">{fmtCurrency(approvalItem.amount)}</p>
                )}
              </div>

              {approvalType === 'claim' && approvalAction === 'approve' && (
                <div>
                  <label className="text-xs font-medium text-[color:var(--hf-ink-muted)]">Jumlah Disetujui (Rp)</label>
                  <input type="number" value={approvedAmount} onChange={e => setApprovedAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
                </div>
              )}

              {approvalType === 'claim' && parseClaimReceipts(approvalItem.receipt_url).length > 0 && (
                <div className="rounded-lg border bg-[var(--hf-surface-muted)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--hf-ink-muted)] mb-2">Bukti dari karyawan</p>
                  <ClaimReceiptGallery receiptUrl={approvalItem.receipt_url} maxThumbs={6} />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-[color:var(--hf-ink-secondary)] flex items-center gap-1">
                  {approvalAction === 'reject' ? (
                    <>Alasan Penolakan <span className="text-red-500 font-bold">*</span></>
                  ) : 'Catatan Persetujuan'}
                </label>
                <textarea value={approvalComments} onChange={e => setApprovalComments(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm mt-1 focus:outline-none focus:ring-2 ${
                    approvalAction === 'reject' ? 'focus:ring-red-400 border-red-200' : 'focus:ring-green-400'
                  }`}
                  rows={4}
                  placeholder={approvalAction === 'reject'
                    ? 'Jelaskan alasan penolakan klaim ini secara detail agar karyawan dapat melakukan perbaikan...'
                    : 'Catatan persetujuan (opsional)...'
                  } />
                {approvalAction === 'reject' && !approvalComments.trim() && (
                  <p className="text-xs text-red-500 mt-1">⚠ Alasan penolakan wajib diisi agar karyawan dapat memperbaiki pengajuan</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowApprovalModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
              <button onClick={submitApproval}
                disabled={approvalAction === 'reject' && !approvalComments.trim()}
                className={`flex items-center gap-1 px-4 py-2 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                  approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}>
                {approvalAction === 'approve' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {approvalAction === 'approve' ? 'Setujui' : 'Tolak Klaim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {proofClaim && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setProofClaim(null)}>
          <div className="hf-card w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <EmployeeAvatar name={proofClaim.employee_name} photoUrl={proofClaim.photo_url} size="md" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-[color:var(--hf-ink)]">{proofClaim.claim_number || 'Bukti Klaim'}</h3>
                  <p className="text-sm text-[color:var(--hf-ink-muted)] truncate">{proofClaim.employee_name} · {fmtCurrency(proofClaim.amount)}</p>
                </div>
              </div>
              <button type="button" onClick={() => setProofClaim(null)} className="p-1.5 hover:bg-[var(--hf-surface-muted)] rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-lg border bg-[var(--hf-surface-muted)] p-4">
              <ClaimReceiptGallery receiptUrl={proofClaim.receipt_url} maxThumbs={8} />
            </div>
            {proofClaim.status === 'pending' && (
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setProofClaim(null); openApproval('claim', proofClaim, 'approve'); }}
                  className="px-4 py-2 text-sm rounded-[var(--hf-radius)] bg-[var(--hf-success)] text-white hover:opacity-90"
                >
                  Setujui
                </button>
                <button
                  type="button"
                  onClick={() => { setProofClaim(null); openApproval('claim', proofClaim, 'reject'); }}
                  className="px-4 py-2 text-sm border text-red-600 rounded-lg hover:bg-red-50"
                >
                  Tolak
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </HQLayout>
  );
}
