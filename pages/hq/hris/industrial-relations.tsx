import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import DocumentExportButton from '@/components/documents/DocumentExportButton';
import { Shield, FileText, AlertTriangle, Users, CheckSquare, Plus, Edit, Trash2, Eye, Search, ChevronDown, X, Clock, AlertCircle, Download } from 'lucide-react';

interface Regulation { id: string; title: string; regulation_number: string; category: string; description: string; content: string; effective_date: string; expiry_date: string; status: string; version: number; tags: string[]; }
interface Warning { id: string; employee_id: number; warning_type: string; letter_number: string; issue_date: string; expiry_date: string; violation_type: string; violation_description: string; status: string; acknowledged: boolean; notes: string; }
interface IrCase { id: string; case_number: string; title: string; category: string; priority: string; status: string; reported_by: number; reported_date: string; description: string; involved_employees: any[]; resolution: string; }
interface Termination { id: string; employee_id: number; termination_type: string; reason: string; effective_date: string; status: string; clearance_status: any; exit_interview_done: boolean; severance_amount: number; }
interface Checklist { id: string; name: string; category: string; description: string; items: any[]; status: string; completion_percent: number; due_date: string; period: string; }

type TabKey = 'regulations' | 'warnings' | 'cases' | 'terminations' | 'compliance';

const MOCK_IR_OVERVIEW = { activeRegulations: 12, activeWarnings: 3, openCases: 2, pendingTerminations: 1, pendingChecklists: 4, complianceScore: 92 };

const MOCK_REGULATIONS: Regulation[] = [
  { id: 'reg1', title: 'Peraturan Perusahaan 2026', regulation_number: 'PP-2026-001', category: 'company_rule', description: 'Peraturan perusahaan tahun 2026', content: '', effective_date: '2026-01-01', expiry_date: '2028-12-31', status: 'active', version: 3, tags: ['umum', 'wajib'] },
  { id: 'reg2', title: 'SOP Keselamatan Kerja (K3)', regulation_number: 'SOP-K3-001', category: 'safety', description: 'Standard operating procedure K3', content: '', effective_date: '2025-06-01', expiry_date: '2027-05-31', status: 'active', version: 2, tags: ['k3', 'safety'] },
  { id: 'reg3', title: 'Kode Etik Karyawan', regulation_number: 'KE-2026-001', category: 'ethics', description: 'Kode etik dan perilaku karyawan', content: '', effective_date: '2026-01-01', expiry_date: '2028-12-31', status: 'active', version: 1, tags: ['etika'] },
];

const MOCK_WARNINGS: Warning[] = [
  { id: 'w1', employee_id: 15, warning_type: 'SP1', letter_number: 'SP1-2026-003', issue_date: '2026-03-05', expiry_date: '2026-09-05', violation_type: 'discipline', violation_description: 'Terlambat masuk kerja lebih dari 5 kali dalam 1 bulan', status: 'active', acknowledged: true, notes: '' },
  { id: 'w2', employee_id: 22, warning_type: 'SP2', letter_number: 'SP2-2026-001', issue_date: '2026-02-20', expiry_date: '2026-08-20', violation_type: 'misconduct', violation_description: 'Tidak mengikuti SOP keamanan', status: 'active', acknowledged: true, notes: '' },
];

const MOCK_IR_CASES: IrCase[] = [
  { id: 'c1', case_number: 'CASE-2026-005', title: 'Investigasi pelanggaran SOP gudang', category: 'misconduct', priority: 'high', status: 'investigating', reported_by: 3, reported_date: '2026-03-08', description: 'Dugaan pelanggaran prosedur penyimpanan bahan baku', involved_employees: [{ id: 18, name: 'Rudi Hartono' }], resolution: '' },
  { id: 'c2', case_number: 'CASE-2026-004', title: 'Keluhan lingkungan kerja', category: 'grievance', priority: 'medium', status: 'open', reported_by: 10, reported_date: '2026-03-05', description: 'Keluhan mengenai fasilitas kerja di cabang Bandung', involved_employees: [], resolution: '' },
];

const MOCK_TERMINATIONS: Termination[] = [
  { id: 't1', employee_id: 30, termination_type: 'resignation', reason: 'Pindah ke perusahaan lain', effective_date: '2026-04-01', status: 'pending_approval', clearance_status: { it: false, finance: false, hr: true, asset: false }, exit_interview_done: false, severance_amount: 0 },
];

