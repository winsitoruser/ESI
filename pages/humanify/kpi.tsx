import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import HRStatCard from '@/components/humanify/HRStatCard';
import PerformanceModuleChrome, { EnterpriseTabBar } from '@/components/humanify/PerformanceModuleChrome';
import { useTranslation } from '@/lib/i18n';
import { 
  Target, TrendingUp, TrendingDown, Award, Users, 
  Building2, Calendar, Filter, Download, ChevronDown,
  AlertCircle, CheckCircle, Clock, BarChart3, PieChart, Eye,
  Plus, Save, Trash2, X, Search, FileText, Briefcase, DollarSign, UserPlus, RefreshCw
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { getDepartmentLabel } from '@/lib/hris/master-data';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface KPIMetric {
  id: string;
  name: string;
  category: 'sales' | 'operations' | 'customer' | 'financial';
  target: number;
  actual: number;
  unit: string;
  weight: number;
  trend: 'up' | 'down' | 'stable';
  period: string;
}

interface EmployeeKPI {
  employeeId: string;
  employeeName: string;
  position: string;
  branchName: string;
  department: string;
  period?: string;
  overallScore: number;
  overallAchievement: number;
  metrics: KPIMetric[];
  status: 'exceeded' | 'achieved' | 'partial' | 'not_achieved';
  lastUpdated: string;
}

interface BranchKPI {
  branchId: string;
  branchName: string;
  branchCode: string;
  manager: string;
  overallAchievement: number;
  salesKPI: number;
  operationsKPI: number;
  customerKPI: number;
  employeeCount: number;
  topPerformers: number;
  lowPerformers: number;
  totalRevenue?: number;
  transactionCount?: number;
}

interface KPITemplate {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  data_type?: string;
  formula_type: string;
  formula: string;
  default_weight: number;
  measurement_frequency: string;
  is_active: boolean;
}

interface EmployeeOption {
  id: string;
  employeeId: string;
  name: string;
  position: string;
  department: string;
  branchId?: string;
  branchName: string;
  workLocation?: string;
}

function getCategoryLabels(t: (key: string) => string): Record<string, string> {
  return {
    sales: t('hris.catSales'), operations: t('hris.catOperations'), customer: t('hris.catCustomer'),
    financial: t('hris.catFinancial'), hr: t('hris.catHr'), quality: t('hris.catQuality')
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  sales: 'bg-blue-100 text-blue-700', operations: 'bg-green-100 text-green-700',
  customer: 'bg-amber-100 text-amber-700', financial: 'bg-purple-100 text-purple-700',
  hr: 'bg-pink-100 text-pink-700', quality: 'bg-cyan-100 text-cyan-700'
};


export default function KPIDashboard() {
  const { t } = useTranslation();
  const CATEGORY_LABELS = getCategoryLabels(t);
  const [mounted, setMounted] = useState(false);
  const [employeeKPIs, setEmployeeKPIs] = useState<EmployeeKPI[]>([]);
  const [branchKPIs, setBranchKPIs] = useState<BranchKPI[]>([]);
  const [templates, setTemplates] = useState<KPITemplate[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'templates' | 'assign'>('dashboard');
  const [viewMode, setViewMode] = useState<'employee' | 'branch'>('branch');
  const [periodFilter, setPeriodFilter] = useState('current');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKPI, setSelectedKPI] = useState<EmployeeKPI | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<BranchKPI | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignForm, setAssignForm] = useState({ employeeId: '', branchId: '', templateCode: '', target: '', weight: 100 });
  const [metricEdits, setMetricEdits] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleExportKPIPdf = (kpi: EmployeeKPI | null) => {
    if (!kpi) return;
    const w = window.open('', '_blank');
    if (!w) {
      showToast('error', 'Pop-up diblokir browser');
      return;
    }
    const rows = (kpi.metrics || []).map((m) => {
      const pct = m.target > 0 ? Math.round((m.actual / m.target) * 100) : 0;
      return `<tr>
        <td>${m.name}</td><td>${m.category}</td><td style="text-align:right">${m.weight}%</td>
        <td style="text-align:right">${m.target}</td><td style="text-align:right">${m.actual}</td>
        <td style="text-align:right"><strong>${pct}%</strong></td>
      </tr>`;
    }).join('');
    w.document.write(`<!doctype html><html><head><title>KPI - ${kpi.employeeName}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#111}
        h1{font-size:20px;margin:0 0 4px}
        .meta{color:#666;font-size:13px;margin-bottom:16px}
        .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}
        .card{border:1px solid #e5e7eb;border-radius:8px;padding:10px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th,td{border:1px solid #e5e7eb;padding:6px 8px}
        th{background:#f9fafb;text-align:left}
        @media print{.noprint{display:none}}
      </style></head><body>
      <h1>Laporan KPI Karyawan</h1>
      <div class="meta">${kpi.employeeName} • ${kpi.position || ''} • ${kpi.branchName || ''} • Periode ${kpi.period || ''}</div>
      <div class="grid">
        <div class="card"><div>Skor Keseluruhan</div><strong style="font-size:22px">${kpi.overallScore ?? '-'}</strong></div>
        <div class="card"><div>Pencapaian</div><strong style="font-size:22px">${kpi.overallAchievement ?? 0}%</strong></div>
        <div class="card"><div>Status</div><strong style="font-size:16px">${kpi.status || '-'}</strong></div>
      </div>
      <table><thead><tr><th>Metrik</th><th>Kategori</th><th>Bobot</th><th>Target</th><th>Aktual</th><th>Pencapaian</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#999">Tidak ada metrik</td></tr>'}</tbody></table>
      <div class="noprint" style="margin-top:20px"><button onclick="window.print()">Cetak / Simpan PDF</button></div>
      </body></html>`);
    w.document.close();
  };

  const handleEditKPI = (kpi: EmployeeKPI | null) => {
    if (!kpi) return;
    const firstMetric = kpi.metrics?.[0];
    const matchedTpl = templates.find(t => t.name === firstMetric?.name || t.code === firstMetric?.name);
    setAssignForm({
      employeeId: kpi.employeeId || '',
      branchId: '',
      templateCode: matchedTpl?.code || '',
      target: String(firstMetric?.target || ''),
      weight: Number(firstMetric?.weight || 100)
    });
    setSelectedKPI(null);
    setShowAssignDialog(true);
  };

  const handleSaveMetricActuals = async () => {
    if (!selectedKPI) return;
    setSaving(true);
    try {
      const updates = selectedKPI.metrics.filter(m => metricEdits[m.id] !== undefined);
      for (const m of updates) {
        const actual = parseFloat(metricEdits[m.id]);
        if (Number.isNaN(actual)) continue;
        await fetch('/api/humanify/kpi', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: m.id, actual }),
        });
      }
      showToast('success', 'Nilai aktual berhasil disimpan');
      setMetricEdits({});
      await fetchData();
      setSelectedKPI(null);
    } catch {
      showToast('error', t('hris.serverError'));
    } finally {
      setSaving(false);
    }
  };

  const getPeriodParam = () => {
    const now = new Date();
    if (periodFilter === 'last') {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = getPeriodParam();
      const response = await fetch(`/api/humanify/kpi?period=${p}`);
      if (response.ok) {
        const data = await response.json();
        setEmployeeKPIs(data.employeeKPIs || []);
        setBranchKPIs(data.branchKPIs || []);
        setTemplates(data.templates || []);
        setEmployees(data.employees || []);
      } else {
        setEmployeeKPIs([]);
        setBranchKPIs([]);
        showToast('error', 'Gagal memuat data KPI');
      }
    } catch (error) {
      console.error('Failed to fetch KPI data:', error);
      setEmployeeKPIs([]);
      setBranchKPIs([]);
      showToast('error', t('hris.serverError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  useEffect(() => { if (mounted) fetchData(); }, [periodFilter]);

  const filteredEmployees = useMemo(() => {
    let list = employeeKPIs;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e =>
        e.employeeName.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q) ||
        e.branchName.toLowerCase().includes(q) ||
        getDepartmentLabel(e.department).toLowerCase().includes(q) ||
        (e as any).employeeId?.toLowerCase?.().includes(q)
      );
    }
    if (categoryFilter !== 'all') {
      list = list.filter(e => e.metrics.some(m => m.category === categoryFilter));
    }
    return list;
  }, [employeeKPIs, searchQuery, categoryFilter]);

  const handleExportCSV = () => {
    const rows = [['Karyawan', 'Posisi', 'Cabang', 'Skor', 'Pencapaian', 'Status']];
    employeeKPIs.forEach(e => {
      rows.push([e.employeeName, e.position, e.branchName, String(e.overallScore), `${e.overallAchievement}%`, e.status]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `kpi-report-${getPeriodParam()}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast('success', t('hris.kpiExportSuccess'));
  };

  const handleAssignKPI = async () => {
    const tpl = templates.find(t => t.code === assignForm.templateCode);
    if (!assignForm.employeeId || !tpl) { showToast('error', t('hris.selectEmployeeAndTemplate')); return; }
    const emp = employees.find(e => e.id === assignForm.employeeId);
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: assignForm.employeeId,
          branchId: assignForm.branchId || emp?.branchId || null,
          period: getPeriodParam(),
          metrics: [{
            name: tpl.name, category: tpl.category, target: parseFloat(assignForm.target) || 100,
            unit: tpl.unit, weight: assignForm.weight, templateId: tpl.id
          }]
        })
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        showToast('success', t('hris.kpiAssignSuccess'));
        setShowAssignDialog(false);
        setAssignForm({ employeeId: '', branchId: '', templateCode: '', target: '', weight: 100 });
        await fetchData();
      } else {
        showToast('error', data.error || data.details || t('hris.kpiAssignFailed'));
      }
    } catch { showToast('error', t('hris.serverError')); }
    finally { setSaving(false); }
  };

  if (!mounted) return null;

  const totalEmployees = employeeKPIs.length;
  const exceededCount = employeeKPIs.filter(e => e.status === 'exceeded').length;
  const achievedCount = employeeKPIs.filter(e => e.status === 'achieved').length;
  const partialCount = employeeKPIs.filter(e => e.status === 'partial').length;
  const notAchievedCount = employeeKPIs.filter(e => e.status === 'not_achieved').length;
  const avgAchievement = employeeKPIs.reduce((sum, e) => sum + e.overallAchievement, 0) / totalEmployees || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'exceeded': return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {t('hris.exceededBadge')}</span>;
      case 'achieved': return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {t('hris.achievedBadge')}</span>;
      case 'partial': return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> {t('hris.partialBadge')}</span>;
      case 'not_achieved': return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {t('hris.notAchievedBadge')}</span>;
      default: return null;
    }
  };

  const getAchievementColor = (value: number) => {
    if (value >= 100) return 'text-green-600';
    if (value >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (value: number) => {
    if (value >= 100) return 'bg-green-500';
    if (value >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'Rp') {
      return `Rp ${(value / 1000000).toFixed(0)} Jt`;
    }
    return `${value}${unit === '%' ? '%' : ` ${unit}`}`;
  };

  return (
    <HQLayout title={t('hris.kpiTitle')} subtitle={t('hris.kpiSubtitle')}>
      <div className="space-y-6">
        <PerformanceModuleChrome
          active="kpi"
          title={t('hris.kpiTitle')}
          subtitle="Pantau pencapaian KPI per cabang & karyawan — assign, update aktual, dan ekspor laporan"
          icon={Target}
          gradient="violet"
          actions={
            <>
              <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="rounded-xl border-0 bg-white/15 px-3 py-2 text-sm text-white backdrop-blur-sm">
                <option value="current" className="text-slate-900">{t('hris.thisMonth')}</option>
                <option value="last" className="text-slate-900">{t('hris.lastMonth')}</option>
              </select>
              <button onClick={handleExportCSV} className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/25">
                <Download className="h-4 w-4" />{t('hris.exportCsv')}
              </button>
              <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </>
          }
        />

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <HRStatCard label={t('hris.avgAchievement')} value={`${avgAchievement.toFixed(0)}%`} icon={Target} gradient="from-indigo-500 to-violet-600" />
          <HRStatCard label={t('hris.exceeded')} value={exceededCount} icon={TrendingUp} gradient="from-emerald-500 to-teal-600" />
          <HRStatCard label={t('hris.achieved')} value={achievedCount} icon={CheckCircle} gradient="from-blue-500 to-cyan-600" />
          <HRStatCard label={t('hris.partial')} value={partialCount} icon={Clock} gradient="from-amber-500 to-orange-600" />
          <HRStatCard label={t('hris.notAchieved')} value={notAchievedCount} icon={AlertCircle} gradient="from-rose-500 to-red-600" />
          <HRStatCard label={t('hris.totalEmployees')} value={totalEmployees} sub={`${templates.length} template`} icon={Users} gradient="from-purple-500 to-fuchsia-600" />
        </div>

        {/* Tab Navigation */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <EnterpriseTabBar
              tabs={[
                { key: 'dashboard' as const, label: t('hris.dashboard'), icon: BarChart3 },
                { key: 'templates' as const, label: `${t('hris.templateKpi')} (${templates.length})`, icon: FileText },
              ]}
              active={activeTab === 'assign' ? 'dashboard' : activeTab}
              onChange={(k) => setActiveTab(k)}
            />
            <button onClick={() => setShowAssignDialog(true)} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700">
              <UserPlus className="h-4 w-4" />{t('hris.assignKpi')}
            </button>
          </div>

          {/* Sub-tabs for dashboard view */}
          {activeTab === 'dashboard' && (
            <div className="flex gap-2 mt-3 pt-3 border-t">
              <button onClick={() => setViewMode('branch')} className={`px-3 py-1.5 rounded-md text-sm ${viewMode === 'branch' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}>
                <Building2 className="w-4 h-4 inline mr-1" />{t('hris.perBranch')}
              </button>
              <button onClick={() => setViewMode('employee')} className={`px-3 py-1.5 rounded-md text-sm ${viewMode === 'employee' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}>
                <Users className="w-4 h-4 inline mr-1" />{t('hris.perEmployee')}
              </button>
              {viewMode === 'employee' && (
                <div className="flex-1 flex gap-2 ml-4">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                    <input type="text" placeholder={t('hris.searchEmployee')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-1.5 border rounded-md text-sm w-full" />
                  </div>
                  <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-2 py-1.5 border rounded-md text-sm">
                    <option value="all">{t('hris.allCategories')}</option>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Branch KPI View with Charts */}
        {activeTab === 'dashboard' && viewMode === 'branch' && (
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-16 text-gray-400">Memuat data KPI cabang...</div>
            ) : branchKPIs.length === 0 ? (
              <div className="text-center py-16 text-gray-400 bg-white rounded-xl border">Belum ada data KPI cabang untuk periode ini</div>
            ) : (
            <>
            {/* KPI Comparison Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Branch Comparison Bar Chart */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold text-lg mb-4">{t('hris.branchKpiComparison')}</h3>
                {typeof window !== 'undefined' && (
                  <Chart
                    type="bar"
                    height={300}
                    options={{
                      chart: { toolbar: { show: false }, fontFamily: 'inherit' },
                      plotOptions: { bar: { horizontal: false, columnWidth: '60%', borderRadius: 6 } },
                      dataLabels: { enabled: false },
                      xaxis: { categories: branchKPIs.map(b => b.branchName.replace('Cabang ', '')) },
                      yaxis: { max: 120, labels: { formatter: (val: number) => `${val}%` } },
                      colors: ['#3B82F6', '#10B981', '#F59E0B'],
                      legend: { position: 'top' },
                      grid: { borderColor: '#f1f1f1' },
                      tooltip: { y: { formatter: (val: number) => `${val}%` } }
                    }}
                    series={[
                      { name: 'Penjualan', data: branchKPIs.map(b => b.salesKPI) },
                      { name: 'Operasional', data: branchKPIs.map(b => b.operationsKPI) },
                      { name: 'Pelanggan', data: branchKPIs.map(b => b.customerKPI) }
                    ]}
                  />
                )}
              </div>

              {/* Overall Achievement Radar Chart */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold text-lg mb-4">{t('hris.radarKpiBranch')}</h3>
                {typeof window !== 'undefined' && (
                  <Chart
                    type="radar"
                    height={300}
                    options={{
                      chart: { toolbar: { show: false }, fontFamily: 'inherit' },
                      xaxis: { categories: ['Penjualan', 'Operasional', 'Pelanggan', 'Keseluruhan'] },
                      yaxis: { max: 110 },
                      colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
                      markers: { size: 4 },
                      legend: { position: 'bottom' },
                      fill: { opacity: 0.2 }
                    }}
                    series={branchKPIs.map(b => ({
                      name: b.branchName.replace('Cabang ', ''),
                      data: [b.salesKPI, b.operationsKPI, b.customerKPI, b.overallAchievement]
                    }))}
                  />
                )}
              </div>
            </div>

            {/* Branch Cards with Radial Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {branchKPIs.map((branch) => (
                <div key={branch.branchId} className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-lg transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{branch.branchName}</h3>
                      <p className="text-sm text-gray-500">{branch.branchCode} • {branch.manager}</p>
                    </div>
                  </div>

                  {/* Radial Bar for Overall Achievement */}
                  <div className="flex items-center justify-center my-4">
                    {typeof window !== 'undefined' && (
                      <Chart
                        type="radialBar"
                        height={180}
                        width={180}
                        options={{
                          chart: { sparkline: { enabled: true } },
                          plotOptions: {
                            radialBar: {
                              startAngle: -135,
                              endAngle: 135,
                              hollow: { size: '60%' },
                              track: { background: '#f1f5f9', strokeWidth: '100%' },
                              dataLabels: {
                                name: { show: true, fontSize: '12px', color: '#6b7280', offsetY: 20 },
                                value: { 
                                  show: true, 
                                  fontSize: '24px', 
                                  fontWeight: 700,
                                  color: branch.overallAchievement >= 100 ? '#10B981' : branch.overallAchievement >= 80 ? '#F59E0B' : '#EF4444',
                                  offsetY: -10,
                                  formatter: (val: number) => `${val}%`
                                }
                              }
                            }
                          },
                          colors: [branch.overallAchievement >= 100 ? '#10B981' : branch.overallAchievement >= 80 ? '#F59E0B' : '#EF4444'],
                          labels: ['Pencapaian']
                        }}
                        series={[Math.min(branch.overallAchievement, 100)]}
                      />
                    )}
                  </div>

                  {/* Mini Bar Chart for KPI breakdown */}
                  <div className="space-y-2 mt-4">
                    {[
                      { label: 'Penjualan', value: branch.salesKPI, color: '#3B82F6' },
                      { label: 'Operasional', value: branch.operationsKPI, color: '#10B981' },
                      { label: 'Pelanggan', value: branch.customerKPI, color: '#F59E0B' }
                    ].map((kpi) => (
                      <div key={kpi.label} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-20">{kpi.label}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(kpi.value, 100)}%`, backgroundColor: kpi.color }}
                          />
                        </div>
                        <span className={`text-xs font-semibold w-12 text-right ${kpi.value >= 100 ? 'text-green-600' : kpi.value >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {kpi.value}%
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Revenue Info */}
                  {(branch.totalRevenue !== undefined && branch.totalRevenue > 0) && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 flex items-center gap-1"><DollarSign className="w-3 h-3" /> {t('hris.revenue')}</span>
                        <span className="font-semibold text-gray-700">Rp {(branch.totalRevenue / 1000000).toFixed(0)} Jt</span>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-500">{t('hris.transaction')}</span>
                        <span className="font-semibold text-gray-700">{(branch.transactionCount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t flex justify-between items-center text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">{branch.employeeCount} {t('hris.staff')}</span>
                      <span className="text-green-600">{branch.topPerformers} ↑</span>
                      <span className="text-red-600">{branch.lowPerformers} ↓</span>
                    </div>
                    <button onClick={() => setSelectedBranch(branch)} className="flex items-center gap-1 text-blue-600 hover:underline">
                      <Eye className="w-4 h-4" /> {t('hris.detail')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </>
            )}
          </div>
        )}

        {/* Employee KPI View */}
        {activeTab === 'dashboard' && viewMode === 'employee' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {loading ? (
              <div className="text-center py-16 text-gray-400">Memuat data KPI karyawan...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-16 text-gray-400">Tidak ada data KPI karyawan untuk periode ini</div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('hris.employee')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('hris.branch')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('hris.score')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('hris.achievement')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('hris.status')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('hris.metrics')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('hris.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.employeeId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{emp.employeeName}</p>
                          <p className="text-sm text-gray-500">{emp.position}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{emp.branchName}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-lg font-bold ${getAchievementColor(emp.overallScore)}`}>
                          {emp.overallScore}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-lg font-bold ${getAchievementColor(emp.overallAchievement)}`}>
                          {emp.overallAchievement}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(emp.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {emp.metrics.slice(0, 3).map((m, i) => (
                            <span key={i} className={`px-2 py-1 text-xs rounded ${m.actual >= m.target ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {m.name.split(' ')[0]}
                            </span>
                          ))}
                          {emp.metrics.length > 3 && <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">+{emp.metrics.length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => { setMetricEdits({}); setSelectedKPI(emp); }}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {t('hris.detail')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* KPI Detail Modal with Charts */}
        {selectedKPI && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
              <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-xl">
                <div className="flex justify-between items-start">
                  <div className="text-white">
                    <h3 className="text-xl font-bold">{selectedKPI?.employeeName}</h3>
                    <p className="text-blue-100">{selectedKPI?.position} • {selectedKPI?.branchName}</p>
                  </div>
                  <button onClick={() => setSelectedKPI(null)} className="text-white/70 hover:text-white text-2xl">×</button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {/* Summary Cards with Radial Charts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
                    {typeof window !== 'undefined' && (
                      <Chart
                        type="radialBar"
                        height={150}
                        options={{
                          chart: { sparkline: { enabled: true } },
                          plotOptions: {
                            radialBar: {
                              hollow: { size: '65%' },
                              track: { background: '#dbeafe' },
                              dataLabels: {
                                name: { show: false },
                                value: { fontSize: '24px', fontWeight: 700, color: '#2563eb', offsetY: 5 }
                              }
                            }
                          },
                          colors: ['#2563eb']
                        }}
                        series={[selectedKPI?.overallScore || 0]}
                      />
                    )}
                    <p className="text-sm text-gray-600 font-medium">Skor Keseluruhan</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
                    {typeof window !== 'undefined' && (
                      <Chart
                        type="radialBar"
                        height={150}
                        options={{
                          chart: { sparkline: { enabled: true } },
                          plotOptions: {
                            radialBar: {
                              hollow: { size: '65%' },
                              track: { background: '#dcfce7' },
                              dataLabels: {
                                name: { show: false },
                                value: { fontSize: '24px', fontWeight: 700, color: '#16a34a', offsetY: 5, formatter: (val: number) => `${val}%` }
                              }
                            }
                          },
                          colors: ['#16a34a']
                        }}
                        series={[Math.min(selectedKPI?.overallAchievement || 0, 100)]}
                      />
                    )}
                    <p className="text-sm text-gray-600 font-medium">Pencapaian</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 flex flex-col items-center justify-center">
                    <div className="mb-2">{getStatusBadge(selectedKPI?.status)}</div>
                    <p className="text-sm text-gray-600 font-medium mt-2">Status KPI</p>
                    <p className="text-xs text-gray-400 mt-1">Terakhir diperbarui: {selectedKPI?.lastUpdated}</p>
                  </div>
                </div>

                {/* Metrics Bar Chart */}
                <div className="bg-white border rounded-xl p-4">
                  <h4 className="font-semibold mb-4">Ringkasan Metrik KPI</h4>
                  {typeof window !== 'undefined' && (
                    <Chart
                      type="bar"
                      height={250}
                      options={{
                        chart: { toolbar: { show: false }, fontFamily: 'inherit' },
                        plotOptions: { 
                          bar: { 
                            horizontal: true, 
                            barHeight: '70%', 
                            borderRadius: 6,
                            distributed: true
                          } 
                        },
                        dataLabels: { 
                          enabled: true, 
                          formatter: (val: number) => `${val}%`,
                          style: { fontSize: '12px', fontWeight: 600 }
                        },
                        xaxis: { 
                          categories: selectedKPI?.metrics?.map(m => m.name) || [],
                          max: 120,
                          labels: { formatter: (val: string) => `${val}%` }
                        },
                        colors: selectedKPI?.metrics?.map(m => 
                          (m.actual / m.target) * 100 >= 100 ? '#10B981' : 
                          (m.actual / m.target) * 100 >= 80 ? '#F59E0B' : '#EF4444'
                        ) || [],
                        legend: { show: false },
                        grid: { borderColor: '#f1f1f1', xaxis: { lines: { show: true } } },
                        annotations: {
                          xaxis: [{ x: 100, borderColor: '#10B981', strokeDashArray: 4, label: { text: 'Target', style: { color: '#10B981' } } }]
                        }
                      }}
                      series={[{ data: selectedKPI?.metrics?.map(m => Math.round((m.actual / m.target) * 100)) || [] }]}
                    />
                  )}
                </div>

                {/* Detailed Metrics Cards */}
                <div>
                  <h4 className="font-semibold mb-4">Detail per Metrik</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedKPI?.metrics?.map((metric) => {
                      const achievement = (metric.actual / metric.target) * 100;
                      return (
                        <div key={metric.id} className="border rounded-xl p-4 hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-medium text-gray-900">{metric.name}</p>
                              <p className="text-xs text-gray-500">Bobot: {metric.weight}% • {CATEGORY_LABELS[metric.category] || metric.category}</p>
                            </div>
                            <div className={`flex items-center gap-1 text-sm font-semibold ${metric.trend === 'up' ? 'text-green-600' : metric.trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                              {metric.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : metric.trend === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
                              {metric.trend === 'up' ? 'Naik' : metric.trend === 'down' ? 'Turun' : 'Stabil'}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {typeof window !== 'undefined' && (
                              <Chart
                                type="radialBar"
                                height={80}
                                width={80}
                                options={{
                                  chart: { sparkline: { enabled: true } },
                                  plotOptions: {
                                    radialBar: {
                                      hollow: { size: '50%' },
                                      track: { background: '#f1f5f9' },
                                      dataLabels: {
                                        name: { show: false },
                                        value: { fontSize: '14px', fontWeight: 700, color: achievement >= 100 ? '#10B981' : achievement >= 80 ? '#F59E0B' : '#EF4444', offsetY: 5 }
                                      }
                                    }
                                  },
                                  colors: [achievement >= 100 ? '#10B981' : achievement >= 80 ? '#F59E0B' : '#EF4444']
                                }}
                                series={[Math.min(Math.round(achievement), 100)]}
                              />
                            )}
                            <div className="flex-1 space-y-2">
                              <div className="flex justify-between text-sm items-center gap-2">
                                <span className="text-gray-500">Aktual</span>
                                <input
                                  type="number"
                                  value={metricEdits[metric.id] ?? String(metric.actual)}
                                  onChange={e => setMetricEdits(prev => ({ ...prev, [metric.id]: e.target.value }))}
                                  className="w-28 px-2 py-1 border rounded text-sm text-right"
                                />
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Target</span>
                                <span className="font-medium">{formatValue(metric.target, metric.unit)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button onClick={() => { setSelectedKPI(null); setMetricEdits({}); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Tutup</button>
                  <button onClick={() => handleExportKPIPdf(selectedKPI)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <Download className="w-4 h-4" /> Ekspor PDF
                  </button>
                  <button onClick={handleSaveMetricActuals} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                    {saving ? 'Menyimpan...' : 'Simpan Aktual'}
                  </button>
                  <button onClick={() => handleEditKPI(selectedKPI)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Edit Target</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== TEMPLATES TAB ========== */}
        {activeTab === 'templates' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-lg">Template KPI Standar</h3>
              <span className="text-sm text-gray-500">{templates.length} template tersedia</span>
            </div>
            {templates.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Belum ada template KPI</p>
                <p className="text-sm mt-1">Jalankan <code className="bg-gray-100 px-1 rounded">node scripts/fix-kpi-seed.js</code> untuk seed template</p>
              </div>
            ) : (
              <div className="divide-y">
                {Object.entries(
                  templates.reduce((acc: Record<string, KPITemplate[]>, t) => {
                    if (!acc[t.category]) acc[t.category] = [];
                    acc[t.category].push(t);
                    return acc;
                  }, {})
                ).map(([cat, tpls]) => (
                  <div key={cat}>
                    <div className="px-4 py-2 bg-gray-50 flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-600'}`}>
                        {CATEGORY_LABELS[cat] || cat}
                      </span>
                      <span className="text-xs text-gray-400">{tpls.length} template</span>
                    </div>
                    {tpls.map(tpl => (
                      <div key={tpl.id} className="px-4 py-3 flex items-center gap-4 hover:bg-gray-50">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                          <Target className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{tpl.name}</p>
                          <p className="text-xs text-gray-500">{tpl.code} · {tpl.formula_type} · {tpl.measurement_frequency}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-medium">{tpl.unit}</p>
                          <p className="text-xs text-gray-400">Bobot: {tpl.default_weight}%</p>
                        </div>
                        <div className="text-xs text-gray-400 flex-shrink-0 w-20 text-right">
                          {tpl.formula?.substring(0, 20)}...
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========== ASSIGN KPI DIALOG ========== */}
        {showAssignDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-lg m-4 shadow-2xl">
              <div className="p-5 border-b flex justify-between items-center">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-green-600" /> {t('hris.assignKpi')}
                </h3>
                <button onClick={() => setShowAssignDialog(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('hris.employee')} *</label>
                  <select value={assignForm.employeeId} onChange={e => {
                    const emp = employees.find(x => x.id === e.target.value);
                    setAssignForm(f => ({
                      ...f,
                      employeeId: e.target.value,
                      branchId: emp?.branchId || '',
                    }));
                  }}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="">Pilih karyawan...</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.employeeId} — {e.name} — {e.position} — {getDepartmentLabel(e.department)} — {e.branchName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('hris.templateKpi')} *</label>
                  <select value={assignForm.templateCode} onChange={e => {
                    const tpl = templates.find(t => t.code === e.target.value);
                    setAssignForm(f => ({ ...f, templateCode: e.target.value, weight: tpl?.default_weight || 100 }));
                  }} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="">Pilih template...</option>
                    {templates.map(t => <option key={t.code} value={t.code}>[{CATEGORY_LABELS[t.category] || t.category}] {t.name} ({t.unit})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
                    <input type="number" value={assignForm.target} onChange={e => setAssignForm(f => ({ ...f, target: e.target.value }))}
                      placeholder="100" className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bobot (%)</label>
                    <input type="number" value={assignForm.weight} onChange={e => setAssignForm(f => ({ ...f, weight: parseInt(e.target.value) || 100 }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm" min={1} max={100} />
                  </div>
                </div>
                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                  Periode: <strong>{getPeriodParam()}</strong> · KPI akan otomatis ditetapkan ke karyawan untuk periode ini
                </div>
              </div>
              <div className="p-5 border-t flex justify-end gap-2">
                <button onClick={() => setShowAssignDialog(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">{t('hris.cancel')}</button>
                <button onClick={handleAssignKPI} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-2 disabled:opacity-50">
                  <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : t('hris.assignKpi')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Branch Detail Modal */}
        {selectedBranch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedBranch(null)}>
            <div className="bg-white rounded-xl w-full max-w-lg m-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">{selectedBranch.branchName}</h3>
                  <p className="text-sm text-gray-500">{selectedBranch.branchCode} • {selectedBranch.manager}</p>
                </div>
                <button onClick={() => setSelectedBranch(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-blue-50 rounded-lg p-3"><p className="text-gray-500">Penjualan</p><p className="text-xl font-bold text-blue-600">{selectedBranch.salesKPI}%</p></div>
                  <div className="bg-green-50 rounded-lg p-3"><p className="text-gray-500">Operasional</p><p className="text-xl font-bold text-green-600">{selectedBranch.operationsKPI}%</p></div>
                  <div className="bg-amber-50 rounded-lg p-3"><p className="text-gray-500">Pelanggan</p><p className="text-xl font-bold text-amber-600">{selectedBranch.customerKPI}%</p></div>
                  <div className="bg-purple-50 rounded-lg p-3"><p className="text-gray-500">Keseluruhan</p><p className="text-xl font-bold text-purple-600">{selectedBranch.overallAchievement}%</p></div>
                </div>
                <div className="text-sm text-gray-600 space-y-1 pt-2 border-t">
                  <p>{selectedBranch.employeeCount} karyawan • {selectedBranch.topPerformers} top performer • {selectedBranch.lowPerformers} perlu perhatian</p>
                  {selectedBranch.totalRevenue ? <p>Revenue: Rp {(selectedBranch.totalRevenue / 1e6).toFixed(0)} Jt • {(selectedBranch.transactionCount || 0).toLocaleString()} transaksi</p> : null}
                </div>
                <button onClick={() => { setSelectedBranch(null); setViewMode('employee'); setSearchQuery(selectedBranch.branchName); setActiveTab('dashboard'); }}
                  className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  Lihat Karyawan Cabang Ini
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========== TOAST ========== */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.message}
          </div>
        )}
      </div>
    </HQLayout>
  );
}

export { getServerSideProps } from '@/lib/humanify/require-session';
