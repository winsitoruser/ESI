import { useState, useEffect } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import {
  User, FileText, Calendar, DollarSign, Clock, Bell, Shield,
  Award, GraduationCap, Heart, Briefcase, Send, Eye, CheckCircle,
  XCircle, AlertTriangle, ChevronRight, Plus, RefreshCw,
  UploadCloud, Image, Paperclip, Trash2, Loader2
} from 'lucide-react';

type ESSTab = 'overview' | 'profile' | 'leave' | 'claims' | 'documents' | 'reminders';

const MOCK_ESS_WORKFLOW = { pendingClaims: 2, approvedClaims: 8, rejectedClaims: 1, totalClaimAmount: 4500000, pendingLeave: 1, approvedLeave: 5 };
const MOCK_ESS_REMINDER = { totalReminders: 6, upcoming: 3, overdue: 1, categories: { contract: 2, certification: 1, probation: 1, birthday: 2 } };
const MOCK_ESS_REMINDERS = [
  { id: 'rem1', type: 'contract_expiry', title: 'Kontrak akan berakhir', description: 'Kontrak Anda berakhir dalam 30 hari', due_date: '2026-04-12', priority: 'high', status: 'upcoming' },
  { id: 'rem2', type: 'certification', title: 'Sertifikasi perlu diperbarui', description: 'Sertifikasi K3 expired bulan depan', due_date: '2026-04-15', priority: 'medium', status: 'upcoming' },
  { id: 'rem3', type: 'birthday', title: 'Ulang Tahun Rekan Kerja', description: 'Budi Santoso berulang tahun', due_date: '2026-03-20', priority: 'low', status: 'upcoming' },
];
const MOCK_ESS_CLAIMS = [
  { id: 'cl1', claim_type: 'medical', description: 'Biaya berobat rawat jalan', amount: 1500000, status: 'approved', submitted_date: '2026-03-05', approved_amount: 1500000 },
  { id: 'cl2', claim_type: 'transport', description: 'Biaya transport dinas Bandung', amount: 850000, status: 'pending', submitted_date: '2026-03-10' },
  { id: 'cl3', claim_type: 'meals', description: 'Biaya makan lembur', amount: 350000, status: 'approved', submitted_date: '2026-03-08', approved_amount: 350000 },
];