const MOCK_CHECKLISTS: Checklist[] = [
  { id: 'ch1', name: 'Audit Kepatuhan K3 Q1 2026', category: 'safety', description: 'Checklist audit K3 kuartal 1', items: [{ name: 'APAR tersedia', status: 'completed' }, { name: 'Jalur evakuasi jelas', status: 'completed' }, { name: 'P3K lengkap', status: 'pending' }], status: 'in_progress', completion_percent: 67, due_date: '2026-03-31', period: 'Q1 2026' },
  { id: 'ch2', name: 'Review Kontrak Karyawan', category: 'compliance', description: 'Review kontrak yang akan berakhir', items: [{ name: 'List kontrak expired', status: 'completed' }, { name: 'Evaluasi perpanjangan', status: 'pending' }], status: 'in_progress', completion_percent: 50, due_date: '2026-03-25', period: 'Maret 2026' },
];

export default function IndustrialRelationsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('regulations');
  const [regulations, setRegulations] = useState<Regulation[]>(MOCK_REGULATIONS);
  const [warnings, setWarnings] = useState<Warning[]>(MOCK_WARNINGS);
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
  const [warnForm, setWarnForm] = useState({ employeeId: '', warningType: 'SP1', issueDate: '', violationType: 'discipline', violationDescription: '', notes: '' });
  const [caseForm, setCaseForm] = useState({ title: '', category: 'misconduct', priority: 'medium', reportedDate: '', description: '', involvedEmployees: [] as any[] });
  const [termForm, setTermForm] = useState({ employeeId: '', terminationType: 'resignation', reason: '', effectiveDate: '', noticePeriodDays: 30 });

  const showToast = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const api = useCallback(async (action: string, method = 'GET', body?: any, extra = '') => {
    const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`/api/hq/hris/industrial-relations?action=${action}${extra}`, opts);
    return r.json();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, regs, warns, cs, terms, cls] = await Promise.all([
        api('overview'), api('regulations'), api('warnings'), api('cases'), api('terminations'), api('checklists')
      ]);
      setOverview(ov.data || {});
      setRegulations(regs.data || []);
      setWarnings(warns.data || []);
      setCases(cs.data || []);
      setTerminations(terms.data || []);
      setChecklists(cls.data || []);
    } catch (e) {
      console.error(e);
      setOverview(MOCK_IR_OVERVIEW);
      setRegulations(MOCK_REGULATIONS);
      setWarnings(MOCK_WARNINGS);
      setCases(MOCK_IR_CASES);
      setTerminations(MOCK_TERMINATIONS);
      setChecklists(MOCK_CHECKLISTS);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = (type: string) => {
    setEditingItem(null); setModalType(type); setShowModal(true);
    if (type === 'regulation') setRegForm({ title: '', regulationNumber: '', category: 'company_rule', description: '', content: '', effectiveDate: '', status: 'draft' });
    if (type === 'warning') setWarnForm({ employeeId: '', warningType: 'SP1', issueDate: new Date().toISOString().split('T')[0], violationType: 'discipline', violationDescription: '', notes: '' });
    if (type === 'case') setCaseForm({ title: '', category: 'misconduct', priority: 'medium', reportedDate: new Date().toISOString().split('T')[0], description: '', involvedEmployees: [] });
    if (type === 'termination') setTermForm({ employeeId: '', terminationType: 'resignation', reason: '', effectiveDate: '', noticePeriodDays: 30 });
  };

  const handleSave = async () => {
    try {
      if (modalType === 'regulation') {
        if (editingItem) await api('regulation', 'PUT', regForm, `&id=${editingItem.id}`);
        else await api('regulation', 'POST', regForm);
      } else if (modalType === 'warning') {
        if (editingItem) await api('warning', 'PUT', warnForm, `&id=${editingItem.id}`);
        else await api('warning', 'POST', warnForm);
      } else if (modalType === 'case') {
        if (editingItem) await api('case', 'PUT', caseForm, `&id=${editingItem.id}`);
        else await api('case', 'POST', caseForm);
      } else if (modalType === 'termination') {
        if (editingItem) await api('termination', 'PUT', termForm, `&id=${editingItem.id}`);
        else await api('termination', 'POST', termForm);
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
    const m: any = { active: 'bg-green-100 text-green-800', draft: 'bg-gray-100 text-gray-800', expired: 'bg-red-100 text-red-800', revoked: 'bg-yellow-100 text-yellow-800',
      open: 'bg-blue-100 text-blue-800', investigating: 'bg-yellow-100 text-yellow-800', resolved: 'bg-green-100 text-green-800', closed: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800', pending_approval: 'bg-orange-100 text-orange-800', approved: 'bg-green-100 text-green-800', completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800', in_progress: 'bg-blue-100 text-blue-800', overdue: 'bg-red-100 text-red-800'
    };
    return m[s] || 'bg-gray-100 text-gray-800';
  };

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

      {/* WARNINGS TAB */}
      {!loading && tab === 'warnings' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Surat Peringatan (SP)</h2>
            <button onClick={() => openAdd('warning')} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700">
              <Plus className="w-4 h-4" /> Terbitkan SP
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">No. Surat</th>
                  <th className="px-4 py-3 text-left">Karyawan ID</th>
                  <th className="px-4 py-3 text-left">Tipe</th>
                  <th className="px-4 py-3 text-left">Pelanggaran</th>
                  <th className="px-4 py-3 text-left">Tanggal</th>
                  <th className="px-4 py-3 text-left">Berlaku s/d</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {warnings.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{w.letter_number}</td>
                    <td className="px-4 py-3">{w.employee_id}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${w.warning_type === 'SP3' ? 'bg-red-100 text-red-700' : w.warning_type === 'SP2' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>{w.warning_type}</span></td>
                    <td className="px-4 py-3 max-w-xs truncate">{w.violation_description}</td>
                    <td className="px-4 py-3 text-xs">{w.issue_date && new Date(w.issue_date).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3 text-xs">{w.expiry_date && new Date(w.expiry_date).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(w.status)}`}>{w.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <DocumentExportButton
                          documentType="warning-letter"
                          variant="icon"
                          data={{
                            employeeId: w.employee_id,
                            employeeName: `Karyawan #${w.employee_id}`,
                            warningType: w.warning_type,
                            violationType: w.violation_type,
                            violationDescription: w.violation_description,
                            expiryDate: w.expiry_date,
                            notes: w.notes,
                          }}
                          meta={{
                            documentNumber: w.letter_number,
                            documentDate: w.issue_date,
                          }}
                          options={{
                            includeSignature: true,
                            signatureFields: [
                              { label: 'Manajer HRD', position: 'Mengetahui' },
                              { label: 'Yang Bersangkutan', position: 'Karyawan' },
                            ],
                          }}
                          showFormats={['pdf', 'html']}
                        />
                        <button onClick={() => handleDelete('warning', w.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {warnings.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada surat peringatan</p>}
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

      {/* TERMINATIONS TAB */}
      {!loading && tab === 'terminations' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Workflow PHK / Pemutusan Hubungan Kerja</h2>
            <button onClick={() => openAdd('termination')} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900">
              <Plus className="w-4 h-4" /> Ajukan PHK
            </button>
          </div>
          <div className="space-y-3">
            {terminations.map(t => (
              <div key={t.id} className="bg-white border rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{t.termination_type}</span>
                    </div>
                    <p className="font-medium">Karyawan #{t.employee_id}</p>
                    <p className="text-sm text-gray-500 mt-1">{t.reason}</p>
                    {t.effective_date && <p className="text-xs text-gray-400 mt-1">Efektif: {new Date(t.effective_date).toLocaleDateString('id-ID')}</p>}
                  </div>
                  <div className="text-right flex items-start gap-2">
                    <div>
                      {t.severance_amount > 0 && <p className="text-sm font-medium">Pesangon: Rp {Number(t.severance_amount).toLocaleString('id-ID')}</p>}
                    </div>
                    <DocumentExportButton
                      documentType="termination-letter"
                      variant="icon"
                      data={{
                        employeeId: t.employee_id,
                        employeeName: `Karyawan #${t.employee_id}`,
                        terminationType: t.termination_type,
                        reason: t.reason,
                        effectiveDate: t.effective_date,
                        severanceAmount: t.severance_amount,
                        clearanceStatus: t.clearance_status,
                      }}
                      meta={{ documentNumber: `PHK-${t.id?.substring(0,8)}`, documentDate: t.effective_date || new Date().toISOString().split('T')[0] }}
                      options={{
                        includeSignature: true,
                        signatureFields: [
                          { label: 'Direktur', position: 'Perusahaan' },
                          { label: 'Manajer HRD', position: 'Mengetahui' },
                          { label: 'Karyawan', position: 'Yang Bersangkutan' },
                        ],
                      }}
                      showFormats={['pdf']}
                    />
                  </div>
                </div>
                {/* Clearance Status */}
                {t.clearance_status && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {Object.entries(t.clearance_status).map(([k, v]) => (
                      <span key={k} className={`text-xs px-2 py-1 rounded ${v ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {k.toUpperCase()} {v ? '✓' : '○'}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-1 mt-3">
                  {t.status === 'pending_approval' && (
                    <button onClick={async () => { await api('approve-termination', 'POST', { id: t.id }); showToast('PHK disetujui'); loadData(); }} className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Setujui</button>
                  )}
                  <button onClick={() => handleDelete('termination', t.id)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">Hapus</button>
                </div>
              </div>
            ))}
            {terminations.length === 0 && <p className="text-center text-gray-400 py-8">Tidak ada pengajuan PHK</p>}
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
              <h3 className="text-lg font-semibold">{editingItem ? 'Edit' : 'Tambah'} {modalType === 'regulation' ? 'Peraturan' : modalType === 'warning' ? 'Surat Peringatan' : modalType === 'case' ? 'Kasus' : 'PHK'}</h3>
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
              {modalType === 'warning' && (<>
                <div><label className="text-sm font-medium text-gray-700">ID Karyawan</label><input type="number" value={warnForm.employeeId} onChange={e => setWarnForm({ ...warnForm, employeeId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Tipe SP</label>
                  <select value={warnForm.warningType} onChange={e => setWarnForm({ ...warnForm, warningType: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="SP1">SP1 - Peringatan Pertama</option><option value="SP2">SP2 - Peringatan Kedua</option><option value="SP3">SP3 - Peringatan Ketiga</option>
                  </select>
                </div>
                <div><label className="text-sm font-medium text-gray-700">Tanggal</label><input type="date" value={warnForm.issueDate} onChange={e => setWarnForm({ ...warnForm, issueDate: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Jenis Pelanggaran</label>
                  <select value={warnForm.violationType} onChange={e => setWarnForm({ ...warnForm, violationType: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="discipline">Disiplin</option><option value="performance">Performa</option><option value="attendance">Kehadiran</option><option value="misconduct">Pelanggaran</option><option value="other">Lainnya</option>
                  </select>
                </div>
                <div><label className="text-sm font-medium text-gray-700">Deskripsi Pelanggaran</label><textarea value={warnForm.violationDescription} onChange={e => setWarnForm({ ...warnForm, violationDescription: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" rows={3} /></div>
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
              {modalType === 'termination' && (<>
                <div><label className="text-sm font-medium text-gray-700">ID Karyawan</label><input type="number" value={termForm.employeeId} onChange={e => setTermForm({ ...termForm, employeeId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Tipe PHK</label>
                  <select value={termForm.terminationType} onChange={e => setTermForm({ ...termForm, terminationType: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="resignation">Pengunduran Diri</option><option value="dismissal">Pemecatan</option><option value="mutual">Kesepakatan Bersama</option><option value="contract_end">Berakhir Kontrak</option><option value="retirement">Pensiun</option><option value="restructuring">Restrukturisasi</option>
                  </select>
                </div>
                <div><label className="text-sm font-medium text-gray-700">Alasan</label><textarea value={termForm.reason} onChange={e => setTermForm({ ...termForm, reason: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" rows={3} /></div>
                <div><label className="text-sm font-medium text-gray-700">Tanggal Efektif</label><input type="date" value={termForm.effectiveDate} onChange={e => setTermForm({ ...termForm, effectiveDate: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Masa Pemberitahuan (hari)</label><input type="number" value={termForm.noticePeriodDays} onChange={e => setTermForm({ ...termForm, noticePeriodDays: parseInt(e.target.value) || 30 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
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
