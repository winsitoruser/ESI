import { useState, useEffect } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import {
  Shield, Users, Clock, CheckCircle, XCircle, DollarSign,
  ArrowRightLeft, Bell, AlertTriangle, Eye, ChevronRight,
  BarChart3, FileText, RefreshCw, Send, Filter, Image, Paperclip,
  Timer, CalendarClock, TrendingUp
} from 'lucide-react';

type MSSTab = 'overview' | 'claims-approval' | 'mutations-approval' | 'overtime-approval' | 'team';

const MOCK_MSS_WORKFLOW = { pendingClaims: 5, approvedClaims: 18, rejectedClaims: 3, totalClaimAmount: 12500000, pendingMutations: 2, approvedMutations: 6, pendingLeave: 4, approvedLeave: 15 };
const MOCK_MSS_REMINDER = { totalReminders: 8, upcoming: 4, overdue: 2, categories: { contract: 3, probation: 2, certification: 1, performance_review: 2 } };
const MOCK_MSS_CLAIMS = [
  { id: 'mc1', employee_name: 'Budi Santoso', claim_type: 'medical', description: 'Rawat jalan RS Hermina', amount: 2500000, status: 'pending', submitted_date: '2026-03-11' },
  { id: 'mc2', employee_name: 'Siti Rahayu', claim_type: 'transport', description: 'Transport dinas Surabaya', amount: 1200000, status: 'pending', submitted_date: '2026-03-10' },
  { id: 'mc3', employee_name: 'Ahmad Wijaya', claim_type: 'meals', description: 'Makan lembur tim IT', amount: 750000, status: 'approved', submitted_date: '2026-03-08', approved_amount: 750000 },
];
const MOCK_MSS_MUTATIONS = [
  { id: 'mm1', employee_name: 'Dewi Lestari', mutation_type: 'transfer', from_branch: 'Cabang Bandung', to_branch: 'Cabang Surabaya', effective_date: '2026-04-01', status: 'pending', reason: 'Kebutuhan operasional' },
  { id: 'mm2', employee_name: 'Eko Prasetyo', mutation_type: 'promotion', from_position: 'Staff', to_position: 'Supervisor', effective_date: '2026-04-01', status: 'pending', reason: 'Evaluasi kinerja outstanding' },
];
const MOCK_MSS_OVERTIME = [
  { id: 'ot1', employee_name: 'Budi Santoso', employee_no: 'EMP-0002', department: 'Sales', date: '2026-04-14', day_type: 'weekday', start_time: '17:00', end_time: '20:00', duration_hours: 3, reason: 'Penyelesaian laporan bulanan', work_description: 'Rekap penjualan Q1 dan input data CRM', overtime_type: 'regular', multiplier: 1.5, calculated_pay: 270000, status: 'pending', created_at: '2026-04-14T17:05:00' },
  { id: 'ot5', employee_name: 'Lisa Permata', employee_no: 'EMP-0004', department: 'HR', date: '2026-04-07', day_type: 'weekday', start_time: '17:00', end_time: '19:00', duration_hours: 2, reason: 'Penyelesaian kontrak karyawan baru', work_description: 'Review dan tanda tangan kontrak 5 karyawan baru', overtime_type: 'project', multiplier: 1.5, calculated_pay: 375000, status: 'pending', created_at: '2026-04-07T17:10:00' },
];

