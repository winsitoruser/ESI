import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { 
  Target, TrendingUp, TrendingDown, Award, Users, 
  Building2, Calendar, Filter, Download, ChevronDown,
  AlertCircle, CheckCircle, Clock, BarChart3, PieChart, Eye,
  Plus, Save, Trash2, X, Search, FileText, Briefcase, DollarSign, UserPlus
} from 'lucide-react';
import dynamic from 'next/dynamic';

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
  data_type: string;
  formula_type: string;
  formula: string;
  default_weight: number;
  measurement_frequency: string;
  is_active: boolean;
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


const MOCK_BRANCH_KPIS: BranchKPI[] = [
  { branchId: '1', branchName: 'Kantor Pusat Jakarta', branchCode: 'HQ-001', manager: 'Ahmad Wijaya', overallAchievement: 92, salesKPI: 95, operationsKPI: 88, customerKPI: 90, employeeCount: 35, topPerformers: 12, lowPerformers: 2, totalRevenue: 1350000000, transactionCount: 4520 },
  { branchId: '2', branchName: 'Cabang Bandung', branchCode: 'BR-002', manager: 'Siti Rahayu', overallAchievement: 88, salesKPI: 90, operationsKPI: 85, customerKPI: 88, employeeCount: 24, topPerformers: 8, lowPerformers: 3, totalRevenue: 980000000, transactionCount: 3210 },
  { branchId: '3', branchName: 'Cabang Surabaya', branchCode: 'BR-003', manager: 'Budi Santoso', overallAchievement: 78, salesKPI: 75, operationsKPI: 80, customerKPI: 82, employeeCount: 22, topPerformers: 5, lowPerformers: 5, totalRevenue: 820000000, transactionCount: 2890 },
  { branchId: '5', branchName: 'Cabang Bali', branchCode: 'BR-005', manager: 'Made Wirawan', overallAchievement: 95, salesKPI: 98, operationsKPI: 92, customerKPI: 94, employeeCount: 18, topPerformers: 8, lowPerformers: 1, totalRevenue: 1050000000, transactionCount: 3680 },
  { branchId: '4', branchName: 'Cabang Medan', branchCode: 'BR-004', manager: 'Dewi Lestari', overallAchievement: 82, salesKPI: 80, operationsKPI: 84, customerKPI: 83, employeeCount: 20, topPerformers: 6, lowPerformers: 4, totalRevenue: 710000000, transactionCount: 2450 },
  { branchId: '7', branchName: 'Cabang Semarang', branchCode: 'BR-007', manager: 'Putri Maharani', overallAchievement: 85, salesKPI: 87, operationsKPI: 82, customerKPI: 86, employeeCount: 16, topPerformers: 5, lowPerformers: 2, totalRevenue: 760000000, transactionCount: 2680 },
];

