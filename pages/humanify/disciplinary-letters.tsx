import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import DocumentExportButton from '@/components/documents/DocumentExportButton';
import EmployeePicker, { type PickedEmployee } from '@/components/humanify/EmployeePicker';
import {
  EmployeeAvatar, TypeBadge, StatusBadge, ApprovalTimeline,
  LetterTypeCards, StatCard, SkeletonCards, EmptyState, WizardSteps, TYPE_STYLES,
} from '@/components/humanify/disciplinary/DisciplinaryUI';
import {
  AlertTriangle, Plus, Search, CheckCircle, XCircle, Clock, FileText,
  ChevronRight, RefreshCw, X, Save, Send, Settings, ArrowUpRight,
  BookOpen, Scale, GitBranch, Calendar, User, Filter,
  LayoutList, PanelRightOpen,
} from 'lucide-react';
import LetterDraftEditor from '@/components/humanify/disciplinary/LetterDraftEditor';
import SOPConfigModal, { SOPConfigList } from '@/components/humanify/disciplinary/SOPConfigModal';
import {
  VIOLATION_TYPE_LABELS,
  DISCIPLINARY_LADDER,
  getDocumentTypeForLetter,
  parseDraftContent,
  type DisciplinaryLetterType,
  type DraftContent,
} from '@/lib/hris/disciplinary-workflow';

type View = 'board' | 'create' | 'sop';

const QUICK_FILTERS = [
  { key: '', label: 'Semua' },
  { key: 'manager_requests', label: 'Permohonan Manager', statuses: ['submitted', 'investigating'], requestSource: 'manager_portal' },
  { key: 'pending', label: 'Menunggu', statuses: ['submitted', 'investigating', 'drafting', 'review', 'pending_approval'] },
  { key: 'draft', label: 'Draft', statuses: ['draft', 'drafting'] },
  { key: 'issued', label: 'Diterbitkan', statuses: ['issued', 'acknowledged', 'approved'] },
  { key: 'rejected', label: 'Ditolak', statuses: ['rejected'] },
];

