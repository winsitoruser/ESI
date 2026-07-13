import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import DocumentExportButton from '@/components/documents/DocumentExportButton';
import {
  ArrowRightLeft, Plus, Search, Filter, Eye, CheckCircle, XCircle, Clock,
  Building2, Briefcase, Users, FileText, ChevronRight, RefreshCw, X, Save,
  GitBranch, MapPin, Layers, AlertCircle,
} from 'lucide-react';
import {
  HRIS_DEPARTMENTS,
  getDepartmentLabel,
} from '@/lib/hris/master-data';
import {
  MUTATION_TYPE_LABELS,
  MUTATION_SCOPE_LABELS,
  MUTATION_STATUS_LABELS,
  type MutationType,
  type MutationScope,
} from '@/lib/hris/mutation-workflow';

type Tab = 'list' | 'create' | 'detail';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  executed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

const STEP_COLORS: Record<string, string> = {
  pending: 'bg-amber-400',
  waiting: 'bg-gray-300',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
};

export default function MutationsPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [mutations, setMutations] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

  const [showApproval, setShowApproval] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComments, setApprovalComments] = useState('');

  const [letterData, setLetterData] = useState<any>(null);
  const [letterMeta, setLetterMeta] = useState<any>(null);

  const [form, setForm] = useState({
    employee_id: '',
    mutation_type: 'transfer' as MutationType,
    mutation_scope: 'department' as MutationScope,
    effective_date: '',
    to_branch_id: '',
    to_department: '',
    to_position: '',
    reason: '',
    notes: '',
    new_salary: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  const loadMutations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: 'mutations' });
      if (filterStatus) params.set('status', filterStatus);
      if (filterType) params.set('mutation_type', filterType);
      const res = await fetch(`/api/humanify/workflow?${params}`);
      const json = await res.json();
      if (json.success) {
        const rows = json.data || [];
        setMutations(rows);
        setDataSource(rows.length ? 'live' : 'empty');
      } else showToast('error', json.error || 'Gagal memuat data');
    } catch {
      showToast('error', 'Gagal memuat data mutasi');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType]);

  const loadMaster = async () => {
    try {
      const [empRes, mdRes] = await Promise.all([
        fetch('/api/humanify/employee-profile?action=list&limit=200'),
        fetch('/api/humanify/master-data'),
      ]);
      const empJson = await empRes.json();
      const mdJson = await mdRes.json();
      if (empJson.success) setEmployees(empJson.data || []);
      if (mdJson.success) setBranches(mdJson.data?.branches || []);
    } catch { /* ignore */ }
  };

  const loadDetail = async (id: string) => {
    setLoading(true);
    try {
      const [detRes, letRes] = await Promise.all([
        fetch(`/api/humanify/workflow?action=mutation-detail&id=${id}`),
        fetch(`/api/humanify/workflow?action=mutation-letter-data&id=${id}`),
      ]);
      const detJson = await detRes.json();
      const letJson = await letRes.json();
      if (detJson.success) {
        setSelected(detJson.data);
        setActiveTab('detail');
      }
      if (letJson.success) {
        setLetterData(letJson.data?.letterData);
        setLetterMeta(letJson.data?.meta);
      }
    } catch {
      showToast('error', 'Gagal memuat detail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    loadMaster();
    loadMutations();
  }, [mounted, loadMutations]);

  const handleSubmit = async () => {
    if (!form.employee_id || !form.effective_date || !form.mutation_type) {
      showToast('error', 'Karyawan, jenis, dan tanggal efektif wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/humanify/workflow?action=mutation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          new_salary: form.new_salary ? parseFloat(form.new_salary) : null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', json.message || 'Pengajuan berhasil');
        setForm({ employee_id: '', mutation_type: 'transfer', mutation_scope: 'department', effective_date: '', to_branch_id: '', to_department: '', to_position: '', reason: '', notes: '', new_salary: '' });
        setActiveTab('list');
        loadMutations();
      } else {
        showToast('error', json.error || 'Gagal mengajukan');
      }
    } catch {
      showToast('error', 'Gagal mengajukan mutasi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproval = async () => {
    if (!selected) return;
    if (approvalAction === 'reject' && !approvalComments.trim()) {
      showToast('error', 'Alasan penolakan wajib diisi');
      return;
    }
    try {
      const action = approvalAction === 'approve' ? 'approve-mutation' : 'reject-mutation';
      const res = await fetch(`/api/humanify/workflow?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, comments: approvalComments }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', json.message);
        setShowApproval(false);
        setApprovalComments('');
        loadDetail(selected.id);
        loadMutations();
      } else {
        showToast('error', json.error || 'Gagal');
      }
    } catch {
      showToast('error', 'Gagal memproses persetujuan');
    }
  };

  const filtered = mutations.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (m.employee_name || '').toLowerCase().includes(q)
      || (m.mutation_number || '').toLowerCase().includes(q);
  });

  const stats = {
    pending: mutations.filter((m) => m.status === 'pending').length,
    approved: mutations.filter((m) => ['approved', 'executed'].includes(m.status)).length,
    rejected: mutations.filter((m) => m.status === 'rejected').length,
  };

  if (!mounted) return null;

  return (
    <HQLayout title="Mutasi & Penugasan" currentMenu="hris">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ArrowRightLeft className="w-6 h-6 text-indigo-600" /> Mutasi, Penugasan & Perpindahan
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Pengajuan perpindahan antar departemen, bagian, wilayah — dengan approval & E-Letter
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DataSourceBadge source={dataSource} />
            {activeTab !== 'list' && (
              <button onClick={() => { setActiveTab('list'); setSelected(null); }}
                className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">← Daftar</button>
            )}
            {activeTab === 'list' && (
              <button onClick={() => setActiveTab('create')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                <Plus className="w-4 h-4" /> Ajukan Mutasi / Penugasan
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {activeTab === 'list' && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Menunggu Approval', value: stats.pending, color: 'text-amber-600 bg-amber-50', icon: Clock },
              { label: 'Disetujui', value: stats.approved, color: 'text-green-600 bg-green-50', icon: CheckCircle },
              { label: 'Ditolak', value: stats.rejected, color: 'text-red-600 bg-red-50', icon: XCircle },
            ].map((c, i) => (
              <div key={i} className="bg-white rounded-xl border p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${c.color}`}><c.icon className="w-5 h-5" /></div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{c.value}</p>
                  <p className="text-xs text-gray-500">{c.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LIST */}
        {activeTab === 'list' && (
          <div className="bg-white rounded-xl border">
            <div className="p-4 border-b flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / nomor..."
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
              </div>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm">
                <option value="">Semua Status</option>
                {Object.entries(MUTATION_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm">
                <option value="">Semua Jenis</option>
                {Object.entries(MUTATION_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button onClick={loadMutations} className="p-2 border rounded-lg hover:bg-gray-50">
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['No. Surat', 'Karyawan', 'Jenis', 'Lingkup', 'Dari → Ke', 'Efektif', 'Status', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400">Memuat...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400">Belum ada pengajuan mutasi / penugasan</td></tr>
                  ) : filtered.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => loadDetail(m.id)}>
                      <td className="px-4 py-3 font-mono text-xs text-indigo-600">{m.mutation_number}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{m.employee_name}</p>
                        <p className="text-xs text-gray-400">{m.employee_code}</p>
                      </td>
                      <td className="px-4 py-3">{MUTATION_TYPE_LABELS[m.mutation_type as MutationType] || m.mutation_type}</td>
                      <td className="px-4 py-3 text-xs">{MUTATION_SCOPE_LABELS[m.mutation_scope as MutationScope] || m.mutation_scope || '-'}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className="text-gray-500">{m.from_department || m.from_branch_name || '-'}</span>
                        <ChevronRight className="w-3 h-3 inline mx-1 text-gray-300" />
                        <span className="text-gray-800">{m.to_department || m.to_branch_name || m.to_position || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">{fmtDate(m.effective_date)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[m.status] || 'bg-gray-100'}`}>
                          {MUTATION_STATUS_LABELS[m.status as keyof typeof MUTATION_STATUS_LABELS] || m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3"><Eye className="w-4 h-4 text-gray-400" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CREATE FORM */}
        {activeTab === 'create' && (
          <div className="bg-white rounded-xl border p-6 max-w-2xl">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" /> Form Pengajuan Mutasi / Penugasan
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500">Karyawan *</label>
                <select value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                  <option value="">Pilih karyawan...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} — {e.position} ({e.employee_id})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Jenis *</label>
                  <select value={form.mutation_type} onChange={(e) => setForm((f) => ({ ...f, mutation_type: e.target.value as MutationType }))}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    {Object.entries(MUTATION_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Lingkup Perpindahan</label>
                  <select value={form.mutation_scope} onChange={(e) => setForm((f) => ({ ...f, mutation_scope: e.target.value as MutationScope }))}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    {Object.entries(MUTATION_SCOPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Tanggal Efektif *</label>
                <input type="date" value={form.effective_date} onChange={(e) => setForm((f) => ({ ...f, effective_date: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Tujuan Penempatan Baru
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Cabang / Wilayah</label>
                    <select value={form.to_branch_id} onChange={(e) => setForm((f) => ({ ...f, to_branch_id: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                      <option value="">— Pilih cabang —</option>
                      {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Departemen</label>
                    <select value={form.to_department} onChange={(e) => setForm((f) => ({ ...f, to_department: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                      <option value="">— Pilih departemen —</option>
                      {HRIS_DEPARTMENTS.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500">Jabatan Baru</label>
                    <input value={form.to_position} onChange={(e) => setForm((f) => ({ ...f, to_position: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="Contoh: Supervisor Operasional" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Alasan / Dasar Penugasan</label>
                <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  rows={3} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="Kebutuhan operasional, penugasan proyek, dll." />
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Pengajuan akan melalui tahap persetujuan: <strong>Manajer → HRD</strong>
                {['promotion', 'demotion'].includes(form.mutation_type) && ' → Direktur'}.
                Setelah disetujui, sistem menerbitkan E-Letter (SK Mutasi / Surat Penugasan).
              </div>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
                <Save className="w-4 h-4" /> {submitting ? 'Mengajukan...' : 'Ajukan Persetujuan'}
              </button>
            </div>
          </div>
        )}

        {/* DETAIL */}
        {activeTab === 'detail' && selected && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-indigo-600">{selected.mutation_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[selected.status]}`}>
                      {MUTATION_STATUS_LABELS[selected.status as keyof typeof MUTATION_STATUS_LABELS]}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-800 mt-1">{selected.employee_name}</h2>
                  <p className="text-sm text-gray-500">
                    {MUTATION_TYPE_LABELS[selected.mutation_type as MutationType]} • {MUTATION_SCOPE_LABELS[selected.mutation_scope as MutationScope] || '-'}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {selected.status === 'pending' && (
                    <>
                      <button onClick={() => { setApprovalAction('approve'); setShowApproval(true); }}
                        className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                        <CheckCircle className="w-4 h-4" /> Setujui
                      </button>
                      <button onClick={() => { setApprovalAction('reject'); setShowApproval(true); }}
                        className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                        <XCircle className="w-4 h-4" /> Tolak
                      </button>
                    </>
                  )}
                  {letterData && ['approved', 'executed'].includes(selected.status) && (
                    <DocumentExportButton
                      documentType="mutation-letter"
                      data={letterData}
                      meta={letterMeta}
                      label="Unduh E-Letter"
                      variant="button"
                      size="sm"
                    />
                  )}
                </div>
              </div>

              {/* From → To */}
              <div className="grid md:grid-cols-2 gap-4 mt-5">
                <div className="bg-gray-50 rounded-xl p-4 border">
                  <p className="text-xs font-semibold text-gray-500 mb-2">POSISI LAMA</p>
                  <p className="text-sm font-medium">{selected.from_position || '-'}</p>
                  <p className="text-xs text-gray-500 mt-1">{getDepartmentLabel(selected.from_department)} • {selected.from_branch_name || '-'}</p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                  <p className="text-xs font-semibold text-indigo-600 mb-2">POSISI BARU</p>
                  <p className="text-sm font-medium">{selected.to_position || '-'}</p>
                  <p className="text-xs text-gray-500 mt-1">{getDepartmentLabel(selected.to_department)} • {selected.to_branch_name || '-'}</p>
                  <p className="text-xs text-indigo-600 mt-2">Efektif: {fmtDate(selected.effective_date)}</p>
                </div>
              </div>
              {selected.reason && (
                <p className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                  <span className="font-medium">Alasan:</span> {selected.reason}
                </p>
              )}
            </div>

            {/* Approval timeline */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-indigo-600" /> Alur Persetujuan
                <span className="text-xs font-normal text-gray-400">
                  (Tahap {selected.current_approval_step || 1} / {selected.total_approval_steps || 1})
                </span>
              </h3>
              <div className="space-y-3">
                {(selected.approval_steps || []).map((step: any, idx: number) => (
                  <div key={step.id || idx} className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${STEP_COLORS[step.status] || 'bg-gray-300'}`} />
                    <div className="flex-1 border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-800">
                          Tahap {step.step_order}: {step.approver_title || step.approver_role}
                        </p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          step.status === 'approved' ? 'bg-green-100 text-green-700'
                          : step.status === 'rejected' ? 'bg-red-100 text-red-700'
                          : step.status === 'pending' ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-500'
                        }`}>{step.status}</span>
                      </div>
                      {step.approver_name && <p className="text-xs text-gray-500 mt-0.5">Oleh: {step.approver_name}</p>}
                      {step.comments && <p className="text-xs text-gray-600 mt-1 italic">"{step.comments}"</p>}
                      {step.acted_at && <p className="text-[10px] text-gray-400 mt-1">{fmtDate(step.acted_at)}</p>}
                    </div>
                  </div>
                ))}
                {(!selected.approval_steps || selected.approval_steps.length === 0) && (
                  <p className="text-sm text-gray-400 italic">Belum ada tahap persetujuan</p>
                )}
              </div>
            </div>

            {/* E-File info */}
            {selected.e_file_id && (
              <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
                <FileText className="w-8 h-8 text-indigo-500" />
                <div>
                  <p className="text-sm font-medium text-gray-800">E-File Terdaftar</p>
                  <p className="text-xs text-gray-500">Dokumen SK tersimpan di arsip karyawan (ID: {selected.e_file_id.slice(0, 8)}...)</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approval modal */}
      {showApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowApproval(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md m-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">{approvalAction === 'approve' ? 'Setujui Mutasi' : 'Tolak Mutasi'}</h3>
              <button onClick={() => setShowApproval(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <textarea value={approvalComments} onChange={(e) => setApprovalComments(e.target.value)}
              rows={3} className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder={approvalAction === 'reject' ? 'Alasan penolakan (wajib)...' : 'Catatan persetujuan (opsional)...'} />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowApproval(false)} className="flex-1 py-2 border rounded-lg text-sm">Batal</button>
              <button onClick={handleApproval}
                className={`flex-1 py-2 rounded-lg text-sm text-white ${approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {approvalAction === 'approve' ? 'Setujui' : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}
    </HQLayout>
  );
}
