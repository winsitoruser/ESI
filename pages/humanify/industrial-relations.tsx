import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '@/components/humanify/HumanifyLayout';
import { useTranslation } from '@/lib/i18n';
import { STATUS_LABELS, VIOLATION_TYPE_LABELS, getDocumentTypeForLetter, type ViolationType } from '@/lib/hris/disciplinary-workflow';
import { Shield, FileText, AlertTriangle, Users, CheckSquare, Plus, Edit, Trash2, Eye, Search, ChevronDown, X, Clock, AlertCircle, Download, ExternalLink, ArrowRight } from 'lucide-react';

interface Regulation { id: string; title: string; regulation_number: string; category: string; description: string; content: string; effective_date: string; expiry_date: string; status: string; version: number; tags: string[]; }
interface Warning {
  id: string;
  employee_id: string | number;
  employee_name?: string;
  employee_code?: string;
  position?: string;
  department?: string;
  warning_type: string;
  letter_number: string;
  reference_number?: string;
  issue_date: string;
  expiry_date: string;
  violation_type: string;
  violation_description: string;
  status: string;
  acknowledged: boolean;
  notes: string;
  source?: string;
}
interface IrCase { id: string; case_number: string; title: string; category: string; priority: string; status: string; reported_by: number; reported_date: string; description: string; involved_employees: any[]; resolution: string; }
interface Termination {
  id: string;
  employee_id: string | number;
  employee_name?: string;
  employee_code?: string;
  position?: string;
  department?: string;
  termination_type: string;
  letter_number?: string;
  reference_number?: string;
  reason: string;
  effective_date: string;
  status: string;
  severance_amount: number;
  notes?: string;
  source?: string;
}
interface Checklist { id: string; name: string; category: string; description: string; items: any[]; status: string; completion_percent: number; due_date: string; period: string; }

type TabKey = 'regulations' | 'warnings' | 'cases' | 'terminations' | 'compliance';

const MOCK_IR_OVERVIEW = { activeRegulations: 12, activeWarnings: 3, openCases: 2, pendingTerminations: 1, pendingChecklists: 4, complianceScore: 92 };

const MOCK_REGULATIONS: Regulation[] = [
  { id: 'reg1', title: 'Peraturan Perusahaan 2026', regulation_number: 'PP-2026-001', category: 'company_rule', description: 'Peraturan perusahaan tahun 2026', content: '', effective_date: '2026-01-01', expiry_date: '2028-12-31', status: 'active', version: 3, tags: ['umum', 'wajib'] },
  { id: 'reg2', title: 'SOP Keselamatan Kerja (K3)', regulation_number: 'SOP-K3-001', category: 'safety', description: 'Standard operating procedure K3', content: '', effective_date: '2025-06-01', expiry_date: '2027-05-31', status: 'active', version: 2, tags: ['k3', 'safety'] },
  { id: 'reg3', title: 'Kode Etik Karyawan', regulation_number: 'KE-2026-001', category: 'ethics', description: 'Kode etik dan perilaku karyawan', content: '', effective_date: '2026-01-01', expiry_date: '2028-12-31', status: 'active', version: 1, tags: ['etika'] },
];

const MOCK_WARNINGS: Warning[] = [
  { id: 'w1', employee_id: '15', employee_name: 'Contoh Karyawan', warning_type: 'SP1', letter_number: 'SP1/0003/HR/2026', issue_date: '2026-03-05', expiry_date: '2026-09-05', violation_type: 'discipline', violation_description: 'Terlambat masuk kerja lebih dari 5 kali dalam 1 bulan', status: 'issued', acknowledged: true, notes: '', source: 'disciplinary' },
  { id: 'w2', employee_id: '22', employee_name: 'Contoh Karyawan 2', warning_type: 'SP2', letter_number: 'SP2/0001/HR/2026', issue_date: '2026-02-20', expiry_date: '2026-08-20', violation_type: 'misconduct', violation_description: 'Tidak mengikuti SOP keamanan', status: 'issued', acknowledged: true, notes: '', source: 'disciplinary' },
];

