import { useState, useEffect, useCallback } from 'react';
import {
  Shield, CheckCircle, XCircle, Clock, Calendar, Wallet, Timer,
  AlertTriangle, Users, FileWarning, Plus, Loader2, ChevronRight,
  Send, Stamp,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

const SP_TYPES = [
  { value: 'TEGURAN', label: 'Teguran Lisan/Tertulis' },
  { value: 'SP1', label: 'SP 1' },
  { value: 'SP2', label: 'SP 2' },
  { value: 'SP3', label: 'SP 3' },
];

type MgrTab = 'approvals' | 'disciplinary' | 'team';

type Props = { isSuperAdmin?: boolean };

const mgrApi = async (action: string, method = 'GET', body?: any) => {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`/api/employee/manager?action=${action}`, opts);
  return r.json();
};

export default function ManagerHubTab({ isSuperAdmin = false }: Props) {
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
    violation_description: '', incident_date: '', request_reason: '',
  });

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

  const handleCreateSp = async () => {
    if (!spForm.employee_id || !spForm.violation_description) {
      toast.error('Pilih karyawan dan isi deskripsi pelanggaran'); return;
    }
    setSubmitting(true);
    try {
      const res = await mgrApi('create-disciplinary', 'POST', spForm);
      if (res.success) {
        toast.success(res.message || 'Draft SP dibuat');
        setShowSpModal(false);
        setSpForm(f => ({ ...f, employee_id: '', violation_description: '', incident_date: '', request_reason: '' }));
        loadAll();
      } else toast.error(res.error || 'Gagal membuat SP');
    } catch { toast.error('Gagal membuat SP'); }
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
        <p className="text-violet-100 text-xs">Persetujuan tim & surat peringatan</p>
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
          { key: 'disciplinary' as MgrTab, label: 'Surat SP', icon: FileWarning },
          { key: 'team' as MgrTab, label: 'Tim', icon: Users },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
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
            <Plus className="w-4 h-4" /> Buat Surat Peringatan
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
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  letter.status === 'issued' ? 'bg-red-50 text-red-700' :
                  letter.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                  'bg-amber-50 text-amber-700'
                }`}>{letter.status}</span>
              </div>
              <p className="text-xs text-slate-600 mb-3 line-clamp-2">{letter.violation_description}</p>
              <div className="flex gap-2">
                {['draft', 'drafting'].includes(letter.status) && (
                  <button onClick={() => handleSubmitSp(letter.id)} disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold ring-1 ring-blue-200">
                    <Send className="w-3.5 h-3.5" /> Ajukan
                  </button>
                )}
                {isSuperAdmin && letter.status !== 'issued' && (
                  <button onClick={() => handleIssueSp(letter.id)} disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold">
                    <Stamp className="w-3.5 h-3.5" /> Terbitkan
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
          {team.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Tidak ada anggota tim</p>
            </div>
          ) : team.map(member => (
            <div key={member.id} className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 p-3">
              <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">
                {(member.name || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{member.name}</p>
                <p className="text-[11px] text-slate-500">{member.position} · {member.department}</p>
              </div>
              <button
                onClick={() => { setSpForm(f => ({ ...f, employee_id: member.id })); setShowSpModal(true); setActiveTab('disciplinary'); }}
                className="p-2 rounded-lg bg-red-50 text-red-600 active:scale-95"
                title="Buat SP"
              >
                <AlertTriangle className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
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
            <h3 className="font-bold text-slate-900">Buat Surat Peringatan</h3>
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
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Alasan / Catatan</label>
              <textarea value={spForm.request_reason} onChange={e => setSpForm(f => ({ ...f, request_reason: e.target.value }))}
                rows={2} placeholder="Catatan tambahan..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none" />
            </div>
            <button onClick={handleCreateSp} disabled={submitting}
              className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm disabled:opacity-50">
              {submitting ? 'Menyimpan...' : 'Simpan Draft SP'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