export default function ESSPortalPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ESSTab>('overview');

  // Data
  const [profile, setProfile] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>(MOCK_ESS_CLAIMS);
  const [reminders, setReminders] = useState<any[]>(MOCK_ESS_REMINDERS);
  const [workflowSummary, setWorkflowSummary] = useState<any>(MOCK_ESS_WORKFLOW);
  const [reminderSummary, setReminderSummary] = useState<any>(MOCK_ESS_REMINDER);

  // Claim modal
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimForm, setClaimForm] = useState<any>({});
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

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
    await Promise.all([fetchWorkflowSummary(), fetchReminderSummary(), fetchReminders()]);
    setLoading(false);
  };

  const fetchWorkflowSummary = async () => {
    try {
      const res = await fetch('/api/hq/hris/workflow?action=summary');
      const json = await res.json();
      setWorkflowSummary(json.data || MOCK_ESS_WORKFLOW);
    } catch (e) { console.error(e); setWorkflowSummary(MOCK_ESS_WORKFLOW); }
  };

  const fetchReminderSummary = async () => {
    try {
      const res = await fetch('/api/hq/hris/reminders?action=summary');
      const json = await res.json();
      setReminderSummary(json.data || MOCK_ESS_REMINDER);
    } catch (e) { console.error(e); setReminderSummary(MOCK_ESS_REMINDER); }
  };

  const fetchReminders = async () => {
    try {
      const res = await fetch('/api/hq/hris/reminders?action=upcoming&days=60');
      const json = await res.json();
      setReminders(json.data || MOCK_ESS_REMINDERS);
    } catch (e) { console.error(e); setReminders(MOCK_ESS_REMINDERS); }
  };

  const fetchClaims = async () => {
    try {
      const res = await fetch('/api/hq/hris/workflow?action=claims');
      const json = await res.json();
      setClaims(json.data || MOCK_ESS_CLAIMS);
    } catch (e) { console.error(e); setClaims(MOCK_ESS_CLAIMS); }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('files', f));
      const res = await fetch('/api/hq/hris/upload-claim', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.success && json.data) {
        setUploadedFiles(prev => [...prev, ...json.data]);
        showToast('success', `${json.data.length} file berhasil diupload`);
      } else {
        showToast('error', json.error || 'Gagal upload file');
      }
    } catch (e) { showToast('error', 'Gagal upload file'); }
    setUploading(false);
  };

  const removeUploadedFile = (idx: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const submitClaim = async () => {
    if (!claimForm.employee_id || !claimForm.claim_type || !claimForm.amount) {
      showToast('error', 'Lengkapi data klaim');
      return;
    }
    try {
      const receipt_url = uploadedFiles.length > 0 ? JSON.stringify(uploadedFiles.map(f => f.url)) : claimForm.receipt_url || null;
      const res = await fetch('/api/hq/hris/workflow?action=claim', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...claimForm, receipt_url })
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', 'Klaim berhasil diajukan');
        setShowClaimModal(false);
        setClaimForm({});
        setUploadedFiles([]);
        fetchClaims();
        fetchWorkflowSummary();
      } else showToast('error', json.error || 'Gagal mengajukan');
    } catch (e) { showToast('error', 'Gagal mengajukan'); }
  };

  useEffect(() => {
    if (mounted && activeTab === 'claims') fetchClaims();
  }, [activeTab]);

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
  const fmtCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700', paid: 'bg-blue-100 text-blue-700',
      active: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-600'
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
  };

  if (!mounted) return null;

  return (
    <HQLayout title={t('hris.essTitle')} currentMenu="hris">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <User className="w-6 h-6 text-emerald-600" /> Employee Self Service (ESS)
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Portal layanan mandiri karyawan</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Klaim Tertunda', value: workflowSummary?.claims?.pending || 0, icon: Clock, color: 'text-yellow-600 bg-yellow-50', desc: 'Menunggu persetujuan' },
            { label: 'Klaim Disetujui', value: workflowSummary?.claims?.approved || 0, icon: CheckCircle, color: 'text-green-600 bg-green-50', desc: 'Sudah disetujui' },
            { label: 'Kontrak Akan Habis', value: reminderSummary?.contractExpiring30d || 0, icon: AlertTriangle, color: 'text-orange-600 bg-orange-50', desc: '30 hari ke depan' },
            { label: 'Sertifikasi Kedaluwarsa', value: reminderSummary?.certExpiring30d || 0, icon: Award, color: 'text-red-600 bg-red-50', desc: '30 hari ke depan' },
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                  <p className="text-xs font-medium text-gray-600 mt-0.5">{card.label}</p>
                  <p className="text-[10px] text-gray-400">{card.desc}</p>
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
                { key: 'overview', label: 'Ringkasan', icon: User },
                { key: 'claims', label: 'Klaim Saya', icon: DollarSign },
                { key: 'reminders', label: 'Pengingat', icon: Bell },
              ] as { key: ESSTab; label: string; icon: any }[]).map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.key ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  <tab.icon className="w-4 h-4" /> {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            {/* ===== OVERVIEW ===== */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quick Actions */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Aksi Cepat</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Ajukan Klaim', icon: DollarSign, color: 'bg-emerald-50 text-emerald-600 border-emerald-200', action: () => { setActiveTab('claims'); setShowClaimModal(true); } },
                      { label: 'Lihat Dokumen', icon: FileText, color: 'bg-blue-50 text-blue-600 border-blue-200', action: () => {} },
                      { label: 'Pengingat', icon: Bell, color: 'bg-orange-50 text-orange-600 border-orange-200', action: () => setActiveTab('reminders') },
                      { label: 'Data Profil', icon: User, color: 'bg-purple-50 text-purple-600 border-purple-200', action: () => {} },
                    ].map((act, i) => (
                      <button key={i} onClick={act.action}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border hover:shadow-sm transition-shadow ${act.color}`}>
                        <act.icon className="w-6 h-6" />
                        <span className="text-xs font-medium">{act.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upcoming Reminders */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Pengingat Mendatang</h3>
                  {reminders.length === 0 ? (
                    <p className="text-center text-gray-400 py-6 text-sm">Tidak ada pengingat</p>
                  ) : (
                    <div className="space-y-2">
                      {reminders.slice(0, 5).map((r: any) => {
                        const daysLeft = Math.ceil((new Date(r.due_date).getTime() - Date.now()) / 86400000);
                        const urgency = daysLeft <= 7 ? 'border-l-red-500' : daysLeft <= 14 ? 'border-l-orange-400' : 'border-l-blue-400';
                        return (
                          <div key={r.id} className={`border border-l-4 ${urgency} rounded-lg p-3`}>
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-800">{r.title}</p>
                                <p className="text-xs text-gray-500">{r.employee_name} • {r.department}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs font-medium text-gray-600">{fmtDate(r.due_date)}</p>
                                <p className={`text-[10px] font-bold ${daysLeft <= 7 ? 'text-red-600' : daysLeft <= 14 ? 'text-orange-500' : 'text-blue-500'}`}>
                                  {daysLeft <= 0 ? 'LEWAT BATAS!' : `${daysLeft} hari lagi`}
                                </p>
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

            {/* ===== CLAIMS ===== */}
            {activeTab === 'claims' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Daftar Klaim</h3>
                  <button onClick={() => { setClaimForm({ claim_date: new Date().toISOString().split('T')[0] }); setShowClaimModal(true); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                    <Plus className="w-3.5 h-3.5" /> Ajukan Klaim
                  </button>
                </div>

                {claims.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Belum ada klaim</p>
                    <p className="text-xs text-gray-400 mt-1">Klik &quot;Ajukan Klaim&quot; untuk membuat klaim baru</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">No. Klaim</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Karyawan</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Tipe</th>
                          <th className="text-right px-4 py-2 font-medium text-gray-600">Jumlah</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Tanggal</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Lampiran</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {claims.map((c: any) => {
                          let attachments: string[] = [];
                          try { if (c.receipt_url) attachments = JSON.parse(c.receipt_url); } catch { if (c.receipt_url) attachments = [c.receipt_url]; }
                          return (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium text-gray-800">{c.claim_number}</td>
                            <td className="px-4 py-2">
                              <p className="text-gray-800">{c.employee_name}</p>
                              <p className="text-xs text-gray-400">{c.department} • {c.position}</p>
                            </td>
                            <td className="px-4 py-2"><span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{c.claim_type}</span></td>
                            <td className="px-4 py-2 text-right font-medium">{fmtCurrency(c.amount)}</td>
                            <td className="px-4 py-2 text-gray-500 text-xs">{fmtDate(c.claim_date)}</td>
                            <td className="px-4 py-2">
                              {attachments.length > 0 ? (
                                <div className="flex gap-1">
                                  {attachments.map((url: string, i: number) => (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                      className="p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title={url}>
                                      {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <Image className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                    </a>
                                  ))}
                                </div>
                              ) : <span className="text-gray-300 text-xs">-</span>}
                            </td>
                            <td className="px-4 py-2">{statusBadge(c.status)}</td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ===== REMINDERS ===== */}
            {activeTab === 'reminders' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Pengingat Aktif</h3>
                  <button onClick={async () => {
                    const res = await fetch('/api/hq/hris/reminders?action=generate', { method: 'POST' });
                    const json = await res.json();
                    showToast('success', json.message || 'Reminders generated');
                    fetchReminders();
                    fetchReminderSummary();
                  }} className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">
                    <RefreshCw className="w-3.5 h-3.5" /> Generate Reminders
                  </button>
                </div>

                {reminders.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Tidak ada pengingat</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reminders.map((r: any) => {
                      const daysLeft = Math.ceil((new Date(r.due_date).getTime() - Date.now()) / 86400000);
                      const urgency = daysLeft <= 0 ? 'border-l-red-600 bg-red-50/50' : daysLeft <= 7 ? 'border-l-red-500' : daysLeft <= 14 ? 'border-l-orange-400' : 'border-l-blue-400';
                      return (
                        <div key={r.id} className={`border border-l-4 ${urgency} rounded-lg p-3`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded">{r.reminder_type}</span>
                                <p className="text-sm font-medium text-gray-800">{r.title}</p>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{r.employee_name} • {r.department} • {r.position}</p>
                              {r.description && <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>}
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                              <p className="text-xs font-medium text-gray-600">{fmtDate(r.due_date)}</p>
                              <p className={`text-xs font-bold ${daysLeft <= 0 ? 'text-red-600' : daysLeft <= 7 ? 'text-red-500' : daysLeft <= 14 ? 'text-orange-500' : 'text-blue-500'}`}>
                                {daysLeft <= 0 ? 'OVERDUE!' : `${daysLeft} hari`}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== CLAIM MODAL ===== */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowClaimModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-800">Ajukan Klaim Baru</h3>
              <button onClick={() => setShowClaimModal(false)} className="p-1.5 hover:bg-gray-100 rounded"><span className="text-lg">&times;</span></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Employee ID (angka) *</label>
                <input type="number" value={claimForm.employee_id || ''} onChange={e => setClaimForm((f: any) => ({ ...f, employee_id: parseInt(e.target.value) || '' }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="ID karyawan" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Tipe Klaim *</label>
                  <select value={claimForm.claim_type || ''} onChange={e => setClaimForm((f: any) => ({ ...f, claim_type: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                    <option value="">Pilih</option>
                    {['transport','meal','medical','training','travel','equipment','other'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Jumlah (Rp) *</label>
                  <input type="number" value={claimForm.amount || ''} onChange={e => setClaimForm((f: any) => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Tanggal Klaim</label>
                <input type="date" value={claimForm.claim_date || ''} onChange={e => setClaimForm((f: any) => ({ ...f, claim_date: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Deskripsi</label>
                <textarea value={claimForm.description || ''} onChange={e => setClaimForm((f: any) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1" rows={2} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">No. Bukti/Kwitansi</label>
                <input type="text" value={claimForm.receipt_number || ''} onChange={e => setClaimForm((f: any) => ({ ...f, receipt_number: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>

              {/* File Upload Section */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Lampiran Bukti (Foto / PDF)</label>
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    uploading ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50'
                  }`}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={e => { e.preventDefault(); e.stopPropagation(); handleFileUpload(e.dataTransfer.files); }}
                >
                  {uploading ? (
                    <div className="flex items-center justify-center gap-2 text-blue-600">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Mengupload...</span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-500">Drag & drop file di sini, atau</p>
                      <label className="inline-block mt-1 px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg cursor-pointer hover:bg-emerald-700">
                        Pilih File
                        <input type="file" multiple accept="image/*,.pdf" className="hidden"
                          onChange={e => handleFileUpload(e.target.files)} />
                      </label>
                      <p className="text-[10px] text-gray-400 mt-1">Maks 10MB per file. Format: JPG, PNG, PDF</p>
                    </>
                  )}
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {file.mimetype?.startsWith('image/') ? (
                            <Image className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                          )}
                          <span className="text-xs text-gray-700 truncate">{file.filename}</span>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <a href={file.url} target="_blank" rel="noopener noreferrer"
                            className="p-1 text-gray-400 hover:text-blue-600 rounded">
                            <Eye className="w-3.5 h-3.5" />
                          </a>
                          <button onClick={() => removeUploadedFile(idx)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => { setShowClaimModal(false); setUploadedFiles([]); }} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
              <button onClick={submitClaim} disabled={uploading}
                className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50">
                <Send className="w-3.5 h-3.5" /> Ajukan
              </button>
            </div>
          </div>
        </div>
      )}
    </HQLayout>
  );
}