const MOCK_IR_CASES: IrCase[] = [
  { id: 'c1', case_number: 'CASE-2026-005', title: 'Investigasi pelanggaran SOP gudang', category: 'misconduct', priority: 'high', status: 'investigating', reported_by: 3, reported_date: '2026-03-08', description: 'Dugaan pelanggaran prosedur penyimpanan bahan baku', involved_employees: [{ id: 18, name: 'Rudi Hartono' }], resolution: '' },
  { id: 'c2', case_number: 'CASE-2026-004', title: 'Keluhan lingkungan kerja', category: 'grievance', priority: 'medium', status: 'open', reported_by: 10, reported_date: '2026-03-05', description: 'Keluhan mengenai fasilitas kerja di cabang Bandung', involved_employees: [], resolution: '' },
];

const MOCK_TERMINATIONS: Termination[] = [
  { id: 't1', employee_id: '30', employee_name: 'Contoh Karyawan PHK', termination_type: 'resignation', letter_number: 'PHK/0001/HR/2026', reason: 'Pindah ke perusahaan lain', effective_date: '2026-04-01', status: 'pending_approval', severance_amount: 0, source: 'disciplinary' },
];

const MOCK_CHECKLISTS: Checklist[] = [
  { id: 'ch1', name: 'Audit Kepatuhan K3 Q1 2026', category: 'safety', description: 'Checklist audit K3 kuartal 1', items: [{ name: 'APAR tersedia', status: 'completed' }, { name: 'Jalur evakuasi jelas', status: 'completed' }, { name: 'P3K lengkap', status: 'pending' }], status: 'in_progress', completion_percent: 67, due_date: '2026-03-31', period: 'Q1 2026' },
  { id: 'ch2', name: 'Review Kontrak Karyawan', category: 'compliance', description: 'Review kontrak yang akan berakhir', items: [{ name: 'List kontrak expired', status: 'completed' }, { name: 'Evaluasi perpanjangan', status: 'pending' }], status: 'in_progress', completion_percent: 50, due_date: '2026-03-25', period: 'Maret 2026' },
];