const MOCK_EMPLOYEE_KPIS: EmployeeKPI[] = [
  { employeeId: 'EMP-001', employeeName: 'Ahmad Wijaya', position: 'General Manager', branchName: 'Kantor Pusat Jakarta', department: 'MANAGEMENT', overallScore: 94, overallAchievement: 94, metrics: [{ id: 'k1', name: 'Revenue Target', category: 'sales', target: 1200000000, actual: 1350000000, unit: 'Rp', weight: 40, trend: 'up', period: '2026-03' }], status: 'exceeded', lastUpdated: '2026-03-12' },
  { employeeId: 'EMP-002', employeeName: 'Siti Rahayu', position: 'Branch Manager', branchName: 'Cabang Bandung', department: 'OPERATIONS', overallScore: 88, overallAchievement: 88, metrics: [{ id: 'k2', name: 'Revenue Target', category: 'sales', target: 900000000, actual: 980000000, unit: 'Rp', weight: 40, trend: 'up', period: '2026-03' }], status: 'achieved', lastUpdated: '2026-03-12' },
  { employeeId: 'EMP-010', employeeName: 'Fajar Setiawan', position: 'Sales Supervisor', branchName: 'Cabang Bandung', department: 'SALES', overallScore: 72, overallAchievement: 72, metrics: [{ id: 'k3', name: 'Sales Target', category: 'sales', target: 500000000, actual: 360000000, unit: 'Rp', weight: 50, trend: 'down', period: '2026-03' }], status: 'partial', lastUpdated: '2026-03-12' },
  { employeeId: 'EMP-007', employeeName: 'Made Wirawan', position: 'Branch Manager', branchName: 'Cabang Bali', department: 'OPERATIONS', overallScore: 96, overallAchievement: 96, metrics: [{ id: 'k4', name: 'Revenue Target', category: 'sales', target: 900000000, actual: 1050000000, unit: 'Rp', weight: 40, trend: 'up', period: '2026-03' }], status: 'exceeded', lastUpdated: '2026-03-12' },
  { employeeId: 'EMP-006', employeeName: 'Lisa Permata', position: 'Finance Manager', branchName: 'Kantor Pusat Jakarta', department: 'FINANCE', overallScore: 90, overallAchievement: 90, metrics: [{ id: 'k5', name: 'Financial Accuracy', category: 'financial', target: 99, actual: 99.5, unit: '%', weight: 50, trend: 'stable', period: '2026-03' }], status: 'achieved', lastUpdated: '2026-03-12' },
];

const MOCK_KPI_TEMPLATES: KPITemplate[] = [
  { id: 'tpl1', code: 'REV_TARGET', name: 'Revenue Target', category: 'sales', unit: 'Rp', data_type: 'currency', formula_type: 'actual_vs_target', formula: '(actual/target)*100', default_weight: 40, measurement_frequency: 'monthly', is_active: true },
  { id: 'tpl2', code: 'CUST_SAT', name: 'Customer Satisfaction', category: 'customer', unit: '%', data_type: 'percentage', formula_type: 'actual_vs_target', formula: '(actual/target)*100', default_weight: 20, measurement_frequency: 'monthly', is_active: true },
  { id: 'tpl3', code: 'OPS_EFF', name: 'Operational Efficiency', category: 'operations', unit: '%', data_type: 'percentage', formula_type: 'actual_vs_target', formula: '(actual/target)*100', default_weight: 20, measurement_frequency: 'monthly', is_active: true },
  { id: 'tpl4', code: 'FIN_ACC', name: 'Financial Accuracy', category: 'financial', unit: '%', data_type: 'percentage', formula_type: 'actual_vs_target', formula: '(actual/target)*100', default_weight: 20, measurement_frequency: 'quarterly', is_active: true },
];

