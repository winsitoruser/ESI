import { useState, useEffect } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import {
  Building2, Network, Award, Plus, Edit, Trash2, X, Save,
  ChevronRight, ChevronDown, Users, Briefcase, Search,
  BarChart3, Layers, Shield, DollarSign
} from 'lucide-react';

type MainTab = 'org-structure' | 'job-grades' | 'summary';

const MOCK_ORG_TREE = [
  { id: 'org1', name: 'Bedagang Group', type: 'company', level: 0, head: 'Ahmad Wijaya', headTitle: 'CEO', employeeCount: 162, children: [
    { id: 'org2', name: 'Operasional', type: 'division', level: 1, head: 'Siti Rahayu', headTitle: 'COO', employeeCount: 85, children: [
      { id: 'org3', name: 'Cabang Bandung', type: 'branch', level: 2, head: 'Siti Rahayu', headTitle: 'Branch Manager', employeeCount: 24, children: [] },
      { id: 'org4', name: 'Cabang Surabaya', type: 'branch', level: 2, head: 'Budi Santoso', headTitle: 'Branch Manager', employeeCount: 22, children: [] },
      { id: 'org5', name: 'Cabang Bali', type: 'branch', level: 2, head: 'Made Wirawan', headTitle: 'Branch Manager', employeeCount: 18, children: [] },
      { id: 'org6', name: 'Cabang Medan', type: 'branch', level: 2, head: 'Dewi Lestari', headTitle: 'Branch Manager', employeeCount: 20, children: [] },
    ]},
    { id: 'org7', name: 'Keuangan', type: 'department', level: 1, head: 'Lisa Permata', headTitle: 'Finance Manager', employeeCount: 12, children: [] },
    { id: 'org8', name: 'Warehouse & Logistik', type: 'department', level: 1, head: 'Eko Prasetyo', headTitle: 'Warehouse Supervisor', employeeCount: 28, children: [] },
    { id: 'org9', name: 'IT', type: 'department', level: 1, head: 'Rizki Firmansyah', headTitle: 'IT Manager', employeeCount: 8, children: [] },
    { id: 'org10', name: 'HR & Admin', type: 'department', level: 1, head: 'Nurul Hidayah', headTitle: 'HR Manager', employeeCount: 10, children: [] },
  ]},
];

const MOCK_ORG_FLAT = [
  { id: 'org1', name: 'Bedagang Group', type: 'company', parentId: null },
  { id: 'org2', name: 'Operasional', type: 'division', parentId: 'org1' },
  { id: 'org3', name: 'Cabang Bandung', type: 'branch', parentId: 'org2' },
  { id: 'org4', name: 'Cabang Surabaya', type: 'branch', parentId: 'org2' },
  { id: 'org5', name: 'Cabang Bali', type: 'branch', parentId: 'org2' },
  { id: 'org6', name: 'Cabang Medan', type: 'branch', parentId: 'org2' },
  { id: 'org7', name: 'Keuangan', type: 'department', parentId: 'org1' },
  { id: 'org8', name: 'Warehouse & Logistik', type: 'department', parentId: 'org1' },
  { id: 'org9', name: 'IT', type: 'department', parentId: 'org1' },
  { id: 'org10', name: 'HR & Admin', type: 'department', parentId: 'org1' },
];