export default function MSSPortalPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MSSTab>('overview');

  // Data
  const [workflowSummary, setWorkflowSummary] = useState<any>(MOCK_MSS_WORKFLOW);
  const [reminderSummary, setReminderSummary] = useState<any>(MOCK_MSS_REMINDER);
  const [claims, setClaims] = useState<any[]>(MOCK_MSS_CLAIMS);
  const [mutations, setMutations] = useState<any[]>(MOCK_MSS_MUTATIONS);
  const [overtimes, setOvertimes] = useState<any[]>(MOCK_MSS_OVERTIME);
  const [otLoading, setOtLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  // Approval modal
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalType, setApprovalType] = useState<'claim' | 'mutation' | 'overtime'>('claim');
  const [approvalItem, setApprovalItem] = useState<any>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComments, setApprovalComments] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');

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
      const res = await fetch('/api/hq/hris/workflow?action=summary');
      const json = await res.json();
      setWorkflowSummary(json.data || MOCK_MSS_WORKFLOW);
    } catch (e) { console.error(e); setWorkflowSummary(MOCK_MSS_WORKFLOW); }
  };

  const fetchReminderSummary = async () => {
    try {
      const res = await fetch('/api/hq/hris/reminders?action=summary');
      const json = await res.json();
      setReminderSummary(json.data || MOCK_MSS_REMINDER);
    } catch (e) { console.error(e); setReminderSummary(MOCK_MSS_REMINDER); }
  };

  const fetchOvertimes = async (status?: string) => {
    setOtLoading(true);
    try {
      const params = new URLSearchParams({ action: 'list' });
      if (status) params.set('status', status);
      const res = await fetch(`/api/hq/hris/overtime?${params}`);
      const json = await res.json();
      if (json.success) setOvertimes(json.data?.records || []);
    } catch { setOvertimes(MOCK_MSS_OVERTIME); }
    finally { setOtLoading(false); }
  };

  const fetchClaims = async (status?: string) => {
    try {
      const params = new URLSearchParams({ action: 'claims' });
      if (status) params.set('status', status);
      const res = await fetch(`/api/hq/hris/workflow?${params}`);
      const json = await res.json();
      setClaims(json.data || MOCK_MSS_CLAIMS);
    } catch (e) { console.error(e); setClaims(MOCK_MSS_CLAIMS); }
  };

  const fetchMutations = async (status?: string) => {
    try {
      const params = new URLSearchParams({ action: 'mutations' });
      if (status) params.set('status', status);
      const res = await fetch(`/api/hq/hris/workflow?${params}`);
      const json = await res.json();
      setMutations(json.data || MOCK_MSS_MUTATIONS);
    } catch (e) { console.error(e); setMutations(MOCK_MSS_MUTATIONS); }
  };

  useEffect(() => {
    if (!mounted) return;
    if (activeTab === 'claims-approval')   fetchClaims(filterStatus || undefined);
    if (activeTab === 'mutations-approval') fetchMutations(filterStatus || undefined);
    if (activeTab === 'overtime-approval') fetchOvertimes(filterStatus || undefined);
  }, [activeTab, filterStatus]);

  const OT_TYPE_LABEL: Record<string, string> = { regular: 'Reguler', emergency: 'Darurat', project: 'Proyek' };
  const DAY_TYPE_LABEL: Record<string, { label: string; color: string }> = { weekday: { label: 'Hari Kerja', color: 'bg-blue-50 text-blue-700' }, weekend: { label: 'Akhir Pekan', color: 'bg-purple-50 text-purple-700' }, holiday: { label: 'Hari Libur', color: 'bg-red-50 text-red-700' } };

  const openApproval = (type: 'claim' | 'mutation' | 'overtime', item: any, action: 'approve' | 'reject') => {
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
    const actionMap: Record<string, { approve: string; reject: string }> = {
      claim:    { approve: 'approve-claim',    reject: 'reject-claim'    },
      mutation: { approve: 'approve-mutation', reject: 'reject-mutation' },
      overtime: { approve: 'approve',          reject: 'reject'          },
    };
    const apiAction = actionMap[approvalType]?.[approvalAction];

    try {
      const body: any = { id: approvalItem.id, comments: approvalComments, rejection_reason: approvalAction === 'reject' ? approvalComments : undefined, notes: approvalComments };
      if (approvalType === 'claim' && approvalAction === 'approve') body.approved_amount = parseFloat(approvedAmount) || approvalItem.amount;

      const apiUrl = approvalType === 'overtime'
        ? `/api/hq/hris/overtime?action=${apiAction}`
        : `/api/hq/hris/workflow?action=${apiAction}`;

      const res = await fetch(apiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', json.message || 'Berhasil');
        setShowApprovalModal(false);
        if (approvalType === 'claim')    fetchClaims(filterStatus || undefined);
        else if (approvalType === 'mutation') fetchMutations(filterStatus || undefined);
        else if (approvalType === 'overtime') fetchOvertimes(filterStatus || undefined);
        fetchWorkflowSummary();
      } else showToast('error', json.error || 'Gagal');
    } catch (e) { showToast('error', 'Gagal memproses'); }
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
  const fmtCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700', paid: 'bg-blue-100 text-blue-700',
      executed: 'bg-indigo-100 text-indigo-700', cancelled: 'bg-gray-100 text-gray-600'
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
  };

  if (!mounted) return null;

  return (
    <HQLayout title={t('hris.mssTitle')} currentMenu="hris">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-violet-600" /> Manager Self Service (MSS)
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Portal persetujuan dan pengelolaan tim</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Klaim Tertunda', value: workflowSummary?.claims?.pending || 0, icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
            { label: 'Mutasi Tertunda', value: workflowSummary?.mutations?.pending || 0, icon: ArrowRightLeft, color: 'text-orange-600 bg-orange-50' },
            { label: 'Klaim Disetujui', value: workflowSummary?.claims?.approved || 0, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
            { label: 'Mutasi Disetujui', value: workflowSummary?.mutations?.approved || 0, icon: CheckCircle, color: 'text-blue-600 bg-blue-50' },
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                  <p className="text-xs font-medium text-gray-600 mt-0.5">{card.label}</p>
                </div>
                <div className={`p-2 rounded-lg ${card.color}`}><card.icon className="w-5 h-5" /></div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border">
          <div className="border-b overflow-x-auto">
            <div className="flex min-w-max">
              {([
                { key: 'overview', label: 'Ringkasan', icon: BarChart3 },
                { key: 'claims-approval', label: 'Persetujuan Klaim', icon: DollarSign },
                { key: 'mutations-approval', label: 'Persetujuan Mutasi', icon: ArrowRightLeft },
                { key: 'overtime-approval', label: 'Persetujuan Lembur', icon: Timer },
              ] as { key: MSSTab; label: string; icon: any }[]).map(tab => (
                <button key={tab.key} onClick={() => { setActiveTab(tab.key); setFilterStatus(''); }}
                  className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.key ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  <tab.icon className="w-4 h-4" /> {tab.label}
                  {tab.key === 'claims-approval' && (workflowSummary?.claims?.pending || 0) > 0 && (
                    <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] rounded-full font-bold">{workflowSummary.claims.pending}</span>
                  )}
                  {tab.key === 'mutations-approval' && (workflowSummary?.mutations?.pending || 0) > 0 && (
                    <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] rounded-full font-bold">{workflowSummary.mutations.pending}</span>
                  )}
                  {tab.key === 'overtime-approval' && overtimes.filter(o => o.status === 'pending').length > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] rounded-full font-bold">{overtimes.filter(o => o.status === 'pending').length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            {/* ===== OVERVIEW ===== */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pending Claims */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-800 flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-yellow-600" /> Klaim Menunggu Persetujuan
                      </h4>
                      <button onClick={() => setActiveTab('claims-approval')} className="text-xs text-violet-600 hover:underline flex items-center gap-0.5">
                        Lihat Semua <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-3xl font-bold text-gray-800">{workflowSummary?.claims?.pending || 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Klik untuk mereview dan menyetujui</p>
                  </div>

                  {/* Pending Mutations */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-800 flex items-center gap-1.5">
                        <ArrowRightLeft className="w-4 h-4 text-orange-600" /> Mutasi Menunggu Persetujuan
                      </h4>
                      <button onClick={() => setActiveTab('mutations-approval')} className="text-xs text-violet-600 hover:underline flex items-center gap-0.5">
                        Lihat Semua <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-3xl font-bold text-gray-800">{workflowSummary?.mutations?.pending || 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Transfer, promosi, dan rotasi karyawan</p>
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
                  <h3 className="font-semibold text-gray-800">Persetujuan Klaim Reimbursement</h3>
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
                  <div className="text-center py-12">
                    <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Tidak ada klaim</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {claims.map((c: any) => {
                      let attachments: string[] = [];
                      try { if (c.receipt_url) attachments = JSON.parse(c.receipt_url); } catch { if (c.receipt_url) attachments = [c.receipt_url]; }
                      return (
                      <div key={c.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800">{c.claim_number}</span>
                              {statusBadge(c.status)}
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded">{c.claim_type}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{c.employee_name} • {c.department} • {c.position}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Tanggal: {fmtDate(c.claim_date)} {c.description ? `• ${c.description}` : ''}</p>
                            <p className="text-lg font-bold text-gray-800 mt-1">{fmtCurrency(c.amount)}</p>
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

                            {/* Attachments */}
                            {attachments.length > 0 && (
                              <div className="mt-2">
                                <p className="text-[10px] font-medium text-gray-400 mb-1 flex items-center gap-1"><Paperclip className="w-3 h-3" /> LAMPIRAN ({attachments.length})</p>
                                <div className="flex flex-wrap gap-2">
                                  {attachments.map((url: string, i: number) => {
                                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                                    return (
                                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 border rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors group">
                                        {isImage ? (
                                          <img src={url} alt="" className="w-10 h-10 rounded object-cover border" />
                                        ) : (
                                          <div className="w-10 h-10 rounded bg-red-50 flex items-center justify-center border">
                                            <FileText className="w-5 h-5 text-red-500" />
                                          </div>
                                        )}
                                        <div>
                                          <p className="text-[10px] text-gray-600 group-hover:text-blue-600">{isImage ? 'Foto' : 'PDF'} {i + 1}</p>
                                          <p className="text-[9px] text-gray-400">Klik untuk buka</p>
                                        </div>
                                      </a>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                          {c.status === 'pending' && (
                            <div className="flex gap-2 ml-3">
                              <button onClick={() => openApproval('claim', c, 'approve')}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                                <CheckCircle className="w-3.5 h-3.5" /> Setujui
                              </button>
                              <button onClick={() => openApproval('claim', c, 'reject')}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
                                <XCircle className="w-3.5 h-3.5" /> Tolak
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ===== MUTATIONS APPROVAL ===== */}
            {activeTab === 'mutations-approval' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Persetujuan Mutasi / Transfer</h3>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-1.5 border rounded-lg text-sm">
                    <option value="">Semua Status</option>
                    <option value="pending">Tertunda</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                  </select>
                </div>

                {mutations.length === 0 ? (
                  <div className="text-center py-12">
                    <ArrowRightLeft className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Tidak ada pengajuan mutasi {filterStatus ? `berstatus "${filterStatus}"` : ''}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mutations.map((m: any) => (
                      <div key={m.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800">{m.mutation_number}</span>
                              {statusBadge(m.status)}
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] rounded font-medium">{m.mutation_type}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{m.employee_name} ({m.employee_code})</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              <div className="bg-gray-50 rounded px-2 py-1">
                                <p className="text-[10px] text-gray-400">DARI</p>
                                <p>{m.from_department || '-'} • {m.from_position || '-'}</p>
                                {m.from_branch_name && <p className="text-gray-400">{m.from_branch_name}</p>}
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-300" />
                              <div className="bg-blue-50 rounded px-2 py-1">
                                <p className="text-[10px] text-blue-400">KE</p>
                                <p className="text-blue-700">{m.to_department || '-'} • {m.to_position || '-'}</p>
                                {m.to_branch_name && <p className="text-blue-500">{m.to_branch_name}</p>}
                              </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">Efektif: {fmtDate(m.effective_date)} {m.reason ? `• Alasan: ${m.reason}` : ''}</p>
                            {m.new_salary && <p className="text-xs text-gray-500">Gaji baru: {fmtCurrency(m.new_salary)}</p>}
                          </div>
                          {m.status === 'pending' && (
                            <div className="flex gap-2 ml-3">
                              <button onClick={() => openApproval('mutation', m, 'approve')}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                                <CheckCircle className="w-3.5 h-3.5" /> Setujui
                              </button>
                              <button onClick={() => openApproval('mutation', m, 'reject')}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
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
          </div>
        </div>
      </div>

      {/* ── Overtime Approval Tab ────────────────────────────────────────────────── */}
      {activeTab === 'overtime-approval' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Persetujuan Lembur</h3>
              <p className="text-sm text-gray-500">{overtimes.filter(o => o.status === 'pending').length} pengajuan menunggu persetujuan</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); fetchOvertimes(e.target.value || undefined); }} className="px-3 py-2 border rounded-lg text-sm bg-white">
                <option value="">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="approved">Disetujui</option>
                <option value="rejected">Ditolak</option>
              </select>
              <button onClick={() => fetchOvertimes(filterStatus || undefined)} className="p-2 border rounded-lg hover:bg-gray-50"><RefreshCw className={`w-4 h-4 ${otLoading ? 'animate-spin' : 'text-gray-500'}`} /></button>
            </div>
          </div>
          <div className="space-y-3">
            {overtimes.length === 0 ? (
              <div className="text-center py-12 text-gray-400"><Timer className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>Tidak ada pengajuan lembur</p></div>
            ) : overtimes.map(ot => (
              <div key={ot.id} className={`bg-white rounded-xl border p-5 shadow-sm ${ot.status === 'pending' ? 'border-orange-200' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{ot.employee_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</div>
                    <div><p className="font-semibold text-gray-900">{ot.employee_name}</p><p className="text-xs text-gray-500">{ot.employee_no} · {ot.department}</p></div>
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
                  ].map(r => <div key={r.label} className="bg-gray-50 rounded-lg p-2.5"><p className="text-xs text-gray-400">{r.label}</p><p className="font-semibold text-gray-800 text-xs">{r.value}</p></div>)}
                </div>
                <div className="mb-3"><p className="text-xs font-semibold text-gray-500 mb-1">Alasan</p><p className="text-sm text-gray-700">{ot.reason}</p>{ot.work_description && <p className="text-xs text-gray-500 mt-1 italic">{ot.work_description}</p>}</div>
                {ot.rejection_reason && <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-xs font-semibold text-red-600 mb-1">Alasan Penolakan</p><p className="text-sm text-red-700">{ot.rejection_reason}</p></div>}
                {ot.status === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button onClick={() => openApproval('overtime', ot, 'approve')} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"><CheckCircle className="w-4 h-4" />Setujui</button>
                    <button onClick={() => openApproval('overtime', ot, 'reject')} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"><XCircle className="w-4 h-4" />Tolak</button>
                  </div>
                )}
                {ot.status === 'approved' && ot.approved_by_name && <p className="text-xs text-green-600 pt-2 border-t border-gray-100 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Disetujui oleh {ot.approved_by_name}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== APPROVAL MODAL ===== */}
      {showApprovalModal && approvalItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowApprovalModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between p-4 border-b ${approvalAction === 'approve' ? 'bg-green-50' : 'bg-red-50'}`}>
              <h3 className="font-semibold text-gray-800">
                {approvalAction === 'approve' ? 'Setujui' : 'Tolak'} {approvalType === 'claim' ? 'Klaim' : approvalType === 'overtime' ? 'Lembur' : 'Mutasi'}
              </h3>
              <button onClick={() => setShowApprovalModal(false)} className="p-1.5 hover:bg-gray-100 rounded"><span className="text-lg">&times;</span></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-800">
                  {approvalType === 'claim' ? approvalItem.claim_number : approvalItem.mutation_number}
                </p>
                <p className="text-xs text-gray-500">{approvalItem.employee_name}</p>
                {approvalType === 'claim' && (
                  <p className="text-sm font-bold text-gray-800 mt-1">{fmtCurrency(approvalItem.amount)}</p>
                )}
              </div>

              {approvalType === 'claim' && approvalAction === 'approve' && (
                <div>
                  <label className="text-xs font-medium text-gray-500">Jumlah Disetujui (Rp)</label>
                  <input type="number" value={approvedAmount} onChange={e => setApprovedAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
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
    </HQLayout>
  );
}