export default function DisciplinaryLettersPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('board');
  const [letters, setLetters] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [selected, setSelected] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sopTemplates, setSopTemplates] = useState<any[]>([]);
  const [summary, setSummary] = useState({ pending: 0, issued: 0, draft: 0, managerRequests: 0, total: 0 });
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [quickFilter, setQuickFilter] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const [pickedEmployee, setPickedEmployee] = useState<PickedEmployee | null>(null);
  const [employeeHistory, setEmployeeHistory] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComments, setApprovalComments] = useState('');
  const [letterData, setLetterData] = useState<any>(null);
  const [letterMeta, setLetterMeta] = useState<any>(null);
  const [createStep, setCreateStep] = useState(0);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const [form, setForm] = useState({
    letter_type: 'SP1' as DisciplinaryLetterType,
    violation_type: 'discipline',
    violation_description: '',
    incident_date: '',
    request_reason: '',
    notes: '',
    termination_type: 'phk',
    severance_amount: '',
  });

  const [draftSaving, setDraftSaving] = useState(false);
  const [sopModalOpen, setSopModalOpen] = useState(false);
  const [editingSOP, setEditingSOP] = useState<any>(null);

  const [draftForm, setDraftForm] = useState<DraftContent>({ body: '', closing: '', salutation: '', subject: '', place: 'Jakarta' });
  const [investigationNotes, setInvestigationNotes] = useState('');
  const [bootstrappedFromQuery, setBootstrappedFromQuery] = useState(false);

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  const api = useCallback(async (action: string, method = 'GET', body?: any, extra = '') => {
    const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`/api/humanify/disciplinary-letters?action=${action}${extra}`, opts);
    return r.json();
  }, []);

  const loadLetters = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: 'list' });
      if (filterStatus) params.set('status', filterStatus);
      if (filterType) params.set('letter_type', filterType);
      const qf = QUICK_FILTERS.find(f => f.key === quickFilter);
      if (qf?.requestSource) params.set('request_source', qf.requestSource);
      const [listRes, sumRes] = await Promise.all([
        fetch(`/api/humanify/disciplinary-letters?${params}`).then((r) => r.json()),
        api('summary'),
      ]);
      let data = listRes.data || [];
      if (qf?.statuses?.length && !filterStatus) {
        data = data.filter((l: any) => qf.statuses!.includes(l.status));
      }
      if (listRes.success) {
        setLetters(data);
        setDataSource(data.length ? 'live' : 'empty');
      }
      if (sumRes.success) setSummary(sumRes.data || {});
    } catch {
      showToast('error', 'Gagal memuat data surat');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, quickFilter, api]);

  const loadSOP = async () => {
    const res = await api('sop-templates');
    if (res.success) setSopTemplates(res.data || []);
  };

  const loadDetail = async (id: string, silent = false) => {
    if (!silent) setDetailLoading(true);
    try {
      const [detRes, letRes] = await Promise.all([
        api('detail', 'GET', null, `&id=${id}`),
        api('letter-data', 'GET', null, `&id=${id}`),
      ]);
      if (detRes.success) {
        setSelected(detRes.data);
        setShowMobileDetail(true);
        setDraftForm(parseDraftContent(detRes.data?.draft_content));
        setInvestigationNotes(detRes.data?.investigation_notes || '');
      }
      if (letRes.success) {
        setLetterData(letRes.data?.letterData);
        setLetterMeta(letRes.data?.meta);
      }
    } catch {
      showToast('error', 'Gagal memuat detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const loadEmployeeHistory = async (employeeId: string) => {
    const res = await api('employee-history', 'GET', null, `&employee_id=${employeeId}`);
    if (res.success) setEmployeeHistory(res.data || []);
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    loadLetters();
    loadSOP();
  }, [mounted, loadLetters]);

  // Deep-link from IR / other modules: ?view=create&type=SP1  or  ?id=<uuid>
  useEffect(() => {
    if (!mounted || !router.isReady || bootstrappedFromQuery) return;
    const q = router.query;
    const typeQ = typeof q.type === 'string' ? q.type.toUpperCase() : '';
    const viewQ = typeof q.view === 'string' ? q.view : '';
    const idQ = typeof q.id === 'string' ? q.id : '';

    if (viewQ === 'create' || viewQ === 'sop' || viewQ === 'board') {
      setView(viewQ as View);
    }
    if (typeQ && DISCIPLINARY_LADDER.includes(typeQ as DisciplinaryLetterType)) {
      setForm((f) => ({ ...f, letter_type: typeQ as DisciplinaryLetterType }));
      setFilterType(typeQ);
      if (viewQ !== 'sop') setView(viewQ === 'board' ? 'board' : 'create');
    }
    if (idQ) {
      setView('board');
      loadDetail(idQ);
    }
    setBootstrappedFromQuery(true);
  }, [mounted, router.isReady, router.query, bootstrappedFromQuery]);

  useEffect(() => {
    if (pickedEmployee?.id) loadEmployeeHistory(pickedEmployee.id);
    else setEmployeeHistory([]);
  }, [pickedEmployee?.id]);

  const handleCreate = async () => {
    if (!pickedEmployee?.id || !form.violation_description) {
      showToast('error', 'Karyawan dan deskripsi pelanggaran wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api('create', 'POST', {
        employee_id: pickedEmployee.id,
        ...form,
        severance_amount: form.severance_amount ? parseFloat(form.severance_amount) : 0,
      });
      if (res.success) {
        showToast('success', res.message || 'Pengajuan berhasil dibuat');
        setView('board');
        setCreateStep(0);
        loadLetters();
        if (res.data?.id) loadDetail(res.data.id);
        setForm({ ...form, violation_description: '', request_reason: '', notes: '' });
        setPickedEmployee(null);
      } else {
        showToast('error', res.error || res.errors?.join(', ') || 'Gagal membuat pengajuan');
      }
    } catch {
      showToast('error', 'Gagal membuat pengajuan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (id: string) => {
    const res = await api('submit', 'POST', { id });
    if (res.success) { showToast('success', res.message); loadDetail(id, true); loadLetters(); }
    else showToast('error', res.error);
  };

  const handleStartInvestigation = async () => {
    if (!selected?.id) return;
    setSubmitting(true);
    try {
      const res = await api('start-investigation', 'POST', {
        id: selected.id,
        investigation_notes: investigationNotes || undefined,
      });
      if (res.success) {
        showToast('success', res.message);
        loadDetail(selected.id, true);
        loadLetters();
      } else showToast('error', res.error);
    } finally { setSubmitting(false); }
  };

  const handleCompleteInvestigation = async () => {
    if (!selected?.id) return;
    setSubmitting(true);
    try {
      const res = await api('complete-investigation', 'POST', {
        id: selected.id,
        investigation_notes: investigationNotes,
      });
      if (res.success) {
        showToast('success', res.message);
        loadDetail(selected.id, true);
        loadLetters();
      } else showToast('error', res.error);
    } finally { setSubmitting(false); }
  };

  const handleSaveDraft = async () => {
    if (!selected?.id) return;
    setDraftSaving(true);
    try {
      const res = await api('save-draft', 'POST', {
        id: selected.id,
        draft_content: draftForm,
        investigation_notes: investigationNotes,
      });
      if (res.success) {
        showToast('success', 'Draft disimpan');
        loadDetail(selected.id, true);
        loadLetters();
      } else showToast('error', res.error);
    } finally {
      setDraftSaving(false);
    }
  };

  const handleRegenerateDraft = async () => {
    if (!selected?.id) return;
    const res = await api('regenerate-draft', 'POST', { id: selected.id });
    if (res.success) {
      setDraftForm(parseDraftContent(res.data));
      showToast('success', res.message || 'Draft diregenerasi');
    } else showToast('error', res.error);
  };

  const handleSaveSOP = async (data: any) => {
    if (data.id && !String(data.id).startsWith('default-')) {
      const res = await api('sop-template', 'PUT', data, `&id=${data.id}`);
      if (!res.success) throw new Error(res.error);
      showToast('success', 'SOP diperbarui');
    } else {
      const res = await api('sop-template', 'POST', data);
      if (!res.success) throw new Error(res.error);
      showToast('success', 'SOP baru dibuat');
    }
    loadSOP();
  };

  const handleApproval = async () => {
    if (!selected?.id) return;
    if (approvalAction === 'reject' && !approvalComments.trim()) {
      showToast('error', 'Alasan penolakan wajib diisi');
      return;
    }
    const action = approvalAction === 'approve' ? 'approve' : 'reject';
    const res = await api(action, 'POST', { id: selected.id, comments: approvalComments });
    if (res.success) {
      showToast('success', res.message);
      setShowApproval(false);
      setApprovalComments('');
      loadDetail(selected.id, true);
      loadLetters();
    } else showToast('error', res.error);
  };

  const handleIssue = async () => {
    if (!selected?.id) return;
    const res = await api('issue', 'POST', { id: selected.id });
    if (res.success) {
      showToast('success', res.message);
      loadDetail(selected.id, true);
      loadLetters();
    } else showToast('error', res.error);
  };

  const handleAcknowledge = async () => {
    if (!selected?.id) return;
    const res = await api('acknowledge', 'POST', { id: selected.id });
    if (res.success) { showToast('success', res.message); loadDetail(selected.id, true); loadLetters(); }
  };

  const filtered = letters.filter((l) => {
    let ok = true;
    if (search) {
      const q = search.toLowerCase();
      ok = (l.employee_name || '').toLowerCase().includes(q)
        || (l.letter_number || '').toLowerCase().includes(q)
        || (l.reference_number || '').toLowerCase().includes(q);
    }
    if (ok && quickFilter) {
      const qf = QUICK_FILTERS.find((f) => f.key === quickFilter);
      if (qf?.statuses) ok = qf.statuses.includes(l.status);
    }
    return ok;
  });

  const activeSOP = sopTemplates.find((s) => s.letter_type === form.letter_type);
  const approvalPct = selected?.approval_steps?.length
    ? Math.round((selected.approval_steps.filter((s: any) => s.status === 'approved').length / selected.approval_steps.length) * 100)
    : 0;

  if (!mounted) return null;

  return (
    <HQLayout title="Surat Disiplin & SOP">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-white text-sm animate-in slide-in-from-top-2 ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'
        }`}>
          {toast.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* Hero header */}
        <div className="bg-gradient-to-r from-slate-900 via-[var(--hf-brand-500)] to-slate-900 text-white">
          <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur border border-white/10">
                    <Scale className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">Manajemen Surat Disiplin</h1>
                    <p className="text-[color:var(--hf-brand-600)]/80 text-sm">Teguran · SP1 · SP2 · SP3 · PHK — workflow SOP good governance</p>
                  </div>
                </div>
                {/* Mini ladder */}
                <div className="flex flex-wrap items-center gap-1.5 mt-4">
                  {DISCIPLINARY_LADDER.map((type, i) => (
                    <div key={type} className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setFilterType(filterType === type ? '' : type); setView('board'); }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          filterType === type ? 'bg-white text-[color:var(--hf-brand-600)]' : 'bg-white/10 text-white/80 hover:bg-white/20'
                        }`}
                      >
                        {type}
                      </button>
                      {i < DISCIPLINARY_LADDER.length - 1 && <ChevronRight className="w-3 h-3 text-white/30" />}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DataSourceBadge source={dataSource} className="!bg-white/90" />
                <button
                  onClick={() => setView(view === 'sop' ? 'board' : 'sop')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    view === 'sop' ? 'bg-white text-[color:var(--hf-brand-600)]' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                  }`}
                >
                  <Settings className="w-4 h-4" /> Konfigurasi SOP
                </button>
                <button
                  onClick={() => { setView('create'); setCreateStep(0); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-orange-900/30"
                >
                  <Plus className="w-4 h-4" /> Ajukan Surat Baru
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-5 md:py-6">
          {/* SOP View */}
          {view === 'sop' && (
            <div className="space-y-4">
              <button onClick={() => setView('board')} className="text-sm text-[color:var(--hf-brand-600)] hover:text-[color:var(--hf-brand-600)] font-medium">
                ← Kembali ke papan kerja
              </button>
              <SOPConfigList
                templates={sopTemplates}
                onRefresh={loadSOP}
                onCreate={() => { setEditingSOP(null); setSopModalOpen(true); }}
                onEdit={(t) => { setEditingSOP(t); setSopModalOpen(true); }}
              />
            </div>
          )}

          {/* Create wizard */}
          {view === 'create' && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold text-gray-900">Pengajuan Surat Disiplin</h2>
                  <button onClick={() => setView('board')} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <WizardSteps steps={['Pilih Karyawan', 'Jenis & Pelanggaran', 'Review & Simpan']} current={createStep} />

                {createStep === 0 && (
                  <div className="space-y-5 animate-in fade-in duration-300">
                    <EmployeePicker value={pickedEmployee?.id} onChange={setPickedEmployee} label="Karyawan yang Bersangkutan" required />
                    {pickedEmployee && (
                      <div className="flex items-center gap-4 p-4 bg-[var(--hf-brand-50)] rounded-2xl border border-[var(--hf-brand-100)]">
                        <EmployeeAvatar name={pickedEmployee.name} size="lg" />
                        <div>
                          <p className="font-semibold text-gray-900">{pickedEmployee.name}</p>
                          <p className="text-sm text-gray-500">{pickedEmployee.position} · {pickedEmployee.department_label}</p>
                          <p className="text-xs text-[color:var(--hf-brand-600)] font-mono mt-0.5">{pickedEmployee.employee_id}</p>
                        </div>
                      </div>
                    )}
                    {employeeHistory.length > 0 && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                        <p className="text-xs font-semibold text-amber-800 mb-3 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Riwayat Disiplin Karyawan
                        </p>
                        <div className="space-y-2">
                          {employeeHistory.slice(0, 4).map((h) => (
                            <div key={h.id} className="flex items-center gap-2 text-xs bg-white rounded-lg px-3 py-2 border border-amber-100">
                              <TypeBadge type={h.letter_type} />
                              <span className="text-gray-600 font-mono">{h.letter_number || h.reference_number || '—'}</span>
                              <StatusBadge status={h.status} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      disabled={!pickedEmployee}
                      onClick={() => setCreateStep(1)}
                      className="w-full py-3 bg-[var(--hf-brand-600)] text-white rounded-xl font-medium hover:bg-[var(--hf-brand)] disabled:opacity-40 transition-all"
                    >
                      Lanjut →
                    </button>
                  </div>
                )}

                {createStep === 1 && (
                  <div className="space-y-5 animate-in fade-in duration-300">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">Pilih Jenis Surat</label>
                      <LetterTypeCards value={form.letter_type} onChange={(t) => setForm({ ...form, letter_type: t })} />
                    </div>
                    {activeSOP && (
                      <div className="rounded-2xl border border-[var(--hf-brand-50)] bg-[var(--hf-brand-50)]/50 p-4 text-sm">
                        <p className="font-semibold text-[color:var(--hf-brand-600)]">{activeSOP.name}</p>
                        <p className="text-[color:var(--hf-brand)]/80 text-xs mt-1">{activeSOP.description}</p>
                        <p className="text-xs text-[color:var(--hf-brand-600)] mt-2">{(activeSOP.approval_levels || []).length} tahap persetujuan · berlaku {activeSOP.validity_months} bulan</p>
                      </div>
                    )}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Jenis Pelanggaran</label>
                        <select value={form.violation_type} onChange={(e) => setForm({ ...form, violation_type: e.target.value })}
                          className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-[var(--hf-brand-500)] focus:border-[var(--hf-brand-500)]">
                          {Object.entries(VIOLATION_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Tanggal Kejadian</label>
                        <input type="date" value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })}
                          className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-[var(--hf-brand-500)]" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Deskripsi Pelanggaran *</label>
                      <textarea value={form.violation_description} onChange={(e) => setForm({ ...form, violation_description: e.target.value })}
                        rows={4} className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-[var(--hf-brand-500)]"
                        placeholder="Uraikan pelanggaran secara detail, sertakan bukti dan saksi jika ada..." />
                    </div>
                    {form.letter_type === 'TERMINATION' && (
                      <div className="grid sm:grid-cols-2 gap-4 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                        <div>
                          <label className="text-xs font-medium text-rose-700">Tipe PHK</label>
                          <select value={form.termination_type} onChange={(e) => setForm({ ...form, termination_type: e.target.value })}
                            className="w-full mt-1 px-3 py-2 border rounded-xl text-sm">
                            <option value="phk">PHK</option>
                            <option value="pemecatan">Pemecatan</option>
                            <option value="kontrak_berakhir">Kontrak Berakhir</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-rose-700">Estimasi Pesangon (Rp)</label>
                          <input type="number" value={form.severance_amount} onChange={(e) => setForm({ ...form, severance_amount: e.target.value })}
                            className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" />
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button onClick={() => setCreateStep(0)} className="flex-1 py-3 border rounded-xl text-sm font-medium hover:bg-gray-50">← Kembali</button>
                      <button
                        disabled={!form.violation_description.trim()}
                        onClick={() => setCreateStep(2)}
                        className="flex-1 py-3 bg-[var(--hf-brand-600)] text-white rounded-xl font-medium hover:bg-[var(--hf-brand)] disabled:opacity-40"
                      >
                        Lanjut Review →
                      </button>
                    </div>
                  </div>
                )}

                {createStep === 2 && (
                  <div className="space-y-5 animate-in fade-in duration-300">
                    <div className="rounded-2xl border bg-gray-50 p-5 space-y-3 text-sm">
                      <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                        <EmployeeAvatar name={pickedEmployee?.name} />
                        <div>
                          <p className="font-semibold">{pickedEmployee?.name}</p>
                          <p className="text-xs text-gray-500">{pickedEmployee?.position}</p>
                        </div>
                        <TypeBadge type={form.letter_type} size="md" />
                      </div>
                      <div><span className="text-gray-400">Pelanggaran:</span> <span className="font-medium">{VIOLATION_TYPE_LABELS[form.violation_type as keyof typeof VIOLATION_TYPE_LABELS]}</span></div>
                      <div><span className="text-gray-400">Tanggal:</span> {form.incident_date ? fmtDate(form.incident_date) : '—'}</div>
                      <div className="bg-white rounded-xl p-3 border"><p className="text-gray-700">{form.violation_description}</p></div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Alasan Pengajuan (opsional)</label>
                      <textarea value={form.request_reason} onChange={(e) => setForm({ ...form, request_reason: e.target.value })}
                        rows={2} className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm" placeholder="Rekomendasi atasan, latar belakang..." />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setCreateStep(1)} className="flex-1 py-3 border rounded-xl text-sm font-medium hover:bg-gray-50">← Kembali</button>
                      <button onClick={handleCreate} disabled={submitting}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 shadow-md">
                        <Save className="w-4 h-4" /> {submitting ? 'Menyimpan...' : 'Simpan sebagai Draft'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Board — master detail */}
          {view === 'board' && (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
                <StatCard label="Permohonan Manager" value={summary.managerRequests || 0} icon={User} gradient="from-[var(--hf-brand-600)] to-purple-600"
                  active={quickFilter === 'manager_requests'} onClick={() => setQuickFilter(quickFilter === 'manager_requests' ? '' : 'manager_requests')} />
                <StatCard label="Menunggu Proses" value={summary.pending} icon={Clock} gradient="from-amber-400 to-orange-500"
                  active={quickFilter === 'pending'} onClick={() => setQuickFilter(quickFilter === 'pending' ? '' : 'pending')} />
                <StatCard label="Diterbitkan" value={summary.issued} icon={CheckCircle} gradient="from-emerald-400 to-green-600"
                  active={quickFilter === 'issued'} onClick={() => setQuickFilter(quickFilter === 'issued' ? '' : 'issued')} />
                <StatCard label="Draft" value={summary.draft} icon={FileText} gradient="from-slate-400 to-slate-600"
                  active={quickFilter === 'draft'} onClick={() => setQuickFilter(quickFilter === 'draft' ? '' : 'draft')} />
                <StatCard label="Total Surat" value={summary.total} icon={BookOpen} gradient="from-[var(--hf-brand-600)] to-purple-600"
                  active={quickFilter === ''} onClick={() => setQuickFilter('')} />
              </div>

              <div className="flex flex-col xl:flex-row gap-5 min-h-[600px]">
                {/* List panel */}
                <div className={`${selected && showMobileDetail ? 'hidden xl:flex' : 'flex'} flex-col w-full xl:w-[420px] flex-shrink-0`}>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
                    {/* Search & filters */}
                    <div className="p-4 border-b border-gray-100 space-y-3">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, no. surat..."
                          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-[var(--hf-brand-500)] focus:bg-white transition-all" />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_FILTERS.map((f) => (
                          <button key={f.key} onClick={() => setQuickFilter(f.key)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                              quickFilter === f.key ? 'bg-[var(--hf-brand-600)] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}>
                            {f.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                          className="flex-1 px-2 py-1.5 text-xs border rounded-lg bg-gray-50">
                          <option value="">Semua jenis</option>
                          {DISCIPLINARY_LADDER.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button onClick={loadLetters} className="p-2 border rounded-lg hover:bg-gray-50">
                          <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Letter cards */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[calc(100vh-320px)]">
                      {loading ? <SkeletonCards count={5} /> : filtered.length === 0 ? (
                        <EmptyState
                          title="Belum ada surat"
                          description="Mulai dengan mengajukan surat teguran atau SP untuk karyawan"
                          actionLabel="Ajukan Surat"
                          onAction={() => { setView('create'); setCreateStep(0); }}
                        />
                      ) : filtered.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => loadDetail(l.id)}
                          className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-md ${
                            selected?.id === l.id
                              ? 'border-[var(--hf-brand-100)] bg-[var(--hf-brand-50)]/50 ring-2 ring-[var(--hf-brand-500)] shadow-sm'
                              : 'border-gray-100 bg-white hover:border-gray-200'
                          }`}
                        >
                          <div className="flex gap-3">
                            <EmployeeAvatar name={l.employee_name} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-gray-900 truncate text-sm">{l.employee_name || `#${l.employee_id}`}</p>
                                <TypeBadge type={l.letter_type} />
                              </div>
                              <p className="text-xs text-gray-500 truncate mt-0.5">{l.violation_description}</p>
                              <div className="flex items-center justify-between mt-2">
                                <StatusBadge status={l.status} />
                                <span className="text-[10px] text-gray-400 font-mono">{l.letter_number || l.reference_number?.slice(0, 16)}</span>
                              </div>
                              {l.total_approval_steps > 0 && (
                                <div className="mt-2">
                                  <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                                    <span>Tahap {l.current_approval_step || 1}/{l.total_approval_steps}</span>
                                  </div>
                                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-[var(--hf-brand-100)] rounded-full" style={{ width: `${Math.round(((l.current_approval_step || 1) - 1) / l.total_approval_steps * 100)}%` }} />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Detail panel */}
                <div className={`${!selected || !showMobileDetail ? 'hidden xl:block' : 'block'} flex-1 min-w-0`}>
                  {detailLoading && !selected ? (
                    <div className="bg-white rounded-2xl border p-8"><SkeletonCards count={3} /></div>
                  ) : !selected ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 h-full flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-[var(--hf-brand-50)] flex items-center justify-center mb-4">
                        <PanelRightOpen className="w-8 h-8 text-[color:var(--hf-brand-600)]" />
                      </div>
                      <h3 className="font-semibold text-gray-700">Pilih surat untuk melihat detail</h3>
                      <p className="text-sm text-gray-400 mt-1 max-w-xs">Klik salah satu surat di panel kiri untuk melihat alur persetujuan, draft, dan aksi</p>
                      <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
                        <LayoutList className="w-4 h-4" /> {filtered.length} surat ditampilkan
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Mobile back */}
                      <button onClick={() => setShowMobileDetail(false)} className="xl:hidden flex items-center gap-1 text-sm text-[color:var(--hf-brand-600)] font-medium mb-2">
                        ← Kembali ke daftar
                      </button>

                      {/* Detail header card */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className={`h-2 bg-gradient-to-r ${(TYPE_STYLES[selected.letter_type] || TYPE_STYLES.TEGURAN).gradient}`} />
                        <div className="p-5 md:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="flex gap-4">
                              <EmployeeAvatar name={selected.employee_name} size="lg" />
                              <div>
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <TypeBadge type={selected.letter_type} size="md" />
                                  <StatusBadge status={selected.status} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">{selected.employee_name}</h2>
                                <p className="text-sm text-gray-500">{selected.employee_code} · {selected.position}</p>
                              </div>
                            </div>
                            {selected.letter_number && (
                              <div className="text-right bg-[var(--hf-brand-50)] rounded-xl px-4 py-2 border border-[var(--hf-brand-100)]">
                                <p className="text-[10px] text-[color:var(--hf-brand-500)] font-medium uppercase tracking-wide">No. Surat Resmi</p>
                                <p className="font-mono text-sm font-bold text-[color:var(--hf-brand)]">{selected.letter_number}</p>
                              </div>
                            )}
                          </div>

                          {/* Progress bar */}
                          {selected.approval_steps?.length > 0 && (
                            <div className="mt-5 p-4 bg-gray-50 rounded-xl">
                              <div className="flex justify-between text-xs text-gray-600 mb-2">
                                <span className="font-medium">Progress Workflow SOP</span>
                                <span className="font-bold text-[color:var(--hf-brand-600)]">{approvalPct}%</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[var(--hf-brand-600)] to-purple-500 rounded-full transition-all duration-700" style={{ width: `${approvalPct}%` }} />
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1.5">Tahap {selected.current_approval_step || 1} dari {selected.total_approval_steps || 1}</p>
                            </div>
                          )}

                          {/* Meta grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
                            {[
                              { icon: FileText, label: 'Referensi', value: selected.reference_number?.slice(0, 20) },
                              { icon: Calendar, label: 'Kejadian', value: fmtDate(selected.incident_date) },
                              { icon: Filter, label: 'Pelanggaran', value: VIOLATION_TYPE_LABELS[selected.violation_type as keyof typeof VIOLATION_TYPE_LABELS] },
                            ].map(({ icon: Icon, label, value }) => (
                              <div key={label} className="bg-gray-50 rounded-xl p-3">
                                <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                                  <Icon className="w-3.5 h-3.5" /><span className="text-[10px] uppercase tracking-wide font-medium">{label}</span>
                                </div>
                                <p className="text-sm font-medium text-gray-800 truncate">{value || '—'}</p>
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                            <p className="text-xs font-semibold text-amber-800 mb-1">Deskripsi Pelanggaran</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{selected.violation_description}</p>
                          </div>

                          {selected.request_source === 'manager_portal' && (
                            <div className="mt-4 p-4 bg-[var(--hf-brand-50)]/50 rounded-xl border border-[var(--hf-brand-50)]">
                              <p className="text-xs font-semibold text-[color:var(--hf-brand-600)] mb-2">Permohonan dari Manajer</p>
                              <p className="text-sm text-gray-700"><span className="font-medium">Pengaju:</span> {selected.requester_name || '—'}</p>
                              {selected.request_reason && (
                                <p className="text-sm text-gray-700 mt-1"><span className="font-medium">Alasan:</span> {selected.request_reason}</p>
                              )}
                              {selected.notes && (
                                <p className="text-sm text-gray-600 mt-1"><span className="font-medium">Catatan:</span> {selected.notes}</p>
                              )}
                            </div>
                          )}

                          {Array.isArray(selected.attachments) && selected.attachments.length > 0 && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                              <p className="text-xs font-semibold text-gray-700 mb-2">Bukti / Evidence ({selected.attachments.length})</p>
                              <div className="flex flex-wrap gap-2">
                                {selected.attachments.map((att: any, i: number) => (
                                  <a key={i} href={att.data || att.url || '#'} target="_blank" rel="noopener noreferrer"
                                    className="block w-20 h-20 rounded-lg border overflow-hidden bg-white hover:ring-2 hover:ring-[var(--hf-brand-500)]">
                                    {att.type?.startsWith('image/') && (att.data || att.url) ? (
                                      <img src={att.data || att.url} alt={att.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-500 p-1 text-center">{att.name || `File ${i + 1}`}</div>
                                    )}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action bar */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Aksi HR</p>
                        <div className="flex flex-wrap gap-2">
                          {selected.status === 'submitted' && (
                            <button onClick={handleStartInvestigation} disabled={submitting}
                              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 shadow-sm disabled:opacity-50">
                              <Search className="w-4 h-4" /> Mulai Investigasi
                            </button>
                          )}
                          {selected.status === 'investigating' && (
                            <button onClick={handleCompleteInvestigation} disabled={submitting}
                              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--hf-brand-600)] text-white rounded-xl text-sm font-medium hover:bg-[var(--hf-brand)] shadow-sm disabled:opacity-50">
                              <CheckCircle className="w-4 h-4" /> Selesai Investigasi → Draft
                            </button>
                          )}
                          {['draft', 'drafting'].includes(selected.status) && (
                            <button onClick={() => handleSubmit(selected.id)}
                              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--hf-brand-600)] text-white rounded-xl text-sm font-medium hover:bg-[var(--hf-brand)] shadow-sm">
                              <Send className="w-4 h-4" /> Ajukan Persetujuan
                            </button>
                          )}
                          {['pending_approval', 'review'].includes(selected.status) && (
                            <>
                              <button onClick={() => { setApprovalAction('approve'); setShowApproval(true); }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">
                                <CheckCircle className="w-4 h-4" /> Setujui Tahap
                              </button>
                              <button onClick={() => { setApprovalAction('reject'); setShowApproval(true); }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">
                                <XCircle className="w-4 h-4" /> Tolak
                              </button>
                            </>
                          )}
                          {['submitted', 'investigating', 'drafting'].includes(selected.status) && (
                            <button onClick={() => { setApprovalAction('reject'); setShowApproval(true); }}
                              className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50">
                              <XCircle className="w-4 h-4" /> Tolak Permohonan
                            </button>
                          )}
                          {selected.status === 'approved' && (
                            <button onClick={handleIssue}
                              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-sm font-semibold hover:from-orange-600 hover:to-amber-600 shadow-md">
                              <ArrowUpRight className="w-4 h-4" /> Terbitkan Surat
                            </button>
                          )}
                          {selected.status === 'issued' && (
                            <button onClick={handleAcknowledge}
                              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700">
                              <User className="w-4 h-4" /> Konfirmasi Diterima
                            </button>
                          )}
                          {['issued', 'acknowledged', 'approved'].includes(selected.status) && letterData && (
                            <DocumentExportButton
                              documentType={getDocumentTypeForLetter(selected.letter_type) as any}
                              variant="button"
                              label="Unduh PDF"
                              data={letterData}
                              meta={letterMeta || { documentNumber: selected.letter_number || selected.reference_number, documentDate: selected.effective_date || selected.incident_date }}
                              options={{
                                includeHeader: false,
                                includeFooter: false,
                                includeSignature: false,
                              }}
                              showFormats={['pdf', 'html']}
                            />
                          )}
                        </div>
                      </div>

                      {/* Draft editor + preview */}
                      {['draft', 'drafting', 'investigating', 'review', 'approved'].includes(selected.status) && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                          <LetterDraftEditor
                            letter={{
                              letter_type: selected.letter_type,
                              reference_number: selected.reference_number,
                              letter_number: selected.letter_number,
                              employee_name: selected.employee_name,
                              employee_code: selected.employee_code,
                              position: selected.position,
                              department: selected.department,
                              violation_type: selected.violation_type,
                              incident_date: selected.incident_date,
                              effective_date: selected.effective_date,
                            }}
                            draft={draftForm}
                            onChange={setDraftForm}
                            onSave={handleSaveDraft}
                            onRegenerate={['draft', 'drafting'].includes(selected.status) ? handleRegenerateDraft : undefined}
                            saving={draftSaving}
                            readOnly={!['draft', 'drafting', 'investigating', 'review'].includes(selected.status)}
                          />
                          {['draft', 'drafting', 'investigating', 'review'].includes(selected.status) && (
                            <div className="mt-4 pt-4 border-t">
                              <label className="text-xs font-medium text-gray-500">Catatan Investigasi (internal, tidak tercetak)</label>
                              <textarea value={investigationNotes} onChange={(e) => setInvestigationNotes(e.target.value)}
                                rows={2} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm bg-amber-50/30" />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Timeline */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-5">
                          <GitBranch className="w-5 h-5 text-[color:var(--hf-brand-500)]" />
                          Alur Persetujuan SOP
                          <span className="text-xs font-normal text-gray-400 ml-1">
                            ({selected.approval_steps?.filter((s: any) => s.status === 'approved').length || 0}/{selected.approval_steps?.length || 0} selesai)
                          </span>
                        </h3>
                        <ApprovalTimeline steps={selected.approval_steps || []} fmtDate={fmtDate} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Approval modal */}
      {showApproval && selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowApproval(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4" onClick={(e) => e.stopPropagation()}>
            <div className={`px-6 py-4 ${approvalAction === 'approve' ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-3">
                {approvalAction === 'approve'
                  ? <CheckCircle className="w-8 h-8 text-emerald-600" />
                  : <XCircle className="w-8 h-8 text-red-600" />}
                <div>
                  <h3 className="font-bold text-gray-900">{approvalAction === 'approve' ? 'Setujui Tahap' : 'Tolak Pengajuan'}</h3>
                  <p className="text-xs text-gray-500">{selected.employee_name} · {selected.letter_type}</p>
                </div>
                <button onClick={() => setShowApproval(false)} className="ml-auto p-1 hover:bg-white/50 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
            </div>
            <div className="p-6">
              <textarea value={approvalComments} onChange={(e) => setApprovalComments(e.target.value)}
                rows={4} className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-[var(--hf-brand-500)] resize-none"
                placeholder={approvalAction === 'approve' ? 'Catatan persetujuan (opsional)...' : 'Alasan penolakan (wajib)...'} />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowApproval(false)} className="flex-1 py-3 border rounded-xl text-sm font-medium hover:bg-gray-50">Batal</button>
                <button onClick={handleApproval}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white shadow-sm ${
                    approvalAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}>
                  {approvalAction === 'approve' ? 'Konfirmasi Setuju' : 'Konfirmasi Tolak'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <SOPConfigModal
        open={sopModalOpen}
        template={editingSOP}
        onClose={() => { setSopModalOpen(false); setEditingSOP(null); }}
        onSave={handleSaveSOP}
      />
    </HQLayout>
  );
}