const MOCK_JOB_GRADES = [
  { id: 'jg1', code: 'E1', name: 'Eksekutif', level: 1, salary_min: 20000000, salary_max: 50000000, description: 'C-Level & Direktur', employee_count: 5 },
  { id: 'jg2', code: 'M1', name: 'Manajer Senior', level: 2, salary_min: 15000000, salary_max: 25000000, description: 'Manajemen senior', employee_count: 12 },
  { id: 'jg3', code: 'M2', name: 'Manajer', level: 3, salary_min: 10000000, salary_max: 18000000, description: 'Manajer departemen/cabang', employee_count: 22 },
  { id: 'jg4', code: 'S1', name: 'Supervisor', level: 4, salary_min: 7000000, salary_max: 12000000, description: 'Ketua tim & supervisor', employee_count: 30 },
  { id: 'jg5', code: 'S2', name: 'Staf Senior', level: 5, salary_min: 5000000, salary_max: 8000000, description: 'Staf berpengalaman', employee_count: 42 },
  { id: 'jg6', code: 'S3', name: 'Staf', level: 6, salary_min: 4000000, salary_max: 6000000, description: 'Staf reguler', employee_count: 38 },
  { id: 'jg7', code: 'J1', name: 'Junior', level: 7, salary_min: 3300000, salary_max: 4500000, description: 'Tingkat pemula', employee_count: 13 },
];

const MOCK_ORG_SUMMARY = {
  totalUnits: 10, totalDepartments: 4, totalBranches: 4, totalDivisions: 1,
  totalEmployees: 162, totalJobGrades: 7, avgSpanOfControl: 6.2,
  deepestLevel: 3, vacantPositions: 8,
};

