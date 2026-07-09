import { useState, useEffect, useCallback, memo } from 'react';
import {
  Shield, CheckCircle, XCircle, Clock, Calendar, Wallet, Timer,
  AlertTriangle, Users, FileWarning, Plus, Loader2, ChevronRight,
  Send, Stamp, Paperclip, X, Search, MapPin, Navigation, Image, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import TeamMemberDetailSheet from './TeamMemberDetailSheet';
import VisitDetailModal from './VisitDetailModal';

const fmtCur = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

const LEAVE_TYPE_LABEL: Record<string, string> = {
  annual: 'Cuti Tahunan', sick: 'Cuti Sakit', important: 'Cuti Penting',
  maternity: 'Cuti Melahirkan', unpaid: 'Cuti Tanpa Gaji',
};

const CLAIM_TYPE_LABEL: Record<string, string> = {
  medical: 'Medis', transport: 'Transport', meals: 'Makan',
  accommodation: 'Akomodasi', communication: 'Komunikasi', other: 'Lainnya',
};

const SP_STATUS_LABEL: Record<string, string> = {
  submitted: 'Review HR Team',
  investigating: 'Investigasi HR',
  drafting: 'Penyusunan Draft',
  review: 'Review HR Team',
  pending_approval: 'Persetujuan HR',
  approved: 'Disetujui HR',
  issued: 'Diterbitkan',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
  draft: 'Draft',
};

const SP_IN_PROGRESS_STATUSES = new Set([
  'submitted', 'investigating', 'drafting', 'review', 'pending_approval',
]);

/** Label tombol nonaktif untuk manajer selama proses HR */
const SP_PROGRESS_BUTTON_LABEL: Record<string, string> = {
  submitted: 'Dalam proses review HR Team',
  investigating: 'Sedang diinvestigasi HR Team',
  drafting: 'HR menyusun draft surat',
  review: 'Dalam proses review HR Team',
  pending_approval: 'Menunggu persetujuan HR Team',
  approved: 'Disetujui — menunggu penerbitan HR',
};

const SP_STATUS_COLOR: Record<string, string> = {
  submitted: 'bg-blue-50 text-blue-700 ring-blue-200',
  investigating: 'bg-amber-50 text-amber-700 ring-amber-200',
  drafting: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  pending_approval: 'bg-violet-50 text-violet-700 ring-violet-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  issued: 'bg-red-50 text-red-700 ring-red-200',
  rejected: 'bg-slate-100 text-slate-600',
  review: 'bg-violet-50 text-violet-700 ring-violet-200',
};
const SP_TYPES = [
  { value: 'TEGURAN', label: 'Teguran Lisan/Tertulis' },
  { value: 'SP1', label: 'SP 1' },
  { value: 'SP2', label: 'SP 2' },
  { value: 'SP3', label: 'SP 3' },
];

const VISIT_STATUS_LABEL: Record<string, string> = {
  planned: 'Rencana', checked_in: 'Aktif', completed: 'Selesai', cancelled: 'Batal',
};

type MgrTab = 'approvals' | 'disciplinary' | 'team' | 'visits';

type Props = { isSuperAdmin?: boolean };

const mgrApi = async (action: string, method = 'GET', body?: any, params?: Record<string, string>) => {
  const qs = new URLSearchParams({ action, ...params });
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`/api/employee/manager?${qs}`, opts);
  const text = await r.text();
  try {
    const json = JSON.parse(text);
    if (!json.success && r.status === 413) {
      return { success: false, error: 'Ukuran bukti terlalu besar. Gunakan foto lebih kecil atau kurangi jumlah file.' };
    }
    if (!json.success && !json.error && r.status >= 400) {
      return { success: false, error: `Gagal (${r.status})` };
    }
    return json;
  } catch {
    if (r.status === 413) {
      return { success: false, error: 'Ukuran bukti terlalu besar. Gunakan foto lebih kecil atau kurangi jumlah file.' };
    }
    return { success: false, error: `Gagal memproses respons server (${r.status})` };
  }
};