export default function IndustrialRelationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('regulations');
  const [regulations, setRegulations] = useState<Regulation[]>(MOCK_REGULATIONS);
  const [warnings, setWarnings] = useState<Warning[]>(MOCK_WARNINGS);
  const [warningScope, setWarningScope] = useState<'all' | 'active' | 'pipeline'>('all');
  const [warningsSource, setWarningsSource] = useState<'disciplinary' | 'legacy' | 'mock'>('mock');
  const [terminationScope, setTerminationScope] = useState<'all' | 'active' | 'pipeline'>('all');
  const [terminationsSource, setTerminationsSource] = useState<'disciplinary' | 'legacy' | 'mock'>('mock');
  const [cases, setCases] = useState<IrCase[]>(MOCK_IR_CASES);
  const [terminations, setTerminations] = useState<Termination[]>(MOCK_TERMINATIONS);
  const [checklists, setChecklists] = useState<Checklist[]>(MOCK_CHECKLISTS);
  const [overview, setOverview] = useState<any>(MOCK_IR_OVERVIEW);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [search, setSearch] = useState('');

  const [regForm, setRegForm] = useState({ title: '', regulationNumber: '', category: 'company_rule', description: '', content: '', effectiveDate: '', status: 'draft' });
  const [caseForm, setCaseForm] = useState({ title: '', category: 'misconduct', priority: 'medium', reportedDate: '', description: '', involvedEmployees: [] as any[] });

  const showToast = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const api = useCallback(async (action: string, method = 'GET', body?: any, extra = '') => {
    const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`/api/humanify/industrial-relations?action=${action}${extra}`, opts);
    return r.json();
  }, []);

  const loadWarnings = useCallback(async (scope: 'all' | 'active' | 'pipeline' = warningScope) => {
    const warns = await api('warnings', 'GET', null, `&scope=${scope}`);
    setWarnings(warns.data || []);
    setWarningsSource((warns.meta?.source as any) || 'legacy');
  }, [api, warningScope]);

  const loadTerminations = useCallback(async (scope: 'all' | 'active' | 'pipeline' = terminationScope) => {
    const terms = await api('terminations', 'GET', null, `&scope=${scope}`);
    setTerminations(terms.data || []);
    setTerminationsSource((terms.meta?.source as any) || 'legacy');
  }, [api, terminationScope]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, regs, warns, cs, terms, cls] = await Promise.all([
        api('overview'), api('regulations'), api('warnings', 'GET', null, `&scope=${warningScope}`), api('cases'), api('terminations', 'GET', null, `&scope=${terminationScope}`), api('checklists')
      ]);
      setOverview(ov.data || {});
      setRegulations(regs.data || []);
      setWarnings(warns.data || []);
      setWarningsSource((warns.meta?.source as any) || ov.data?.warningsSource || 'legacy');
      setCases(cs.data || []);
      setTerminations(terms.data || []);
      setTerminationsSource((terms.meta?.source as any) || ov.data?.terminationsSource || 'legacy');
      setChecklists(cls.data || []);
    } catch (e) {
      console.error(e);
      setOverview(MOCK_IR_OVERVIEW);
      setRegulations(MOCK_REGULATIONS);
      setWarnings(MOCK_WARNINGS);
      setWarningsSource('mock');
      setCases(MOCK_IR_CASES);
      setTerminations(MOCK_TERMINATIONS);
      setTerminationsSource('mock');
      setChecklists(MOCK_CHECKLISTS);
    }
    setLoading(false);
  }, [api, warningScope, terminationScope]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (tab === 'warnings') loadWarnings(warningScope);
  }, [warningScope, tab, loadWarnings]);

  useEffect(() => {
    if (tab === 'terminations') loadTerminations(terminationScope);
  }, [terminationScope, tab, loadTerminations]);

  const openAdd = (type: string) => {
    if (type === 'warning') {
      router.push('/humanify/disciplinary-letters?view=create&type=SP1');
      return;
    }
    if (type === 'termination') {
      router.push('/humanify/disciplinary-letters?view=create&type=TERMINATION');
      return;
    }
    setEditingItem(null); setModalType(type); setShowModal(true);
    if (type === 'regulation') setRegForm({ title: '', regulationNumber: '', category: 'company_rule', description: '', content: '', effectiveDate: '', status: 'draft' });
    if (type === 'case') setCaseForm({ title: '', category: 'misconduct', priority: 'medium', reportedDate: new Date().toISOString().split('T')[0], description: '', involvedEmployees: [] });
  };

  const handleSave = async () => {
    try {
      if (modalType === 'regulation') {
        if (editingItem) await api('regulation', 'PUT', regForm, `&id=${editingItem.id}`);
        else await api('regulation', 'POST', regForm);
      } else if (modalType === 'case') {
        if (editingItem) await api('case', 'PUT', caseForm, `&id=${editingItem.id}`);
        else await api('case', 'POST', caseForm);
      }
      showToast(editingItem ? 'Berhasil diperbarui' : 'Berhasil dibuat');
      setShowModal(false); loadData();
    } catch (e) { showToast('Gagal menyimpan', 'error'); }
  };

  const handleDelete = async (action: string, id: string) => {
    if (!confirm('Hapus data ini?')) return;
    await api(action, 'DELETE', null, `&id=${id}`);
    showToast('Dihapus'); loadData();
  };

  const openTerminationPdf = async (t: Termination) => {
    try {
      const res = await fetch(`/api/humanify/disciplinary-letters?action=letter-data&id=${t.id}`);
      const json = await res.json();
      if (!json.success || !json.data?.letterData) {
        showToast('Data surat belum siap untuk unduh PDF', 'error');
        return;
      }
      const gen = await fetch('/api/hq/documents?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: getDocumentTypeForLetter('TERMINATION'),
          format: 'pdf',
          data: json.data.letterData,
          meta: json.data.meta,
          options: { includeHeader: false, includeFooter: false, includeSignature: false },
        }),
      });
      if (!gen.ok) throw new Error('Gagal generate PDF');
      const blob = await gen.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${t.letter_number || 'PHK'}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('PDF berhasil diunduh');
    } catch (e: any) {
      showToast(e.message || 'Gagal unduh PDF', 'error');
    }
  };

  const openWarningPdf = async (w: Warning) => {
    try {
      const res = await fetch(`/api/humanify/disciplinary-letters?action=letter-data&id=${w.id}`);
      const json = await res.json();
      if (!json.success || !json.data?.letterData) {
        showToast('Data surat belum siap untuk unduh PDF', 'error');
        return;
      }
      const gen = await fetch('/api/hq/documents?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: getDocumentTypeForLetter(w.warning_type as any),
          format: 'pdf',
          data: json.data.letterData,
          meta: json.data.meta,
          options: { includeHeader: false, includeFooter: false, includeSignature: false },
        }),
      });
      if (!gen.ok) throw new Error('Gagal generate PDF');
      const blob = await gen.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${w.letter_number || w.warning_type}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('PDF berhasil diunduh');
    } catch (e: any) {
      showToast(e.message || 'Gagal unduh PDF', 'error');
    }
  };

  const handleChecklistItem = async (checklistId: string, itemIndex: number, status: string) => {
    await api('update-checklist-item', 'POST', { id: checklistId, itemIndex, status });
    showToast('Item checklist diperbarui'); loadData();
  };

  const tabs: { key: TabKey; label: string; icon: any; count?: number }[] = [
    { key: 'regulations', label: 'Peraturan', icon: FileText, count: overview.activeRegulations },
    { key: 'warnings', label: 'Surat Peringatan', icon: AlertTriangle, count: overview.activeWarnings },
    { key: 'cases', label: 'Kasus & Investigasi', icon: Shield, count: overview.openCases },
    { key: 'terminations', label: 'PHK', icon: Users, count: overview.pendingTerminations },
    { key: 'compliance', label: 'Kepatuhan', icon: CheckSquare, count: overview.pendingChecklists },
  ];

  const statusColor = (s: string) => {
    const m: any = { active: 'bg-green-100 text-green-800', draft: 'bg-gray-100 text-gray-800', drafting: 'bg-gray-100 text-gray-800', expired: 'bg-red-100 text-red-800', revoked: 'bg-yellow-100 text-yellow-800',
      open: 'bg-blue-100 text-blue-800', investigating: 'bg-yellow-100 text-yellow-800', resolved: 'bg-green-100 text-green-800', closed: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800', pending_approval: 'bg-orange-100 text-orange-800', approved: 'bg-green-100 text-green-800', issued: 'bg-emerald-100 text-emerald-800',
      acknowledged: 'bg-teal-100 text-teal-800', completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800', cancelled: 'bg-gray-100 text-gray-500', in_progress: 'bg-blue-100 text-blue-800', overdue: 'bg-red-100 text-red-800', review: 'bg-indigo-100 text-indigo-800', submitted: 'bg-blue-100 text-blue-800'
    };
    return m[s] || 'bg-gray-100 text-gray-700';
  };

  const filteredWarnings = warnings.filter((w) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [w.letter_number, w.employee_name, w.employee_code, w.violation_description, w.warning_type]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const filteredTerminations = terminations.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [t.letter_number, t.employee_name, t.employee_code, t.reason, t.termination_type]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const terminationTypeLabel = (type: string) => {
    const m: Record<string, string> = {
      resignation: 'Pengunduran Diri',
      dismissal: 'Pemecatan',
      mutual: 'Kesepakatan Bersama',
      contract_end: 'Berakhir Kontrak',
      retirement: 'Pensiun',
      restructuring: 'Restrukturisasi',
      PHK: 'PHK',
    };
    return m[type] || type;
  };

  const warningStatusLabel = (s: string) =>
    (STATUS_LABELS as Record<string, string>)[s] || s;

  const priorityColor = (p: string) => {
    const m: any = { low: 'bg-gray-100 text-gray-700', medium: 'bg-blue-100 text-blue-700', high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700' };
    return m[p] || 'bg-gray-100 text-gray-700';
  };

  return (
    <HQLayout title={t('hris.industrialRelationsTitle')}>
    <div className="p-6 max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.msg}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hubungan Industrial & Kepatuhan Hukum</h1>
        <p className="text-gray-500 mt-1">Manajemen hubungan industrial, peraturan perusahaan, dan kepatuhan hukum</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {tabs.map(t => (
          <div key={t.key} onClick={() => setTab(t.key)} className={`p-4 rounded-xl border cursor-pointer transition-all ${tab === t.key ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300'}`}>
            <div className="flex items-center gap-2 mb-1">
              <t.icon className="w-4 h-4 text-indigo-600" />
              <span className="text-xs text-gray-500">{t.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{t.count || 0}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-10 text-gray-400">Memuat...</div>}

      {/* REGULATIONS TAB */}
      {!loading && tab === 'regulations' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari peraturan..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64" />
            </div>
            <button onClick={() => openAdd('regulation')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              <Plus className="w-4 h-4" /> Tambah Peraturan
            </button>
          </div>
          <div className="space-y-3">
            {regulations.filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase())).map(reg => (
              <div key={reg.id} className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{reg.regulation_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(reg.status)}`}>{reg.status}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{reg.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{reg.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>Kategori: {reg.category}</span>
                      {reg.effective_date && <span>Berlaku: {new Date(reg.effective_date).toLocaleDateString('id-ID')}</span>}
                      <span>Versi: {reg.version}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingItem(reg); setRegForm({ title: reg.title, regulationNumber: reg.regulation_number, category: reg.category, description: reg.description || '', content: reg.content || '', effectiveDate: reg.effective_date || '', status: reg.status }); setModalType('regulation'); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete('regulation', reg.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {regulations.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada peraturan</p>}
          </div>
        </div>
      )}

      {/* WARNINGS TAB — integrated with /humanify/disciplinary-letters */}
      {!loading && tab === 'warnings' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-orange-200 bg-orange-50/80 px-4 py-3 flex flex-wrap items-start gap-3 justify-between">
            <div className="flex gap-2 text-sm text-orange-950 max-w-2xl">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-600" />
              <div>
                <p className="font-semibold">Terintegrasi dengan Surat Disiplin & SOP</p>
                <p className="text-orange-800/80 mt-0.5">
                  Register SP di bawah ini mengambil data dari workflow disiplin (draft → approval → penerbitan).
                  Buat, edit draft, approval, dan unduh PDF resmi melalui modul Surat Disiplin.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/humanify/disciplinary-letters')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-800 hover:text-orange-950 px-3 py-1.5 rounded-lg border border-orange-300 bg-white"
            >
              Buka modul lengkap <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold">Surat Peringatan (SP)</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Sumber: {warningsSource === 'disciplinary' ? 'Surat Disiplin (hr_disciplinary_letters)' : warningsSource === 'legacy' ? 'Legacy warning_letters' : 'Demo'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-lg border overflow-hidden text-xs">
                {([
                  ['all', 'Semua'],
                  ['active', 'Aktif / Terbit'],
                  ['pipeline', 'Dalam proses'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setWarningScope(key)}
                    className={`px-3 py-2 font-medium ${warningScope === key ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => openAdd('warning')}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700"
              >
                <Plus className="w-4 h-4" /> Proses / Buat SP
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">No. Surat</th>
                  <th className="px-4 py-3 text-left">Karyawan</th>
                  <th className="px-4 py-3 text-left">Tipe</th>
                  <th className="px-4 py-3 text-left">Pelanggaran</th>
                  <th className="px-4 py-3 text-left">Tanggal</th>
                  <th className="px-4 py-3 text-left">Berlaku s/d</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredWarnings.map(w => {
                  const canExport = ['issued', 'acknowledged', 'approved', 'active'].includes(w.status);
                  const violationLabel = VIOLATION_TYPE_LABELS[w.violation_type as ViolationType] || w.violation_type;
                  return (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{w.letter_number || w.reference_number || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{w.employee_name || `Karyawan #${w.employee_id}`}</div>
                        {w.employee_code && <div className="text-[11px] text-gray-400">{w.employee_code}{w.position ? ` · ${w.position}` : ''}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${w.warning_type === 'SP3' ? 'bg-red-100 text-red-700' : w.warning_type === 'SP2' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {w.warning_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-[11px] text-gray-500">{violationLabel}</div>
                        <div className="truncate text-gray-800">{w.violation_description}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">{w.issue_date ? new Date(w.issue_date).toLocaleDateString('id-ID') : '—'}</td>
                      <td className="px-4 py-3 text-xs">{w.expiry_date ? new Date(w.expiry_date).toLocaleDateString('id-ID') : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(w.status)}`}>{warningStatusLabel(w.status)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Buka di Surat Disiplin"
                            onClick={() => router.push(`/humanify/disciplinary-letters?id=${w.id}`)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canExport && (
                            <button
                              type="button"
                              title="Unduh PDF"
                              onClick={() => openWarningPdf(w)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Kelola proses"
                            onClick={() => router.push(`/humanify/disciplinary-letters?id=${w.id}`)}
                            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-medium text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg"
                          >
                            Kelola <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredWarnings.length === 0 && (
              <div className="text-center text-gray-400 py-10 px-4">
                <p>Belum ada surat peringatan{warningScope !== 'all' ? ` (filter: ${warningScope})` : ''}.</p>
                <button
                  type="button"
                  onClick={() => openAdd('warning')}
                  className="mt-3 text-sm text-orange-600 font-medium hover:text-orange-800"
                >
                  Mulai proses SP di Surat Disiplin →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CASES TAB */}
      {!loading && tab === 'cases' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Kasus & Investigasi</h2>
            <button onClick={() => openAdd('case')} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
              <Plus className="w-4 h-4" /> Buat Kasus
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {cases.map(c => (
              <div key={c.id} className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-mono text-gray-500">{c.case_number}</span>
                    <h3 className="font-semibold text-gray-900">{c.title}</h3>
                  </div>
                  <div className="flex gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor(c.priority)}`}>{c.priority}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(c.status)}`}>{c.status}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">{c.description}</p>
                <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                  <span>Kategori: {c.category}</span>
                  <span>Dilaporkan: {c.reported_date && new Date(c.reported_date).toLocaleDateString('id-ID')}</span>
                </div>
                <div className="flex gap-1 mt-2">
                  <button onClick={() => { setEditingItem(c); setCaseForm({ title: c.title, category: c.category, priority: c.priority, reportedDate: c.reported_date, description: c.description || '', involvedEmployees: c.involved_employees || [] }); setModalType('case'); setShowModal(true); }} className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">Edit</button>
                  <button onClick={() => handleDelete('case', c.id)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">Hapus</button>
                </div>
              </div>
            ))}
            {cases.length === 0 && <p className="text-center text-gray-400 py-8 col-span-2">Tidak ada kasus terbuka</p>}
          </div>
        </div>
      )}

      {/* TERMINATIONS TAB — integrated with /humanify/disciplinary-letters */}
      {!loading && tab === 'terminations' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-300 bg-gray-50/80 px-4 py-3 flex flex-wrap items-start gap-3 justify-between">
            <div className="flex gap-2 text-sm text-gray-950 max-w-2xl">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-600" />
              <div>
                <p className="font-semibold">Terintegrasi dengan Surat Disiplin & SOP</p>
                <p className="text-gray-700/80 mt-0.5">
                  Pengajuan PHK dan surat pemutusan hubungan kerja dikelola melalui workflow disiplin
                  (draft → approval → penerbitan). Clearance, pesangon, dan dokumen resmi di modul Surat Disiplin.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/humanify/disciplinary-letters')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-800 hover:text-gray-950 px-3 py-1.5 rounded-lg border border-gray-300 bg-white"
            >
              Buka modul lengkap <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold">PHK / Pemutusan Hubungan Kerja</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Sumber: {terminationsSource === 'disciplinary' ? 'Surat Disiplin (hr_disciplinary_letters)' : terminationsSource === 'legacy' ? 'Legacy termination_requests' : 'Demo'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-lg border overflow-hidden text-xs">
                {([
                  ['all', 'Semua'],
                  ['active', 'Terbit / Selesai'],
                  ['pipeline', 'Dalam proses'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTerminationScope(key)}
                    className={`px-3 py-2 font-medium ${terminationScope === key ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => openAdd('termination')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900"
              >
                <Plus className="w-4 h-4" /> Ajukan PHK
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">No. Surat</th>
                  <th className="px-4 py-3 text-left">Karyawan</th>
                  <th className="px-4 py-3 text-left">Tipe PHK</th>
                  <th className="px-4 py-3 text-left">Alasan</th>
                  <th className="px-4 py-3 text-left">Tgl Efektif</th>
                  <th className="px-4 py-3 text-left">Pesangon</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTerminations.map(t => {
                  const canExport = ['issued', 'acknowledged', 'approved', 'active'].includes(t.status);
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{t.letter_number || t.reference_number || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{t.employee_name || `Karyawan #${t.employee_id}`}</div>
                        {t.employee_code && <div className="text-[11px] text-gray-400">{t.employee_code}{t.position ? ` · ${t.position}` : ''}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{terminationTypeLabel(t.termination_type)}</span>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-gray-800">{t.reason || '—'}</td>
                      <td className="px-4 py-3 text-xs">{t.effective_date ? new Date(t.effective_date).toLocaleDateString('id-ID') : '—'}</td>
                      <td className="px-4 py-3 text-xs">
                        {t.severance_amount > 0 ? `Rp ${Number(t.severance_amount).toLocaleString('id-ID')}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{warningStatusLabel(t.status)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Buka di Surat Disiplin"
                            onClick={() => router.push(`/humanify/disciplinary-letters?id=${t.id}`)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canExport && (
                            <button
                              type="button"
                              title="Unduh PDF"
                              onClick={() => openTerminationPdf(t)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Kelola proses"
                            onClick={() => router.push(`/humanify/disciplinary-letters?id=${t.id}`)}
                            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-medium text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg"
                          >
                            Kelola <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredTerminations.length === 0 && (
              <div className="text-center text-gray-400 py-10 px-4">
                <p>Belum ada pengajuan PHK{terminationScope !== 'all' ? ` (filter: ${terminationScope})` : ''}.</p>
                <button
                  type="button"
                  onClick={() => openAdd('termination')}
                  className="mt-3 text-sm text-gray-700 font-medium hover:text-gray-900"
                >
                  Mulai proses PHK di Surat Disiplin →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMPLIANCE TAB */}
      {!loading && tab === 'compliance' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Pemantauan Kepatuhan</h2>
          </div>
          <div className="space-y-4">
            {checklists.map(cl => (
              <div key={cl.id} className="bg-white border rounded-xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(cl.status)}`}>{cl.status}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{cl.category}</span>
                      <span className="text-xs text-gray-400">{cl.period}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{cl.name}</h3>
                    <p className="text-sm text-gray-500">{cl.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-600">{Number(cl.completion_percent || 0).toFixed(0)}%</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${cl.completion_percent || 0}%` }} />
                </div>
                {/* Checklist items */}
                <div className="space-y-2">
                  {(cl.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <button
                        onClick={() => handleChecklistItem(cl.id, idx, item.status === 'completed' ? 'pending' : 'completed')}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${item.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-indigo-400'}`}
                      >
                        {item.status === 'completed' && '✓'}
                      </button>
                      <span className={item.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700'}>{item.item}</span>
                      {item.required && <span className="text-xs text-red-500">*wajib</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {checklists.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada checklist kepatuhan</p>}
          </div>
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-semibold">{editingItem ? 'Edit' : 'Tambah'} {modalType === 'regulation' ? 'Peraturan' : 'Kasus'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {modalType === 'regulation' && (<>
                <div><label className="text-sm font-medium text-gray-700">Judul</label><input value={regForm.title} onChange={e => setRegForm({ ...regForm, title: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Nomor Peraturan</label><input value={regForm.regulationNumber} onChange={e => setRegForm({ ...regForm, regulationNumber: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Kategori</label>
                  <select value={regForm.category} onChange={e => setRegForm({ ...regForm, category: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="company_rule">Peraturan Perusahaan</option><option value="ethics">Kode Etik</option><option value="safety">K3</option><option value="compliance">Kepatuhan</option><option value="labor_law">UU Ketenagakerjaan</option>
                  </select>
                </div>
                <div><label className="text-sm font-medium text-gray-700">Deskripsi</label><textarea value={regForm.description} onChange={e => setRegForm({ ...regForm, description: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" rows={3} /></div>
                <div><label className="text-sm font-medium text-gray-700">Tanggal Berlaku</label><input type="date" value={regForm.effectiveDate} onChange={e => setRegForm({ ...regForm, effectiveDate: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Status</label>
                  <select value={regForm.status} onChange={e => setRegForm({ ...regForm, status: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="draft">Draf</option><option value="active">Aktif</option><option value="expired">Kedaluwarsa</option><option value="revised">Direvisi</option>
                  </select>
                </div>
              </>)}
              {modalType === 'case' && (<>
                <div><label className="text-sm font-medium text-gray-700">Judul Kasus</label><input value={caseForm.title} onChange={e => setCaseForm({ ...caseForm, title: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Kategori</label>
                    <select value={caseForm.category} onChange={e => setCaseForm({ ...caseForm, category: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                      <option value="misconduct">Pelanggaran</option><option value="harassment">Pelecehan</option><option value="discrimination">Diskriminasi</option><option value="safety">K3</option><option value="grievance">Keluhan</option><option value="dispute">Perselisihan</option>
                    </select>
                  </div>
                  <div><label className="text-sm font-medium text-gray-700">Prioritas</label>
                    <select value={caseForm.priority} onChange={e => setCaseForm({ ...caseForm, priority: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                      <option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Tinggi</option><option value="critical">Kritis</option>
                    </select>
                  </div>
                </div>
                <div><label className="text-sm font-medium text-gray-700">Tanggal Laporan</label><input type="date" value={caseForm.reportedDate} onChange={e => setCaseForm({ ...caseForm, reportedDate: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Deskripsi</label><textarea value={caseForm.description} onChange={e => setCaseForm({ ...caseForm, description: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" rows={4} /></div>
              </>)}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50">Batal</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </HQLayout>
  );
}
