import { useState, useEffect, useCallback, memo } from 'react';
import {
  Shield, CheckCircle, XCircle, Clock, Calendar, Wallet, Timer,
  AlertTriangle, Users, FileWarning, Plus, Loader2, ChevronRight,
  Send, Stamp, X, Search, MapPin, Navigation, Image, RefreshCw, Eye,
  GraduationCap, Target, Plane, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import ClaimReceiptGallery, { parseClaimReceipts } from '@/components/humanify/ClaimReceiptGallery';
import EmployeeAvatar from '@/components/humanify/EmployeeAvatar';
import TeamMemberDetailSheet from './TeamMemberDetailSheet';
import VisitDetailModal from './VisitDetailModal';
import SpRequestModal from './SpRequestModal';

const fmtCur = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

const LEAVE_TYPE_LABEL: Record<string, string> = {
  annual: 'Cuti Tahunan', sick: 'Cuti Sakit', important: 'Cuti Penting',
  maternity: 'Cuti Melahirkan', unpaid: 'Cuti Tanpa Gaji',
  comp_off: 'Cuti Pengganti (Comp-Off)', compensatory: 'Cuti Pengganti',
};

const CLAIM_TYPE_LABEL: Record<string, string> = {
  medical: 'Medis', transport: 'Transport', meals: 'Makan', meal: 'Makan',
  accommodation: 'Akomodasi', communication: 'Komunikasi',
  travel: 'Perjalanan dinas', travel_expense: 'Biaya perjalanan', other: 'Lainnya',
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
  { value: 'TEGURAN', label: 'Teguran' },
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
  const [pending, setPending] = useState<{ leave: any[]; claims: any[]; overtime: any[]; mutations?: any[] }>({ leave: [], claims: [], overtime: [], mutations: [] });
  const [team, setTeam] = useState<any[]>([]);
  const [letters, setLetters] = useState<any[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'leave' | 'claim' | 'overtime' | 'mutation'>('all');
  const [showRejectModal, setShowRejectModal] = useState<{ type: string; id: string } | null>(null);
  const [proofClaim, setProofClaim] = useState<any>(null);
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
      const [pendRes, teamRes, letRes] = await Promise.all([
        mgrApi('pending-approvals'), mgrApi('team'), mgrApi('disciplinary-letters'),
      ]);
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
    try {
      if (type === 'mutation') {
        const res = await fetch('/api/humanify/workflow?action=approve-mutation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        const json = await res.json();
        if (json.success) {
          toast.success(json.deferred
            ? (json.message || 'Disetujui — penempatan menunggu tanggal efektif')
            : (json.message || 'Mutasi disetujui'));
          toast((t) => (
            <span className="text-sm">
              Antrian HR lain di{' '}
              <a href="/humanify/mss" className="font-semibold underline" onClick={() => toast.dismiss(t.id)}>MSS HQ</a>
            </span>
          ), { duration: 4000 });
          loadAll();
        } else toast.error(json.error || 'Gagal — proses via MSS jika perlu');
        return;
      }
      const actionMap: Record<string, string> = {
        leave: 'approve-leave', claim: 'approve-claim', overtime: 'approve-overtime',
      };
      const res = await mgrApi(actionMap[type], 'POST', { id });
      if (res.success) {
        if (type === 'overtime' && Number(res.compOffDays || 0) > 0) {
          toast.success(res.message || `Disetujui — ${res.compOffDays} hari cuti pengganti dikreditkan`);
        } else {
          toast.success(res.message || 'Disetujui');
        }
        toast((t) => (
          <span className="text-sm">
            Antrian HR lain di{' '}
            <a href="/humanify/mss" className="font-semibold underline" onClick={() => toast.dismiss(t.id)}>MSS HQ</a>
          </span>
        ), { duration: 4000 });
        loadAll();
      }
      else toast.error(res.error || 'Gagal menyetujui');
    } catch { toast.error('Gagal menyetujui'); }
    finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!showRejectModal || !rejectReason.trim()) { toast.error('Alasan penolakan wajib'); return; }
    setSubmitting(true);
    try {
      if (showRejectModal.type === 'mutation') {
        const res = await fetch('/api/humanify/workflow?action=reject-mutation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: showRejectModal.id, comments: rejectReason }),
        });
        const json = await res.json();
        if (json.success) {
          toast.success(json.message || 'Mutasi ditolak');
          setShowRejectModal(null); setRejectReason(''); loadAll();
        } else toast.error(json.error || 'Gagal menolak');
        return;
      }
      const actionMap: Record<string, string> = {
        leave: 'reject-leave', claim: 'reject-claim', overtime: 'reject-overtime',
      };
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
    ...(pending.mutations || []).map(i => ({ ...i, approval_type: 'mutation' })),
  ].filter(i => approvalFilter === 'all' || i.approval_type === approvalFilter)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const displaySummary = {
    leave: pending.leave.length,
    claims: pending.claims.length,
    overtime: pending.overtime.length,
    mutations: (pending.mutations || []).length,
    total: pending.leave.length + pending.claims.length + pending.overtime.length + (pending.mutations || []).length,
  };

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
        <p className="text-violet-100 text-xs">Persetujuan tim langsung · cuti, klaim & lembur bawahan Anda</p>
        <p className="mt-2 text-[11px] text-violet-50/90 bg-white/10 rounded-lg px-2.5 py-1.5">
          Lingkup <strong>tim saja</strong>. Antrian HR tenant-wide ada di MSS HQ (`/humanify/mss`).
        </p>
        {displaySummary.total > 0 && (
          <p className="mt-2 text-sm font-semibold">{displaySummary.total} pengajuan menunggu persetujuan</p>
        )}
      </div>

      {/* W95: MSS deep-links — training/OKR/travel not in manager pending-approvals API */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { href: '/humanify/mss', label: 'MSS HQ', icon: Shield },
          { href: '/humanify/training', label: 'Pelatihan', icon: GraduationCap },
          { href: '/humanify/okr', label: 'OKR', icon: Target },
          { href: '/humanify/travel-expense', label: 'Travel', icon: Plane },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-violet-50 hover:text-violet-700"
          >
            <l.icon className="w-3 h-3" /> {l.label}
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </Link>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { key: 'leave', icon: Calendar, label: 'Cuti', count: displaySummary.leave, color: 'text-blue-600 bg-blue-50' },
          { key: 'claims', icon: Wallet, label: 'Klaim', count: displaySummary.claims, color: 'text-emerald-600 bg-emerald-50' },
          { key: 'overtime', icon: Timer, label: 'Lembur', count: displaySummary.overtime, color: 'text-orange-600 bg-orange-50' },
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

      {/* Sub-tabs — horizontal scroll on narrow screens */}
      <div className="overflow-x-auto -mx-1 px-1 scrollbar-hide">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 min-w-max sm:min-w-0">
        {([
          { key: 'approvals' as MgrTab, label: 'Persetujuan', icon: CheckCircle, badge: displaySummary.total },
          { key: 'visits' as MgrTab, label: 'Kunjungan', icon: Navigation },
          { key: 'disciplinary' as MgrTab, label: 'Surat SP', icon: FileWarning },
          { key: 'team' as MgrTab, label: 'Tim', icon: Users },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`relative flex items-center justify-center gap-1 py-2.5 px-3 sm:flex-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
              activeTab === t.key ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            <t.icon className="w-3.5 h-3.5 shrink-0" />
            {t.label}
            {'badge' in t && t.badge != null && t.badge > 0 && (
              <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center">
                {t.badge > 9 ? '9+' : t.badge}
              </span>
            )}
          </button>
        ))}
        </div>
      </div>

      {/* Approvals tab */}
      {activeTab === 'approvals' && (
        <div className="space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'leave', 'claim', 'overtime', 'mutation'] as const).map(f => (
              <button key={f} onClick={() => setApprovalFilter(f)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                  approvalFilter === f ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                {f === 'all' ? 'Semua' : f === 'leave' ? 'Cuti' : f === 'claim' ? 'Klaim' : f === 'overtime' ? 'Lembur' : 'Mutasi'}
              </button>
            ))}
          </div>

          {allPending.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Tidak ada pengajuan menunggu</p>
            </div>
          ) : allPending.map(item => (
            <div key={`${item.approval_type}-${item.id}`} className="hf-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <EmployeeAvatar name={item.employee_name} photoUrl={item.photo_url} size="sm" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">{item.employee_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{item.position} · {item.department}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 shrink-0">
                  {item.approval_type === 'leave' ? 'Cuti' : item.approval_type === 'claim' ? 'Klaim' : item.approval_type === 'mutation' ? 'Mutasi' : 'Lembur'}
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
                  {item.claim_number && <p><span className="font-medium">No:</span> {item.claim_number}</p>}
                  <p><span className="font-medium">Nominal:</span> {fmtCur(item.amount)}</p>
                  <p><span className="font-medium">Keterangan:</span> {item.description}</p>
                  {(item.travel_request_id || item.travel_destination) && (
                    <p className="text-teal-700 font-medium">
                      ✈️ Trip: {item.travel_request_number || item.travel_destination || 'Terhubung perjalanan dinas'}
                      {item.travel_purpose ? ` · ${item.travel_purpose}` : ''}
                    </p>
                  )}
                  {(parseClaimReceipts(item.receipt_url).length || item.attachments_count || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setProofClaim(item)}
                      className="mt-1 inline-flex items-center gap-1 text-violet-700 font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" /> Lihat bukti ({parseClaimReceipts(item.receipt_url).length || item.attachments_count})
                    </button>
                  )}
                </div>
              )}
              {item.approval_type === 'overtime' && (
                <div className="text-xs text-slate-600 space-y-0.5 mb-3">
                  <p><span className="font-medium">Tanggal:</span> {fmtDate(item.date)} · {item.start_time}–{item.end_time} ({item.duration_hours}j)</p>
                  <p><span className="font-medium">Alasan:</span> {item.reason}</p>
                </div>
              )}
              {item.approval_type === 'mutation' && (
                <div className="text-xs text-slate-600 space-y-0.5 mb-3">
                  <p><span className="font-medium">No:</span> {item.mutation_number} · {item.mutation_type}</p>
                  <p><span className="font-medium">Ke:</span> {item.to_department || '-'} / {item.to_position || '-'}</p>
                  <p><span className="font-medium">Efektif:</span> {fmtDate(item.effective_date)}</p>
                  {item.reason && <p><span className="font-medium">Alasan:</span> {item.reason}</p>}
                  {item.status === 'approved' && item.effective_date && new Date(item.effective_date) > new Date(new Date().toDateString()) && (
                    <p className="text-sky-700 bg-sky-50 rounded px-2 py-1 mt-1">Menunggu efektif — penempatan ditunda hingga tanggal efektif</p>
                  )}
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
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold active:scale-[0.98] shadow-lg shadow-violet-500/20"
          >
            <Plus className="w-4 h-4" /> Ajukan Permohonan SP
          </button>

          {letters.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <FileWarning className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Belum ada surat peringatan</p>
              <p className="text-xs mt-1">Ajukan permohonan SP untuk karyawan tim Anda</p>
            </div>
          ) : letters.map(letter => (
            <div key={letter.id} className="hf-card overflow-hidden p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <EmployeeAvatar name={letter.employee_name} photoUrl={letter.photo_url} size="sm" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">
                      {SP_TYPES.find(t => t.value === letter.letter_type)?.label || letter.letter_type} — {letter.employee_name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{letter.employee_code} · {letter.department}</p>
                  </div>
                </div>
                <span className={`self-start shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ring-1 ${
                  SP_STATUS_COLOR[letter.status] || 'bg-slate-100 text-slate-600 ring-slate-200'
                }`}>{SP_STATUS_LABEL[letter.status] || letter.status}</span>
              </div>
              <p className="text-xs text-slate-600 mb-2 line-clamp-2 leading-relaxed">{letter.violation_description}</p>
              {letter.request_reason && (
                <p className="text-[11px] text-slate-500 mb-2 line-clamp-2"><span className="font-medium">Alasan:</span> {letter.request_reason}</p>
              )}
              <p className="text-[10px] text-slate-400 mb-3">Diajukan {fmtDate(letter.created_at)}</p>
              <div className="flex flex-col sm:flex-row gap-2">
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
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold ring-1 ring-slate-200 cursor-not-allowed">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-center leading-snug">
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
            <div key={member.id} className="flex items-center gap-3 hf-card border-slate-100 p-3">
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
                <div key={s.label} className="hf-card border-slate-100 p-2 text-center">
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
              className="w-full text-left hf-card border-slate-100 p-3 shadow-sm active:scale-[0.99]"
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

      {/* Create SP modal — multi-step responsive */}
      <SpRequestModal
        open={showSpModal}
        onClose={() => setShowSpModal(false)}
        team={team}
        form={spForm}
        onChange={(patch) => setSpForm(f => ({ ...f, ...patch }))}
        evidenceFiles={evidenceFiles}
        evidencePreviews={evidencePreviews}
        onEvidenceChange={handleEvidenceFiles}
        onRemoveEvidence={removeEvidence}
        onSubmit={handleCreateSp}
        submitting={submitting}
      />

      {(visitDetail || visitDetailLoading) && (
        <VisitDetailModal
          visit={visitDetail}
          loading={visitDetailLoading}
          onClose={() => { setVisitDetail(null); setVisitDetailLoading(false); }}
        />
      )}

      {proofClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setProofClaim(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <EmployeeAvatar name={proofClaim.employee_name} photoUrl={proofClaim.photo_url} size="md" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">Bukti Klaim</h3>
                  <p className="text-sm text-slate-500 truncate">{proofClaim.employee_name} · {fmtCur(proofClaim.amount)}</p>
                </div>
              </div>
              <button type="button" onClick={() => setProofClaim(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-xl border bg-slate-50 p-4">
              <ClaimReceiptGallery receiptUrl={proofClaim.receipt_url} maxThumbs={8} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