export default function OrganizationPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MainTab>('org-structure');

  // Org data
  const [orgTree, setOrgTree] = useState<any[]>(MOCK_ORG_TREE);
  const [orgFlat, setOrgFlat] = useState<any[]>(MOCK_ORG_FLAT);
  const [jobGrades, setJobGrades] = useState<any[]>(MOCK_JOB_GRADES);
  const [summary, setSummary] = useState<any>(MOCK_ORG_SUMMARY);

  // Modals
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [orgForm, setOrgForm] = useState<any>({});
  const [gradeForm, setGradeForm] = useState<any>({});

  // Expanded nodes in tree
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
    await Promise.all([fetchOrgTree(), fetchJobGrades(), fetchSummary()]);
    setLoading(false);
  };

  const fetchOrgTree = async () => {
    try {
      const res = await fetch('/api/hq/hris/organization?action=org-tree');
      const json = await res.json();
      const tree = json.data?.length ? json.data : MOCK_ORG_TREE;
      const flat = json.flat?.length ? json.flat : MOCK_ORG_FLAT;
      setOrgTree(tree);
      setOrgFlat(flat);
      // Auto-expand first level
      const ids = new Set<string>();
      tree.forEach((n: any) => ids.add(n.id));
      setExpanded(ids);
    } catch (e) { console.error(e); setOrgTree(MOCK_ORG_TREE); setOrgFlat(MOCK_ORG_FLAT); }
  };

  const fetchJobGrades = async () => {
    try {
      const res = await fetch('/api/hq/hris/organization?action=job-grades');
      const json = await res.json();
      setJobGrades(json.data?.length ? json.data : MOCK_JOB_GRADES);
    } catch (e) { console.error(e); setJobGrades(MOCK_JOB_GRADES); }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/hq/hris/organization?action=summary');
      const json = await res.json();
      setSummary(json.data && Object.keys(json.data).length ? json.data : MOCK_ORG_SUMMARY);
    } catch (e) { console.error(e); setSummary(MOCK_ORG_SUMMARY); }
  };

  const saveOrg = async () => {
    try {
      const res = await fetch('/api/hq/hris/organization?action=org', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgForm)
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', 'Unit organisasi berhasil disimpan');
        setShowOrgModal(false);
        setOrgForm({});
        fetchOrgTree();
        fetchSummary();
      } else showToast('error', json.error || 'Gagal menyimpan');
    } catch (e) { showToast('error', 'Gagal menyimpan'); }
  };

  const deleteOrg = async (id: string, name: string) => {
    if (!confirm(`Hapus unit ${name}?`)) return;
    try {
      const res = await fetch('/api/hq/hris/organization?action=org', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const json = await res.json();
      if (json.success) { showToast('success', 'Dihapus'); fetchOrgTree(); fetchSummary(); }
    } catch (e) { showToast('error', 'Gagal menghapus'); }
  };

  const saveGrade = async () => {
    try {
      const res = await fetch('/api/hq/hris/organization?action=job-grade', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gradeForm)
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', 'Golongan jabatan berhasil disimpan');
        setShowGradeModal(false);
        setGradeForm({});
        fetchJobGrades();
        fetchSummary();
      } else showToast('error', json.error || 'Gagal menyimpan');
    } catch (e) { showToast('error', 'Gagal menyimpan'); }
  };

  const deleteGrade = async (id: string, name: string) => {
    if (!confirm(`Hapus grade ${name}?`)) return;
    try {
      const res = await fetch('/api/hq/hris/organization?action=job-grade', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const json = await res.json();
      if (json.success) { showToast('success', 'Dihapus'); fetchJobGrades(); fetchSummary(); }
    } catch (e) { showToast('error', 'Gagal menghapus'); }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const fmtCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

  const levelColors = ['bg-blue-600', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'];

  // Recursive tree node renderer
  const renderOrgNode = (node: any, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const bgColor = levelColors[Math.min(depth, levelColors.length - 1)];

    return (
      <div key={node.id}>
        <div className={`flex items-center gap-2 py-2.5 px-3 rounded-lg hover:bg-gray-50 group ${depth > 0 ? 'ml-' + (depth * 6) : ''}`}
          style={{ marginLeft: depth * 24 }}>
          {hasChildren ? (
            <button onClick={() => toggleExpand(node.id)} className="p-0.5 hover:bg-gray-200 rounded">
              {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <div className={`w-2 h-2 rounded-full ${bgColor}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-800 text-sm">{node.name}</span>
              {node.code && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded">{node.code}</span>}
              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded">Level {node.level}</span>
              {parseInt(node.employee_count) > 0 && (
                <span className="px-1.5 py-0.5 bg-green-50 text-green-600 text-[10px] rounded flex items-center gap-0.5">
                  <Users className="w-3 h-3" /> {node.employee_count}
                </span>
              )}
            </div>
            {node.head_name && (
              <p className="text-xs text-gray-400 mt-0.5">Kepala: {node.head_name} ({node.head_position || '-'})</p>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => { setOrgForm({ parent_id: node.id, level: (node.level || 0) + 1 }); setShowOrgModal(true); }}
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded" title="Tambah Sub-unit">
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setOrgForm({ ...node }); setShowOrgModal(true); }}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit">
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => deleteOrg(node.id, node.name)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Hapus">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>{node.children.map((c: any) => renderOrgNode(c, depth + 1))}</div>
        )}
      </div>
    );
  };

  if (!mounted) return null;

  return (
    <HQLayout title={t('hris.organizationTitle')} currentMenu="hris">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Network className="w-6 h-6 text-indigo-600" /> Struktur Organisasi & Golongan Jabatan
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Kelola hierarki organisasi dan golongan jabatan</p>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Unit Organisasi', value: summary.totalUnits || 0, icon: Building2, color: 'text-indigo-600 bg-indigo-50' },
              { label: 'Golongan Jabatan', value: summary.totalGrades || 0, icon: Layers, color: 'text-purple-600 bg-purple-50' },
              { label: 'Total Karyawan', value: summary.totalEmployees || 0, icon: Users, color: 'text-blue-600 bg-blue-50' },
              { label: 'Departemen', value: summary.departmentBreakdown?.length || 0, icon: Briefcase, color: 'text-green-600 bg-green-50' },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${card.color}`}><card.icon className="w-5 h-5" /></div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                    <p className="text-xs text-gray-500">{card.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl border">
          <div className="border-b">
            <div className="flex">
              {([
                { key: 'org-structure', label: 'Struktur Organisasi', icon: Network },
                { key: 'job-grades', label: 'Golongan Jabatan', icon: Layers },
                { key: 'summary', label: 'Ringkasan', icon: BarChart3 },
              ] as { key: MainTab; label: string; icon: any }[]).map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  <tab.icon className="w-4 h-4" /> {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            {/* ===== ORG STRUCTURE TAB ===== */}
            {activeTab === 'org-structure' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Hierarki Organisasi</h3>
                  <button onClick={() => { setOrgForm({ level: 0 }); setShowOrgModal(true); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    <Plus className="w-3.5 h-3.5" /> Tambah Unit
                  </button>
                </div>

                {loading ? (
                  <p className="text-center text-gray-400 py-8">Memuat data...</p>
                ) : orgTree.length === 0 ? (
                  <div className="text-center py-12">
                    <Network className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Belum ada struktur organisasi</p>
                    <p className="text-xs text-gray-400 mt-1">Klik "Tambah Unit" untuk memulai</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {orgTree.map(node => renderOrgNode(node, 0))}
                  </div>
                )}
              </div>
            )}

            {/* ===== JOB GRADES TAB ===== */}
            {activeTab === 'job-grades' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Struktur Golongan Jabatan</h3>
                  <button onClick={() => { setGradeForm({ level: (jobGrades.length || 0) + 1 }); setShowGradeModal(true); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    <Plus className="w-3.5 h-3.5" /> Tambah Golongan
                  </button>
                </div>

                {loading ? (
                  <p className="text-center text-gray-400 py-8">Memuat data...</p>
                ) : jobGrades.length === 0 ? (
                  <div className="text-center py-12">
                    <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Belum ada golongan jabatan</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobGrades.map((g: any) => {
                      const benefits = (() => { try { return typeof g.benefits === 'string' ? JSON.parse(g.benefits) : g.benefits; } catch { return []; } })();
                      const leaveQuota = (() => { try { return typeof g.leave_quota === 'string' ? JSON.parse(g.leave_quota) : g.leave_quota; } catch { return {}; } })();

                      return (
                        <div key={g.id} className="border rounded-lg p-4 hover:bg-gray-50 group">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                  {g.code}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-gray-800">{g.name}</h4>
                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] rounded">Level {g.level}</span>
                                    {parseInt(g.employee_count) > 0 && (
                                      <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] rounded flex items-center gap-0.5">
                                        <Users className="w-3 h-3" /> {g.employee_count} karyawan
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    <DollarSign className="w-3 h-3 inline" /> Rentang: {fmtCurrency(g.min_salary)} - {fmtCurrency(g.max_salary)}
                                  </p>
                                </div>
                              </div>

                              {/* Benefits & Leave */}
                              <div className="flex flex-wrap gap-4 mt-3">
                                {Array.isArray(benefits) && benefits.length > 0 && (
                                  <div>
                                    <p className="text-[10px] font-medium text-gray-400 mb-1">TUNJANGAN</p>
                                    <div className="flex flex-wrap gap-1">
                                      {benefits.map((b: string, i: number) => (
                                        <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded">{b}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {leaveQuota && Object.keys(leaveQuota).length > 0 && (
                                  <div>
                                    <p className="text-[10px] font-medium text-gray-400 mb-1">KUOTA CUTI</p>
                                    <div className="flex gap-2">
                                      {Object.entries(leaveQuota).map(([k, v]) => (
                                        <span key={k} className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] rounded">
                                          {k}: {String(v)} hari
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {g.description && <p className="text-xs text-gray-400 mt-2">{g.description}</p>}
                            </div>

                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setGradeForm({ ...g, benefits, leave_quota: leaveQuota }); setShowGradeModal(true); }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteGrade(g.id, g.name)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ===== SUMMARY TAB ===== */}
            {activeTab === 'summary' && summary && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Distribusi Karyawan per Departemen</h3>
                  {(summary.departmentBreakdown || []).length === 0 ? (
                    <p className="text-center text-gray-400 py-6">Tidak ada data</p>
                  ) : (
                    <div className="space-y-2">
                      {summary.departmentBreakdown.map((d: any, i: number) => {
                        const maxCnt = Math.max(...summary.departmentBreakdown.map((x: any) => parseInt(x.cnt)));
                        const pct = maxCnt > 0 ? (parseInt(d.cnt) / maxCnt) * 100 : 0;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 w-40 truncate">{d.department || 'N/A'}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full flex items-center justify-end pr-2 transition-all"
                                style={{ width: `${Math.max(pct, 5)}%` }}>
                                <span className="text-[10px] text-white font-medium">{d.cnt}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Struktur Organisasi Datar</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-2 text-gray-600 font-medium">Unit</th>
                          <th className="text-left px-4 py-2 text-gray-600 font-medium">Kode</th>
                          <th className="text-left px-4 py-2 text-gray-600 font-medium">Level</th>
                          <th className="text-left px-4 py-2 text-gray-600 font-medium">Induk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {orgFlat.map((o: any) => (
                          <tr key={o.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-800">{o.name}</td>
                            <td className="px-4 py-2 text-gray-500">{o.code || '-'}</td>
                            <td className="px-4 py-2"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded">L{o.level}</span></td>
                            <td className="px-4 py-2 text-gray-400 text-xs">{o.parent_name || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== ORG MODAL ===== */}
      {showOrgModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowOrgModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-800">{orgForm.id ? 'Edit' : 'Tambah'} Unit Organisasi</h3>
              <button onClick={() => setShowOrgModal(false)} className="p-1.5 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Nama Unit *</label>
                <input type="text" value={orgForm.name || ''} onChange={e => setOrgForm((f: any) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="Divisi / Departemen / Bagian" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Kode</label>
                  <input type="text" value={orgForm.code || ''} onChange={e => setOrgForm((f: any) => ({ ...f, code: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="OPS, FIN, HR" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Level</label>
                  <input type="number" value={orgForm.level ?? 0} onChange={e => setOrgForm((f: any) => ({ ...f, level: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Unit Induk</label>
                <select value={orgForm.parent_id || ''} onChange={e => setOrgForm((f: any) => ({ ...f, parent_id: e.target.value || null }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                  <option value="">-- Tingkat Atas --</option>
                  {orgFlat.map((o: any) => (
                    <option key={o.id} value={o.id}>{'  '.repeat(o.level)}{o.name} ({o.code || '-'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Deskripsi</label>
                <textarea value={orgForm.description || ''} onChange={e => setOrgForm((f: any) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1" rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowOrgModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
              <button onClick={saveOrg} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== GRADE MODAL ===== */}
      {showGradeModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowGradeModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-800">{gradeForm.id ? 'Edit' : 'Tambah'} Golongan Jabatan</h3>
              <button onClick={() => setShowGradeModal(false)} className="p-1.5 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Kode *</label>
                  <input type="text" value={gradeForm.code || ''} onChange={e => setGradeForm((f: any) => ({ ...f, code: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="G1" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500">Nama *</label>
                  <input type="text" value={gradeForm.name || ''} onChange={e => setGradeForm((f: any) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="Staff Junior" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Level</label>
                <input type="number" value={gradeForm.level || 1} onChange={e => setGradeForm((f: any) => ({ ...f, level: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Gaji Minimum</label>
                  <input type="number" value={gradeForm.min_salary || ''} onChange={e => setGradeForm((f: any) => ({ ...f, min_salary: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Gaji Maksimum</label>
                  <input type="number" value={gradeForm.max_salary || ''} onChange={e => setGradeForm((f: any) => ({ ...f, max_salary: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Deskripsi</label>
                <textarea value={gradeForm.description || ''} onChange={e => setGradeForm((f: any) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1" rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t sticky bottom-0 bg-white">
              <button onClick={() => setShowGradeModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
              <button onClick={saveGrade} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </HQLayout>
  );
}