export default function KPIDashboard() {
  const { t } = useTranslation();
  const CATEGORY_LABELS = getCategoryLabels(t);
  const [mounted, setMounted] = useState(false);
  const [employeeKPIs, setEmployeeKPIs] = useState<EmployeeKPI[]>([]);
  const [branchKPIs, setBranchKPIs] = useState<BranchKPI[]>([]);
  const [templates, setTemplates] = useState<KPITemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'templates' | 'assign'>('dashboard');
  const [viewMode, setViewMode] = useState<'employee' | 'branch'>('branch');
  const [periodFilter, setPeriodFilter] = useState('current');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKPI, setSelectedKPI] = useState<EmployeeKPI | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignForm, setAssignForm] = useState({ employeeId: '', branchId: '', templateCode: '', target: '', weight: 100 });
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
    setAssignForm({
      employeeId: kpi.employeeId || '',
      branchId: '',
      templateCode: firstMetric?.name || '',
      target: String(firstMetric?.target || ''),
      weight: Number(firstMetric?.weight || 100)
    });
    setSelectedKPI(null);
    setShowAssignDialog(true);
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
      const response = await fetch(`/api/hq/hris/kpi?period=${p}`);
      if (response.ok) {
        const data = await response.json();
        setEmployeeKPIs(data.employeeKPIs || []);
        setBranchKPIs(data.branchKPIs || []);
        if (data.templates) setTemplates(data.templates);
      } else {
        setEmployeeKPIs(MOCK_EMPLOYEE_KPIS);
        setBranchKPIs(MOCK_BRANCH_KPIS);
        setTemplates(MOCK_KPI_TEMPLATES);
      }
    } catch (error) {
      console.error('Failed to fetch KPI data:', error);
      setEmployeeKPIs(MOCK_EMPLOYEE_KPIS);
      setBranchKPIs(MOCK_BRANCH_KPIS);
      setTemplates(MOCK_KPI_TEMPLATES);
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
      list = list.filter(e => e.employeeName.toLowerCase().includes(q) || e.position.toLowerCase().includes(q) || e.branchName.toLowerCase().includes(q));
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
    try {
      const res = await fetch('/api/hq/hris/kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: assignForm.employeeId,
          branchId: assignForm.branchId || null,
          period: getPeriodParam(),
          metrics: [{
            name: tpl.name, category: tpl.category, target: parseFloat(assignForm.target) || 100,
            unit: tpl.unit, weight: assignForm.weight, templateId: tpl.id
          }]
        })
      });
      if (res.ok) {
        showToast('success', t('hris.kpiAssignSuccess'));
        setShowAssignDialog(false);
        setAssignForm({ employeeId: '', branchId: '', templateCode: '', target: '', weight: 100 });
        fetchData();
      } else {
        const err = await res.json();
        showToast('error', err.error || t('hris.kpiAssignFailed'));
      }
    } catch { showToast('error', t('hris.serverError')); }
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
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('hris.avgAchievement')}</p>
                <p className="text-xl font-bold">{avgAchievement.toFixed(0)}%</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('hris.exceeded')}</p>
                <p className="text-xl font-bold">{exceededCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('hris.achieved')}</p>
                <p className="text-xl font-bold">{achievedCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('hris.partial')}</p>
                <p className="text-xl font-bold">{partialCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('hris.notAchieved')}</p>
                <p className="text-xl font-bold">{notAchievedCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('hris.totalEmployees')}</p>
                <p className="text-xl font-bold">{totalEmployees}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <div className="flex gap-2">
              <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <BarChart3 className="w-4 h-4 inline mr-2" />{t('hris.dashboard')}
              </button>
              <button onClick={() => setActiveTab('templates')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'templates' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <FileText className="w-4 h-4 inline mr-2" />{t('hris.templateKpi')} ({templates.length})
              </button>
              <button onClick={() => { setShowAssignDialog(true); }} className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700">
                <UserPlus className="w-4 h-4 inline mr-2" />{t('hris.assignKpi')}
              </button>
            </div>
            <div className="flex gap-2">
              <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                <option value="current">{t('hris.thisMonth')}</option>
                <option value="last">{t('hris.lastMonth')}</option>
              </select>
              <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
                <Download className="w-4 h-4" />{t('hris.exportCsv')}
              </button>
            </div>
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
                    <button className="flex items-center gap-1 text-blue-600 hover:underline">
                      <Eye className="w-4 h-4" /> {t('hris.detail')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Employee KPI View */}
        {activeTab === 'dashboard' && viewMode === 'employee' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
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
                          onClick={() => setSelectedKPI(emp)}
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
                            <div className="flex-1">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-500">Aktual</span>
                                <span className="font-medium">{formatValue(metric.actual, metric.unit)}</span>
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
                  <button onClick={() => handleExportKPIPdf(selectedKPI)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <Download className="w-4 h-4" /> Ekspor PDF
                  </button>
                  <button onClick={() => handleEditKPI(selectedKPI)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Edit KPI</button>
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
                  <select value={assignForm.employeeId} onChange={e => setAssignForm(f => ({ ...f, employeeId: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="">Pilih karyawan...</option>
                    {employeeKPIs.map(e => <option key={e.employeeId} value={e.employeeId}>{e.employeeName} - {e.position}</option>)}
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
                <button onClick={handleAssignKPI} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-2">
                  <Save className="w-4 h-4" /> {t('hris.assignKpi')}
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
