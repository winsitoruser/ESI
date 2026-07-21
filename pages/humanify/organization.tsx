import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import OrgChartTree from '@/components/humanify/OrgChartTree';
import { useTranslation } from '@/lib/i18n';
import {
  Building2, Network, Award, Plus, Edit, Trash2, X, Save,
  ChevronRight, ChevronDown, Users, Briefcase, Search,
  BarChart3, Layers, Shield, DollarSign, LayoutGrid, List as ListIcon,
} from 'lucide-react';

type MainTab = 'org-structure' | 'job-grades' | 'compensation' | 'summary';
type OrgView = 'chart' | 'list';

const EMPTY_SUMMARY = {
  totalUnits: 0, totalDepartments: 0, totalBranches: 0, totalDivisions: 0,
  totalEmployees: 0, totalJobGrades: 0, avgSpanOfControl: 0,
  deepestLevel: 0, vacantPositions: 0,
};

export default function OrganizationPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MainTab>('org-structure');
  const [orgView, setOrgView] = useState<OrgView>('chart');

  // Org data
  const [orgTree, setOrgTree] = useState<any[]>([]);
  const [orgFlat, setOrgFlat] = useState<any[]>([]);
  const [jobGrades, setJobGrades] = useState<any[]>([]);
  const [compAudit, setCompAudit] = useState<any>(null);
  const [summary, setSummary] = useState<any>(EMPTY_SUMMARY);

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
  useEffect(() => {
    if (!router.isReady) return;
    const tab = String(router.query.tab || '');
    if (tab === 'grades' || tab === 'job-grades') setActiveTab('job-grades');
    else if (tab === 'summary') setActiveTab('summary');
    else if (tab === 'org-structure' || tab === 'org') setActiveTab('org-structure');
  }, [router.isReady, router.query.tab]);
  useEffect(() => { if (mounted) loadAll(); }, [mounted]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchOrgTree(), fetchJobGrades(), fetchSummary(), fetchCompensation()]);
    setLoading(false);
  };

  const fetchOrgTree = async () => {
    try {
      const res = await fetch(`/api/humanify/organization?action=org-tree&_=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        const tree = json.data || [];
        const flat = json.flat || [];
        setOrgTree(tree.length ? [...tree] : []);
        setOrgFlat(flat.length ? [...flat] : []);
        const ids = new Set<string>();
        const walk = (nodes: any[]) => {
          nodes.forEach((n: any) => {
            ids.add(n.id);
            if (n.children?.length) walk(n.children);
          });
        };
        walk(tree);
        setExpanded(ids);
      }
    } catch (e) { console.error(e); setOrgTree([]); setOrgFlat([]); }
  };

  const levelForParent = (parentId: string | null | undefined) => {
    if (!parentId) return 0;
    const parent = orgFlat.find((o: any) => o.id === parentId);
    return parent ? (parent.level ?? 0) + 1 : 0;
  };

  const parentOptions = orgFlat.filter((o: any) => {
    if (!orgForm.id) return true;
    if (o.id === orgForm.id) return false;
    return true;
  });

  const fetchJobGrades = async () => {
    try {
      const res = await fetch('/api/humanify/organization?action=job-grades');
      const json = await res.json();
      setJobGrades(json.data || []);
    } catch (e) { console.error(e); setJobGrades([]); }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/humanify/organization?action=summary');
      const json = await res.json();
      setSummary(json.data && Object.keys(json.data).length ? json.data : EMPTY_SUMMARY);
    } catch (e) { console.error(e); setSummary(EMPTY_SUMMARY); }
  };

  const fetchCompensation = async () => {
    try {
      const res = await fetch('/api/humanify/organization?action=compensation-audit');
      const json = await res.json();
      setCompAudit(json.data || null);
    } catch { setCompAudit(null); }
  };

  const fmtRp = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

  const saveOrg = async () => {
    if (!orgForm.name?.trim()) {
      showToast('error', 'Nama unit wajib diisi');
      return;
    }
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const parentId = orgForm.parent_id || null;
    const payload: any = {
      name: orgForm.name,
      code: orgForm.code,
      parent_id: parentId,
      level: parentId ? levelForParent(parentId) : 0,
      sort_order: orgForm.sort_order ?? 0,
      head_employee_id: orgForm.head_employee_id || null,
      description: orgForm.description,
    };
    if (orgForm.id && uuidRe.test(orgForm.id)) payload.id = orgForm.id;

    try {
      const res = await fetch('/api/humanify/organization?action=org', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', orgForm.id ? 'Unit organisasi diperbarui' : 'Unit organisasi berhasil disimpan');
        setShowOrgModal(false);
        setOrgForm({});
        await loadAll();
      } else showToast('error', json.error || 'Gagal menyimpan');
    } catch (e) { showToast('error', 'Gagal menyimpan'); }
  };

  const deleteOrg = async (id: string, name: string) => {
    if (!confirm(`Hapus unit ${name}?`)) return;
    try {
      const res = await fetch('/api/humanify/organization?action=org', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const json = await res.json();
      if (json.success) { showToast('success', 'Dihapus'); fetchOrgTree(); fetchSummary(); }
    } catch (e) { showToast('error', 'Gagal menghapus'); }
  };

  const saveGrade = async () => {
    try {
      const res = await fetch('/api/humanify/organization?action=job-grade', {
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
      const res = await fetch('/api/humanify/organization?action=job-grade', {
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

  const levelColors = ['bg-[var(--hf-brand-600)]', 'bg-[var(--hf-brand-500)]', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'];

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
              <span className="px-1.5 py-0.5 bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)] text-[10px] rounded">Level {node.level}</span>
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
            <button onClick={() => { setOrgForm({ id: node.id, name: node.name, code: node.code, parent_id: node.parent_id, level: node.level, sort_order: node.sort_order, head_employee_id: node.head_employee_id, description: node.description }); setShowOrgModal(true); }}
              className="p-1.5 text-gray-400 hover:text-[color:var(--hf-brand-600)] hover:bg-[var(--hf-brand-50)] rounded" title="Edit">
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

  if (!mounted) {
    return (
      <HQLayout title={t('hris.organizationTitle')}>
        <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Memuat halaman...</div>
      </HQLayout>
    );
  }

  return (
    <HQLayout title={t('hris.organizationTitle')}>
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
              <Network className="w-6 h-6 text-[color:var(--hf-brand-600)]" /> Struktur Organisasi & Golongan Jabatan
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Kelola hierarki organisasi dan golongan jabatan</p>
          </div>
        </div>

        {/* Summary Cards — prefer summary API keys; fall back to live list lengths */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: 'Unit Organisasi',
                value: summary.totalUnits ?? summary.orgUnits ?? orgFlat.length ?? 0,
                icon: Building2,
                color: 'text-[color:var(--hf-brand-600)] bg-[var(--hf-brand-50)]',
              },
              {
                label: 'Golongan Jabatan',
                value: summary.totalGrades ?? summary.jobGrades ?? summary.totalJobGrades ?? jobGrades.length ?? 0,
                icon: Layers,
                color: 'text-purple-600 bg-purple-50',
              },
              {
                label: 'Total Karyawan',
                value: summary.totalEmployees ?? summary.employees ?? 0,
                icon: Users,
                color: 'text-[color:var(--hf-brand-600)] bg-[var(--hf-brand-50)]',
              },
              {
                label: 'Departemen',
                value: summary.totalDepartments ?? summary.totalUnits ?? summary.orgUnits ?? orgFlat.length ?? 0,
                icon: Briefcase,
                color: 'text-green-600 bg-green-50',
              },
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
                { key: 'compensation', label: 'Compensation Bands', icon: DollarSign },
                { key: 'summary', label: 'Ringkasan', icon: BarChart3 },
              ] as { key: MainTab; label: string; icon: any }[]).map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key ? 'border-[var(--hf-brand-600)] text-[color:var(--hf-brand-600)]' : 'border-transparent text-gray-500 hover:text-gray-700'
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
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">Hierarki Organisasi</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Bagan struktur unit kerja perusahaan</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex rounded-lg border overflow-hidden text-sm">
                      <button
                        type="button"
                        onClick={() => setOrgView('chart')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 ${orgView === 'chart' ? 'bg-[var(--hf-brand-600)] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                      >
                        <LayoutGrid className="w-4 h-4" /> Bagan
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrgView('list')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border-l ${orgView === 'list' ? 'bg-[var(--hf-brand-600)] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                      >
                        <ListIcon className="w-4 h-4" /> Daftar
                      </button>
                    </div>
                    <button onClick={() => { setOrgForm({ level: 0 }); setShowOrgModal(true); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--hf-brand-600)] text-white rounded-lg hover:bg-[var(--hf-brand)]">
                      <Plus className="w-3.5 h-3.5" /> Tambah Unit
                    </button>
                  </div>
                </div>

                {loading ? (
                  <p className="text-center text-gray-400 py-8">Memuat data...</p>
                ) : orgTree.length === 0 ? (
                  <div className="text-center py-12">
                    <Network className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Belum ada struktur organisasi</p>
                    <p className="text-xs text-gray-400 mt-1">Klik &quot;Tambah Unit&quot; untuk memulai</p>
                  </div>
                ) : orgView === 'chart' ? (
                  <div className="bg-gradient-to-b from-slate-50 to-white rounded-xl border p-6">
                    <OrgChartTree
                      nodes={orgTree}
                      onAddChild={(parentId, parentLevel) => {
                        setOrgForm({ parent_id: parentId, level: parentLevel });
                        setShowOrgModal(true);
                      }}
                      onEdit={(node) => {
                        setOrgForm({
                          id: node.id,
                          name: node.name,
                          code: node.code,
                          parent_id: node.parent_id,
                          level: node.level,
                          sort_order: node.sort_order,
                          head_employee_id: node.head_employee_id,
                          description: node.description,
                        });
                        setShowOrgModal(true);
                      }}
                      onDelete={deleteOrg}
                    />
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
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-[var(--hf-brand-600)] flex items-center justify-center text-white font-bold text-sm">
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
                                        <span key={i} className="px-2 py-0.5 bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)] text-[10px] rounded">{b}</span>
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
                                className="p-1.5 text-gray-400 hover:text-[color:var(--hf-brand-600)] hover:bg-[var(--hf-brand-50)] rounded"><Edit className="w-3.5 h-3.5" /></button>
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

            {/* ===== COMPENSATION BANDS TAB ===== */}
            {activeTab === 'compensation' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">Compensation Band Audit</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Bandingkan gaji aktual karyawan vs range golongan jabatan (min–max)</p>
                  </div>
                  {compAudit?.dataSource && <DataSourceBadge source={compAudit.dataSource} />}
                </div>

                {compAudit ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { label: 'In Band', value: compAudit.inBand, color: 'text-emerald-700 bg-emerald-50' },
                        { label: 'Di Bawah Min', value: compAudit.belowMin, color: 'text-amber-700 bg-amber-50' },
                        { label: 'Di Atas Max', value: compAudit.aboveMax, color: 'text-rose-700 bg-rose-50' },
                        { label: 'Tanpa Grade', value: compAudit.noGrade, color: 'text-gray-700 bg-gray-50' },
                        { label: 'Avg Compa-Ratio', value: compAudit.avgCompaRatio ?? '—', color: 'text-[color:var(--hf-brand)] bg-[var(--hf-brand-50)]' },
                      ].map((s) => (
                        <div key={s.label} className={`rounded-xl p-3 ${s.color}`}>
                          <p className="text-[10px] font-medium uppercase opacity-70">{s.label}</p>
                          <p className="text-xl font-bold">{s.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="overflow-x-auto border rounded-xl">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs text-gray-500">
                          <tr>
                            <th className="px-3 py-2">Karyawan</th>
                            <th className="px-3 py-2">Grade</th>
                            <th className="px-3 py-2">Gaji</th>
                            <th className="px-3 py-2">Range</th>
                            <th className="px-3 py-2">Compa</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(compAudit.rows || []).map((r: any) => (
                            <tr key={r.employeeId} className="border-t hover:bg-gray-50/80">
                              <td className="px-3 py-2">
                                <p className="font-medium text-gray-900">{r.employeeName}</p>
                                <p className="text-[10px] text-gray-400">{r.position}</p>
                              </td>
                              <td className="px-3 py-2 text-xs">{r.jobGradeCode || '—'} {r.jobGradeName || ''}</td>
                              <td className="px-3 py-2 font-mono text-xs">{fmtRp(r.currentSalary)}</td>
                              <td className="px-3 py-2 text-xs text-gray-500">{fmtRp(r.minSalary)} – {fmtRp(r.maxSalary)}</td>
                              <td className="px-3 py-2">{r.compaRatio ?? '—'}</td>
                              <td className="px-3 py-2">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  r.status === 'in_band' ? 'bg-emerald-100 text-emerald-700'
                                  : r.status === 'below_min' ? 'bg-amber-100 text-amber-700'
                                  : r.status === 'above_max' ? 'bg-rose-100 text-rose-700'
                                  : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {r.status.replace(/_/g, ' ')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">Memuat audit compensation...</p>
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
                        const counts = (summary.departmentBreakdown || []).map((x: any) => parseInt(x.cnt, 10) || 0);
                        const maxCnt = counts.length ? Math.max(...counts) : 0;
                        const pct = maxCnt > 0 ? ((parseInt(d.cnt, 10) || 0) / maxCnt) * 100 : 0;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 w-40 truncate">{d.department || 'N/A'}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                              <div className="bg-gradient-to-r from-[var(--hf-brand-600)] to-purple-500 h-full rounded-full flex items-center justify-end pr-2 transition-all"
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
                            <td className="px-4 py-2"><span className="px-2 py-0.5 bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)] text-xs rounded">L{o.level}</span></td>
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
                  <label className="text-xs font-medium text-gray-500">Urutan Tampil</label>
                  <input
                    type="number"
                    value={orgForm.sort_order ?? 0}
                    onChange={e => setOrgForm((f: any) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                    min={0}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Unit Induk</label>
                <select
                  value={orgForm.parent_id || ''}
                  onChange={e => {
                    const parent_id = e.target.value || null;
                    setOrgForm((f: any) => ({
                      ...f,
                      parent_id,
                      level: parent_id ? levelForParent(parent_id) : 0,
                    }));
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                >
                  <option value="">-- Tingkat Atas (Root) --</option>
                  {parentOptions.map((o: any) => (
                    <option key={o.id} value={o.id}>{'  '.repeat(o.level || 0)}{o.name} ({o.code || '-'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Level hierarki</label>
                <input
                  type="number"
                  value={orgForm.parent_id ? levelForParent(orgForm.parent_id) : (orgForm.level ?? 0)}
                  readOnly
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1 bg-gray-50 text-gray-600"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">Dihitung otomatis dari unit induk</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Deskripsi</label>
                <textarea value={orgForm.description || ''} onChange={e => setOrgForm((f: any) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1" rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowOrgModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
              <button onClick={saveOrg} className="px-4 py-2 bg-[var(--hf-brand-600)] text-white rounded-lg text-sm hover:bg-[var(--hf-brand)]">Simpan</button>
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