/** Kompres gambar sebelum upload agar tidak melebihi batas body API */
async function compressImageFile(file: File, maxWidth = 1280, quality = 0.72): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 250_000) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / (img.width || maxWidth));
      const w = Math.max(1, Math.round((img.width || maxWidth) * scale));
      const h = Math.max(1, Math.round((img.height || maxWidth) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) { resolve(file); return; }
        const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
        resolve(new File([blob], name, { type: 'image/jpeg' }));
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export default memo(function ManagerHubTab({ isSuperAdmin = false }: Props) {
  const [activeTab, setActiveTab] = useState<MgrTab>('approvals');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ leave: 0, claims: 0, overtime: 0, total: 0 });
  const [pending, setPending] = useState<{ leave: any[]; claims: any[]; overtime: any[] }>({ leave: [], claims: [], overtime: [] });
  const [team, setTeam] = useState<any[]>([]);
  const [letters, setLetters] = useState<any[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'leave' | 'claim' | 'overtime'>('all');
  const [showRejectModal, setShowRejectModal] = useState<{ type: string; id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSpModal, setShowSpModal] = useState(false);
  const [spForm, setSpForm] = useState({
    employee_id: '', letter_type: 'SP1', violation_type: 'discipline',
    violation_description: '', incident_date: '', request_reason: '', notes: '',
  });
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidencePreviews, setEvidencePreviews] = useState<{ name: string; url: string; type: string }[]>([]);
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string } | null>(null);
  const [visitFeed, setVisitFeed] = useState<any[]>([]);
  const [visitSummary, setVisitSummary] = useState<any>(null);
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [visitDetail, setVisitDetail] = useState<any>(null);
  const [visitDetailLoading, setVisitDetailLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, pendRes, teamRes, letRes] = await Promise.all([
        mgrApi('summary'), mgrApi('pending-approvals'), mgrApi('team'), mgrApi('disciplinary-letters'),
      ]);
      if (sumRes.success) setSummary(sumRes.data);
      if (pendRes.success) setPending(pendRes.data);
      if (teamRes.success) setTeam(teamRes.data || []);
      if (letRes.success) setLetters(letRes.data || []);
    } catch { toast.error('Gagal memuat data manajer'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadVisitFeed = useCallback(async () => {
    try {
      const res = await mgrApi('team-visit-feed', 'GET', undefined, { date: visitDate });
      if (res.success) {
        setVisitFeed(res.data?.visits || []);
        setVisitSummary(res.data?.summary || null);
      }
    } catch { /* ignore */ }
  }, [visitDate]);

  useEffect(() => {
    if (activeTab === 'visits') loadVisitFeed();
  }, [activeTab, loadVisitFeed]);

  const openVisitDetail = async (visitId: string) => {
    setVisitDetailLoading(true);
    setVisitDetail(null);
    try {
      const res = await mgrApi('team-visit-detail', 'GET', undefined, { visitId });
      if (res.success) setVisitDetail(res.data);
      else toast.error(res.error || 'Gagal memuat detail');
    } finally { setVisitDetailLoading(false); }
  };

  const handleApprove = async (type: string, id: string) => {
    setSubmitting(true);
    const actionMap: Record<string, string> = {
      leave: 'approve-leave', claim: 'approve-claim', overtime: 'approve-overtime',
    };
    try {
      const res = await mgrApi(actionMap[type], 'POST', { id });
      if (res.success) { toast.success(res.message || 'Disetujui'); loadAll(); }
      else toast.error(res.error || 'Gagal menyetujui');
    } catch { toast.error('Gagal menyetujui'); }
    finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!showRejectModal || !rejectReason.trim()) { toast.error('Alasan penolakan wajib'); return; }
    setSubmitting(true);
    const actionMap: Record<string, string> = {
      leave: 'reject-leave', claim: 'reject-claim', overtime: 'reject-overtime',
    };
    try {
      const res = await mgrApi(actionMap[showRejectModal.type], 'POST', {
        id: showRejectModal.id, reason: rejectReason,
      });
      if (res.success) {
        toast.success(res.message || 'Ditolak');
        setShowRejectModal(null); setRejectReason(''); loadAll();
      } else toast.error(res.error || 'Gagal menolak');
    } catch { toast.error('Gagal menolak'); }
    finally { setSubmitting(false); }
  };

  const handleEvidenceFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    const compressed = await Promise.all(selected.map(f => compressImageFile(f)));
    const combined = [...evidenceFiles, ...compressed].slice(0, 5);
    setEvidenceFiles(combined);
    combined.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => setEvidencePreviews(prev => {
        if (prev.find(p => p.name === file.name)) return prev;
        return [...prev, { url: reader.result as string, name: file.name, type: file.type }];
      });
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeEvidence = (name: string) => {
    setEvidenceFiles(prev => prev.filter(f => f.name !== name));
    setEvidencePreviews(prev => prev.filter(p => p.name !== name));
  };

  const handleCreateSp = async () => {
    if (!spForm.employee_id || !spForm.violation_description) {
      toast.error('Pilih karyawan dan isi deskripsi pelanggaran'); return;
    }
    if (!spForm.request_reason?.trim()) {
      toast.error('Alasan permohonan wajib diisi'); return;
    }
    setSubmitting(true);
    try {
      const compressedFiles = await Promise.all(evidenceFiles.map(f => compressImageFile(f)));
      const attachments = await Promise.all(compressedFiles.map(file => new Promise<{ name: string; type: string; data: string }>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, type: file.type, data: reader.result as string });
        reader.readAsDataURL(file);
      })));
      const totalSize = attachments.reduce((s, a) => s + (a.data?.length || 0), 0);
      if (totalSize > 8 * 1024 * 1024) {
        toast.error('Total bukti terlalu besar. Kurangi jumlah/kualitas foto.');
        return;
      }
      const res = await mgrApi('create-disciplinary', 'POST', { ...spForm, attachments });
      if (res.success) {
        toast.success(res.message || 'Permohonan SP diajukan ke HR');
        setShowSpModal(false);
        setSpForm(f => ({ ...f, employee_id: '', violation_description: '', incident_date: '', request_reason: '', notes: '' }));
        setEvidenceFiles([]);
        setEvidencePreviews([]);
        loadAll();
      } else toast.error(res.error || 'Gagal mengajukan SP');
    } catch { toast.error('Gagal mengajukan SP'); }
    finally { setSubmitting(false); }
  };

  const handleSubmitSp = async (id: string) => {
    setSubmitting(true);
    try {
      const res = await mgrApi('submit-disciplinary', 'POST', { id });
      if (res.success) { toast.success(res.message); loadAll(); }
      else toast.error(res.error || 'Gagal mengajukan');
    } catch { toast.error('Gagal mengajukan'); }
    finally { setSubmitting(false); }
  };

  const handleIssueSp = async (id: string) => {
    if (!confirm('Terbitkan surat peringatan ini? Karyawan akan menerima notifikasi.')) return;
    setSubmitting(true);
    try {
      const res = await mgrApi('issue-disciplinary', 'POST', { id });
      if (res.success) { toast.success(res.message); loadAll(); }
      else toast.error(res.error || 'Gagal menerbitkan');
    } catch { toast.error('Gagal menerbitkan'); }
    finally { setSubmitting(false); }
  };

  const allPending = [
    ...pending.leave.map(i => ({ ...i, approval_type: 'leave' })),
    ...pending.claims.map(i => ({ ...i, approval_type: 'claim' })),
    ...pending.overtime.map(i => ({ ...i, approval_type: 'overtime' })),
  ].filter(i => approvalFilter === 'all' || i.approval_type === approvalFilter)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header badge */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-4 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5" />
          <span className="font-bold text-sm">Panel Manajer</span>
          {isSuperAdmin && (
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">Super Admin</span>
          )}
        </div>
        <p className="text-violet-100 text-xs">Persetujuan tim, KPI & absensi karyawan</p>
        {summary.total > 0 && (
          <p className="mt-2 text-sm font-semibold">{summary.total} pengajuan menunggu persetujuan</p>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { key: 'leave', icon: Calendar, label: 'Cuti', count: summary.leave, color: 'text-blue-600 bg-blue-50' },
          { key: 'claims', icon: Wallet, label: 'Klaim', count: summary.claims, color: 'text-emerald-600 bg-emerald-50' },
          { key: 'overtime', icon: Timer, label: 'Lembur', count: summary.overtime, color: 'text-orange-600 bg-orange-50' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => { setActiveTab('approvals'); setApprovalFilter(s.key === 'claims' ? 'claim' : s.key as any); }}
            className={`rounded-xl p-3 border border-slate-100 text-center active:scale-95 transition-transform ${s.count > 0 ? 'ring-2 ring-violet-200' : ''}`}
          >
            <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center mx-auto mb-1`}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="text-lg font-bold text-slate-900">{s.count}</p>
            <p className="text-[10px] text-slate-500 font-medium">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {([
          { key: 'approvals' as MgrTab, label: 'Persetujuan', icon: CheckCircle },
          { key: 'visits' as MgrTab, label: 'Kunjungan', icon: Navigation },
          { key: 'disciplinary' as MgrTab, label: 'Surat SP', icon: FileWarning },
          { key: 'team' as MgrTab, label: 'Tim', icon: Users },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-semibold transition-all ${
              activeTab === t.key ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Approvals tab */}
      {activeTab === 'approvals' && (
        <div className="space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'leave', 'claim', 'overtime'] as const).map(f => (
              <button key={f} onClick={() => setApprovalFilter(f)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                  approvalFilter === f ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                {f === 'all' ? 'Semua' : f === 'leave' ? 'Cuti' : f === 'claim' ? 'Klaim' : 'Lembur'}
              </button>
            ))}
          </div>

          {allPending.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Tidak ada pengajuan menunggu</p>
            </div>
          ) : allPending.map(item => (
            <div key={`${item.approval_type}-${item.id}`} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm text-slate-900">{item.employee_name}</p>
                  <p className="text-[11px] text-slate-500">{item.position} · {item.department}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                  {item.approval_type === 'leave' ? 'Cuti' : item.approval_type === 'claim' ? 'Klaim' : 'Lembur'}
                </span>
              </div>

              {item.approval_type === 'leave' && (
                <div className="text-xs text-slate-600 space-y-0.5 mb-3">
                  <p><span className="font-medium">Jenis:</span> {LEAVE_TYPE_LABEL[item.leave_type] || item.leave_type}</p>
                  <p><span className="font-medium">Tanggal:</span> {fmtDate(item.start_date)} – {fmtDate(item.end_date)} ({item.total_days} hari)</p>
                  <p><span className="font-medium">Alasan:</span> {item.reason}</p>
                  {item.total_approval_steps > 1 && (
                    <p className="text-violet-600 font-medium">
                      Tahap {item.pending_step_order || item.current_approval_step || 1}/{item.total_approval_steps}
                      {item.pending_approver_role ? ` · ${item.pending_approver_role}` : ''}
                    </p>
                  )}
                </div>
              )}
              {item.approval_type === 'claim' && (
                <div className="text-xs text-slate-600 space-y-0.5 mb-3">
                  <p><span className="font-medium">Jenis:</span> {CLAIM_TYPE_LABEL[item.claim_type] || item.claim_type}</p>
                  <p><span className="font-medium">Nominal:</span> {fmtCur(item.amount)}</p>
                  <p><span className="font-medium">Keterangan:</span> {item.description}</p>
                </div>
              )}
              {item.approval_type === 'overtime' && (
                <div className="text-xs text-slate-600 space-y-0.5 mb-3">
                  <p><span className="font-medium">Tanggal:</span> {fmtDate(item.date)} · {item.start_time}–{item.end_time} ({item.duration_hours}j)</p>
                  <p><span className="font-medium">Alasan:</span> {item.reason}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(item.approval_type, item.id)}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-emerald-500 text-white text-xs font-semibold active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Setujui
                </button>
                <button
                  onClick={() => setShowRejectModal({ type: item.approval_type, id: item.id })}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200 text-xs font-semibold active:scale-95 disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" /> Tolak
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disciplinary tab */}
      {activeTab === 'disciplinary' && (
        <div className="space-y-3">
          <button
            onClick={() => setShowSpModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold active:scale-95"
          >
            <Plus className="w-4 h-4" /> Ajukan Permohonan SP
          </button>

          {letters.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <FileWarning className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Belum ada surat peringatan</p>
            </div>
          ) : letters.map(letter => (
            <div key={letter.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm">{letter.letter_type} — {letter.employee_name}</p>
                  <p className="text-[11px] text-slate-500">{letter.employee_code} · {letter.department}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${
                  SP_STATUS_COLOR[letter.status] || 'bg-slate-100 text-slate-600 ring-slate-200'
                }`}>{SP_STATUS_LABEL[letter.status] || letter.status}</span>
              </div>
              <p className="text-xs text-slate-600 mb-1 line-clamp-2">{letter.violation_description}</p>
              {letter.request_reason && (
                <p className="text-[11px] text-slate-500 mb-2"><span className="font-medium">Alasan:</span> {letter.request_reason}</p>
              )}
              <p className="text-[10px] text-slate-400 mb-3">Diajukan {fmtDate(letter.created_at)}</p>
              <div className="flex gap-2">
                {['draft', 'drafting'].includes(letter.status) && letter.request_source !== 'manager_portal' && (
                  <button onClick={() => handleSubmitSp(letter.id)} disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold ring-1 ring-blue-200">
                    <Send className="w-3.5 h-3.5" /> Ajukan ke HR
                  </button>
                )}
                {isSuperAdmin && letter.status === 'approved' && (
                  <button onClick={() => handleIssueSp(letter.id)} disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold active:scale-95 disabled:opacity-50">
                    <Stamp className="w-3.5 h-3.5" /> Terbitkan
                  </button>
                )}
                {SP_IN_PROGRESS_STATUSES.has(letter.status) && (
                  <button type="button" disabled
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold ring-1 ring-slate-200 cursor-not-allowed opacity-90">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-center leading-tight">
                      {SP_PROGRESS_BUTTON_LABEL[letter.status] || 'Dalam proses HR Team'}
                    </span>
                  </button>
                )}
                {letter.status === 'approved' && !isSuperAdmin && (
                  <button type="button" disabled
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold ring-1 ring-emerald-200 cursor-not-allowed">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-center leading-tight">Disetujui — menunggu penerbitan HR</span>
                  </button>
                )}
                {letter.status === 'issued' && letter.letter_number && (
                  <div className="flex-1 text-center py-2 rounded-xl bg-red-50 text-red-700 text-xs font-semibold ring-1 ring-red-200">
                    No. {letter.letter_number}
                  </div>
                )}
                {['rejected', 'cancelled'].includes(letter.status) && (
                  <button type="button" disabled
                    className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold ring-1 ring-slate-200 cursor-not-allowed">
                    {letter.status === 'rejected' ? 'Permohonan ditolak HR' : 'Permohonan dibatalkan'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team tab */}
      {activeTab === 'team' && (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-500 px-1">Ketuk nama karyawan untuk melihat KPI, absensi & kunjungan</p>
          {team.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Tidak ada anggota tim</p>
            </div>
          ) : team.map(member => (
            <div key={member.id} className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 p-3">
              <button
                type="button"
                onClick={() => setSelectedMember({ id: String(member.id), name: member.name })}
                className="flex items-center gap-3 flex-1 min-w-0 text-left active:scale-[0.98] transition-transform"
              >
                <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {(member.name || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{member.name}</p>
                  <p className="text-[11px] text-slate-500">{member.position} · {member.department}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
              <button
                onClick={() => { setSpForm(f => ({ ...f, employee_id: member.id })); setShowSpModal(true); setActiveTab('disciplinary'); }}
                className="p-2 rounded-lg bg-red-50 text-red-600 active:scale-95 shrink-0"
                title="Buat SP"
              >
                <AlertTriangle className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Visits tab — laporan kunjungan tim */}
      {activeTab === 'visits' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={visitDate}
              onChange={e => setVisitDate(e.target.value)}
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm"
            />
            <button type="button" onClick={loadVisitFeed} className="p-2.5 rounded-xl bg-violet-50 text-violet-700 active:scale-95">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {visitSummary && (
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: 'Total', value: visitSummary.total, color: 'text-slate-700' },
                { label: 'Selesai', value: visitSummary.completed, color: 'text-emerald-600' },
                { label: 'Aktif', value: visitSummary.checked_in, color: 'text-blue-600' },
                { label: 'Bukti', value: visitSummary.with_photos, color: 'text-amber-600' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-2 text-center">
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[9px] text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {visitFeed.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Navigation className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Tidak ada kunjungan tim pada tanggal ini</p>
            </div>
          ) : visitFeed.map(v => (
            <button
              key={v.id}
              type="button"
              onClick={() => openVisitDetail(v.id)}
              className="w-full text-left bg-white rounded-xl border border-slate-100 p-3 shadow-sm active:scale-[0.99]"
            >
              <div className="flex gap-3">
                {v.thumbnail_url ? (
                  <img src={v.thumbnail_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" loading="lazy" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Image className="w-4 h-4 text-slate-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{v.customer_name}</p>
                  <p className="text-[11px] text-violet-600 font-medium">{v.employee_name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] text-slate-400">{VISIT_STATUS_LABEL[v.status] || v.status}</span>
                    {v.has_photos && <span className="text-[10px] text-amber-600">{v.evidence_count} foto</span>}
                    {v.check_in_geofence_name && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        <MapPin className="w-2.5 h-2.5 inline" /> GF
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 self-center" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Team member detail sheet */}
      {selectedMember && (
        <TeamMemberDetailSheet
          employeeId={selectedMember.id}
          employeeName={selectedMember.name}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowRejectModal(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-t-2xl p-5 space-y-4">
            <h3 className="font-bold text-slate-900">Alasan Penolakan</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Jelaskan alasan penolakan..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-300 outline-none resize-none"
            />
            <button onClick={handleReject} disabled={submitting}
              className="w-full py-3 rounded-xl bg-rose-500 text-white font-semibold text-sm disabled:opacity-50">
              {submitting ? 'Memproses...' : 'Konfirmasi Penolakan'}
            </button>
          </div>
        </div>
      )}

      {/* Create SP modal */}
      {showSpModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowSpModal(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-t-2xl p-5 space-y-3 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold text-slate-900">Ajukan Permohonan Surat Peringatan</h3>
            <p className="text-xs text-slate-500">Permohonan akan masuk ke HR untuk investigasi & penanganan</p>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Karyawan</label>
              <select value={spForm.employee_id} onChange={e => setSpForm(f => ({ ...f, employee_id: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm">
                <option value="">Pilih karyawan...</option>
                {team.map(m => <option key={m.id} value={m.id}>{m.name} — {m.position}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Jenis Surat</label>
              <select value={spForm.letter_type} onChange={e => setSpForm(f => ({ ...f, letter_type: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm">
                {SP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Tanggal Kejadian</label>
              <input type="date" value={spForm.incident_date} onChange={e => setSpForm(f => ({ ...f, incident_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Deskripsi Pelanggaran *</label>
              <textarea value={spForm.violation_description} onChange={e => setSpForm(f => ({ ...f, violation_description: e.target.value }))}
                rows={3} placeholder="Jelaskan pelanggaran yang dilakukan..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Alasan Permohonan *</label>
              <textarea value={spForm.request_reason} onChange={e => setSpForm(f => ({ ...f, request_reason: e.target.value }))}
                rows={2} placeholder="Mengapa SP perlu dikeluarkan..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Catatan Tambahan</label>
              <textarea value={spForm.notes} onChange={e => setSpForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} placeholder="Catatan internal untuk HR..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Bukti / Evidence</label>
              <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-500 cursor-pointer hover:border-violet-300 hover:text-violet-600">
                <Paperclip className="w-4 h-4" /> Upload foto/dokumen (max 5)
                <input type="file" accept="image/*,.pdf" multiple className="hidden" onChange={handleEvidenceFiles} />
              </label>
              {evidencePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {evidencePreviews.map(p => (
                    <div key={p.name} className="relative group">
                      {p.type.startsWith('image/') && p.url ? (
                        <img src={p.url} alt={p.name} className="w-16 h-16 rounded-lg object-cover border" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-[9px] text-slate-500 p-1 text-center border">{p.name.slice(0, 12)}</div>
                      )}
                      <button type="button" onClick={() => removeEvidence(p.name)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleCreateSp} disabled={submitting}
              className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm disabled:opacity-50">
              {submitting ? 'Mengajukan...' : 'Ajukan Permohonan ke HR'}
            </button>
          </div>
        </div>
      )}

      {(visitDetail || visitDetailLoading) && (
        <VisitDetailModal
          visit={visitDetail}
          loading={visitDetailLoading}
          onClose={() => { setVisitDetail(null); setVisitDetailLoading(false); }}
        />
      )}
    </div>
  );
});
