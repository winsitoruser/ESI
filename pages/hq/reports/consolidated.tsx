import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Calendar, Download,
  RefreshCw, Building2, Users, Package, Target, Award, AlertTriangle, CheckCircle,
  ArrowUpRight, ArrowDownRight, Eye, Layers, Activity, Zap, Truck, Heart, Shield,
  FileText, Star, CircleDot
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { rowsOr, MOCK_REPORTS_CONSOLIDATED } from '@/lib/hq/mock-data';

interface ConsolidatedData {
  period: string;
  totalRevenue: number;
  totalTransactions: number;
  avgTicketSize: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  totalBranches: number;
  activeBranches: number;
  totalEmployees: number;
  activeEmployees: number;
  stockValue: number;
  lowStockAlerts: number;
}

interface BranchPerformance {
  branchId: string;
  branchName: string;
  branchCode: string;
  revenue: number;
  transactions: number;
  avgTicket: number;
  profit: number;
  margin: number;
  growth: number;
  rank: number;
  target: number;
  achievement: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const MOCK_CONSOLIDATED: ConsolidatedData = {
  period: 'Maret 2026', totalRevenue: 4250000000, totalTransactions: 18420,
  avgTicketSize: 230700, grossProfit: 1700000000, netProfit: 850000000,
  grossMargin: 40, netMargin: 20, totalBranches: 8, activeBranches: 7,
  totalEmployees: 162, activeEmployees: 148, stockValue: 1850000000, lowStockAlerts: 18,
};

const MOCK_BRANCH_PERF: BranchPerformance[] = [
  { branchId: 'b1', branchName: 'Kantor Pusat Jakarta', branchCode: 'HQ-001', revenue: 1200000000, transactions: 5200, avgTicket: 230769, profit: 480000000, margin: 40, growth: 8.5, rank: 1, target: 1100000000, achievement: 109 },
  { branchId: 'b2', branchName: 'Cabang Bandung', branchCode: 'BR-002', revenue: 850000000, transactions: 3800, avgTicket: 223684, profit: 340000000, margin: 40, growth: 12.2, rank: 2, target: 800000000, achievement: 106 },
  { branchId: 'b3', branchName: 'Cabang Surabaya', branchCode: 'BR-003', revenue: 780000000, transactions: 3400, avgTicket: 229412, profit: 312000000, margin: 40, growth: 6.8, rank: 3, target: 750000000, achievement: 104 },
  { branchId: 'b5', branchName: 'Cabang Bali', branchCode: 'BR-005', revenue: 680000000, transactions: 2900, avgTicket: 234483, profit: 272000000, margin: 40, growth: 15.3, rank: 4, target: 600000000, achievement: 113 },
  { branchId: 'b4', branchName: 'Cabang Medan', branchCode: 'BR-004', revenue: 420000000, transactions: 1820, avgTicket: 230769, profit: 168000000, margin: 40, growth: 4.2, rank: 5, target: 450000000, achievement: 93 },
  { branchId: 'b6', branchName: 'Cabang Semarang', branchCode: 'BR-006', revenue: 320000000, transactions: 1300, avgTicket: 246154, profit: 128000000, margin: 40, growth: -2.1, rank: 6, target: 350000000, achievement: 91 },
];

export default function ConsolidatedReport() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ConsolidatedData | null>(MOCK_CONSOLIDATED);
  const [branchPerformance, setBranchPerformance] = useState<BranchPerformance[]>(MOCK_BRANCH_PERF);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // Enhanced state
  const [subTab, setSubTab] = useState<'overview' | 'cross-module' | 'trends' | 'executive' | 'health'>('overview');
  const [crossModuleKPIs, setCrossModuleKPIs] = useState<any>(null);
  const [trendData, setTrendData] = useState<any>(null);
  const [executiveSummary, setExecutiveSummary] = useState<any>(null);
  const [moduleHealth, setModuleHealth] = useState<any[]>(MOCK_REPORTS_CONSOLIDATED.moduleHealth);
  const [chartTrendData, setChartTrendData] = useState<any[]>(MOCK_REPORTS_CONSOLIDATED.chartTrendData);
  const [categoryData, setCategoryData] = useState<any[]>(MOCK_REPORTS_CONSOLIDATED.categoryData);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [consolidatedRes, kpiRes] = await Promise.all([
        fetch(`/api/hq/reports/consolidated?period=${period}`),
        fetch('/api/hq/reports/enhanced?action=cross-module-kpis'),
      ]);
      if (consolidatedRes.ok) {
        const result = await consolidatedRes.json();
        const payload = result.data || result || {};
        const m = payload.metrics || {};
        setData({
          period: m.period || payload.period || '',
          totalRevenue: m.totalRevenue || 0,
          totalTransactions: m.totalTransactions || 0,
          avgTicketSize: m.avgTicketSize || m.averageTicket || 0,
          grossProfit: m.grossProfit || 0,
          netProfit: m.netProfit || 0,
          grossMargin: m.grossMargin || 0,
          netMargin: m.netMargin || 0,
          totalBranches: m.totalBranches || 0,
          activeBranches: m.activeBranches || 0,
          totalEmployees: m.totalEmployees || 0,
          activeEmployees: m.activeEmployees || 0,
          stockValue: m.stockValue || 0,
          lowStockAlerts: m.lowStockAlerts || 0,
        });
        setBranchPerformance(rowsOr(payload.branchPerformance, MOCK_BRANCH_PERF));
        setChartTrendData(rowsOr(payload.chartTrendData, MOCK_REPORTS_CONSOLIDATED.chartTrendData));
        setCategoryData(rowsOr(payload.categoryData, MOCK_REPORTS_CONSOLIDATED.categoryData));
      } else {
        setData(MOCK_CONSOLIDATED);
        setBranchPerformance(MOCK_BRANCH_PERF);
      }
      if (kpiRes.ok) {
        const kd = await kpiRes.json();
        setCrossModuleKPIs(kd.data || kd || null);
      }
    } catch (error) {
      console.error('Error fetching consolidated data:', error);
      setData(MOCK_CONSOLIDATED);
      setBranchPerformance(MOCK_BRANCH_PERF);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrends = async () => {
    try {
      const res = await fetch('/api/hq/reports/enhanced?action=trend-analysis');
      if (res.ok) { const d = await res.json(); setTrendData(d.data || null); }
    } catch (e) { console.error('Trend fetch error:', e); }
  };

  const fetchExecutive = async () => {
    try {
      const res = await fetch('/api/hq/reports/enhanced?action=executive-summary');
      if (res.ok) { const d = await res.json(); setExecutiveSummary(d.data || null); }
    } catch (e) { console.error('Executive fetch error:', e); }
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/hq/reports/enhanced?action=module-health');
      if (res.ok) { const d = await res.json(); setModuleHealth(rowsOr(d.data, MOCK_REPORTS_CONSOLIDATED.moduleHealth)); }
    } catch (e) { console.error('Health fetch error:', e); }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [period]);

  useEffect(() => {
    if (subTab === 'trends' && !trendData) fetchTrends();
    else if (subTab === 'executive' && !executiveSummary) fetchExecutive();
    else if (subTab === 'health' && moduleHealth.length === 0) fetchHealth();
  }, [subTab]);

  if (!mounted) {
    return (
      <HQLayout title={t('consolidated.title')} subtitle={t('consolidated.subtitle')}>
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </HQLayout>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(2)}M`;
    if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)}Jt`;
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  const exportReport = () => {
    const header = 'Rank,Branch,Code,Revenue,Transactions,AvgTicket,Profit,Margin,Growth,Achievement';
    const rows = branchPerformance.map(b => `${b.rank},${b.branchName},${b.branchCode},${b.revenue},${b.transactions},${b.avgTicket},${b.profit},${b.margin},${b.growth},${b.achievement}`);
    const csv = `${header}\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consolidated-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('consolidated.exportSuccess'));
  };

  const radarData = branchPerformance.slice(0, 5).map(b => ({
    branch: b.branchName.replace('Cabang ', ''),
    revenue: (b.revenue / 1000000000) * 100,
    transactions: (b.transactions / 50) ,
    margin: b.margin * 5,
    growth: Math.max(0, b.growth * 10),
    achievement: b.achievement
  }));

  if (loading || !data) {
    return (
      <HQLayout title={t('consolidated.title')} subtitle={t('consolidated.subtitle')}>
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </HQLayout>
    );
  }

  return (
    <HQLayout title={t('consolidated.title')} subtitle={`${t('consolidated.periodLabel')}: ${data.period}`}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200">
            {(['month', 'quarter', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p === 'month' ? t('consolidated.thisMonth') : p === 'quarter' ? t('consolidated.quarter') : t('consolidated.year')}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {t('consolidated.refresh')}
            </button>
            <button
              onClick={exportReport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              {t('consolidated.export')}
            </button>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {([
            { v: 'overview' as const, l: t('consolidated.tabOverview'), icon: Eye },
            { v: 'cross-module' as const, l: t('consolidated.tabCrossModule'), icon: Layers },
            { v: 'trends' as const, l: t('consolidated.tabTrends'), icon: Activity },
            { v: 'executive' as const, l: t('consolidated.tabExecutive'), icon: Star },
            { v: 'health' as const, l: t('consolidated.tabHealth'), icon: Heart },
          ]).map(st => (
            <button key={st.v} onClick={() => setSubTab(st.v)} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${subTab === st.v ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              <st.icon className="w-4 h-4" />{st.l}
            </button>
          ))}
        </div>

        {subTab === 'overview' && (<>
        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 opacity-80" />
              <span className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded-full">
                <ArrowUpRight className="w-3 h-3" />
                +8.5%
              </span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(data.totalRevenue)}</p>
            <p className="text-blue-100 mt-1">{t('consolidated.totalRevenue')}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 opacity-80" />
              <span className="text-sm bg-white/20 px-2 py-1 rounded-full">{data.netMargin}%</span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(data.netProfit)}</p>
            <p className="text-green-100 mt-1">{t('consolidated.netProfit')}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <ShoppingCart className="w-8 h-8 opacity-80" />
              <span className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded-full">
                <ArrowUpRight className="w-3 h-3" />
                +5.2%
              </span>
            </div>
            <p className="text-3xl font-bold">{data.totalTransactions.toLocaleString()}</p>
            <p className="text-purple-100 mt-1">{t('consolidated.totalTransactions')}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Target className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-3xl font-bold">{formatCurrency(data.avgTicketSize)}</p>
            <p className="text-orange-100 mt-1">{t('consolidated.avgTicketSize')}</p>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-6 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Building2 className="w-4 h-4" />
              <span className="text-sm">{t('consolidated.activeBranches')}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{data.activeBranches}/{data.totalBranches}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">{t('consolidated.employees')}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{data.activeEmployees}/{data.totalEmployees}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Package className="w-4 h-4" />
              <span className="text-sm">{t('consolidated.stockValue')}</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(data.stockValue)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">{t('consolidated.grossMargin')}</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{data.grossMargin}%</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">{t('consolidated.netMargin')}</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{data.netMargin}%</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{t('consolidated.lowStock')}</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{data.lowStockAlerts}</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{t('consolidated.revenueTrend')}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [`Rp ${value} Jt`, '']} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="target" name="Target" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{t('consolidated.salesDistribution')}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string, props: any) => [
                    `${value}% - ${formatCurrency(props.payload.revenue)}`, t('consolidated.contribution')
                  ]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Branch Performance Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">{t('consolidated.branchPerformance')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-center py-3 px-4 font-medium text-gray-500 w-12">#</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">{t('consolidated.branch')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('consolidated.revenue')}</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">{t('consolidated.transactions')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('consolidated.avgTicket')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">{t('consolidated.profit')}</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">{t('consolidated.growth')}</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">{t('consolidated.achievement')}</th>
                </tr>
              </thead>
              <tbody>
                {branchPerformance.map((branch, index) => (
                  <tr key={branch.branchId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-center">
                      {index < 3 ? (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-sm font-bold ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                        }`}>
                          {index + 1}
                        </span>
                      ) : (
                        <span className="text-gray-500">{index + 1}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Building2 className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{branch.branchName}</p>
                          <p className="text-sm text-gray-500">{branch.branchCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(branch.revenue)}</td>
                    <td className="py-3 px-4 text-center">{branch.transactions.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(branch.avgTicket)}</td>
                    <td className="py-3 px-4 text-right text-green-600 font-medium">{formatCurrency(branch.profit)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        branch.growth >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {branch.growth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(branch.growth)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${branch.achievement >= 100 ? 'bg-green-500' : branch.achievement >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(branch.achievement, 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${branch.achievement >= 100 ? 'text-green-600' : 'text-gray-600'}`}>
                          {branch.achievement}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">{t('consolidated.executiveSummaryTitle')}</h3>
              <p className="text-blue-100">
                Total revenue {data.period} mencapai {formatCurrency(data.totalRevenue)} dengan {data.totalTransactions.toLocaleString()} transaksi. 
                Net profit margin {data.netMargin}% dengan {branchPerformance.filter(b => b.achievement >= 100).length} dari {branchPerformance.length} cabang mencapai target.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{branchPerformance.filter(b => b.achievement >= 100).length}</p>
                <p className="text-sm text-blue-200">{t('consolidated.branchOnTarget')}</p>
              </div>
              <div className="w-px h-12 bg-white/30" />
              <div className="text-center">
                <p className="text-3xl font-bold">{Math.round(branchPerformance.reduce((s, b) => s + b.achievement, 0) / branchPerformance.length)}%</p>
                <p className="text-sm text-blue-200">{t('consolidated.avgAchievement')}</p>
              </div>
            </div>
          </div>
        </div>
        </>)}

        {/* ─── Cross-Module KPIs Tab ─── */}
        {subTab === 'cross-module' && crossModuleKPIs && (
          <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-sm text-indigo-700"><strong>{t('consolidated.tabCrossModule')}</strong>: {t('consolidated.crossModuleDesc')}</p>
            </div>

            {/* Sales KPIs */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> {t('consolidated.sales')}</h3>
              <div className="grid grid-cols-5 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">{t('consolidated.revenueMtd')}</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(crossModuleKPIs.sales.revenueMTD)}</p>
                  <p className={`text-xs ${crossModuleKPIs.sales.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>{crossModuleKPIs.sales.revenueGrowth >= 0 ? '+' : ''}{crossModuleKPIs.sales.revenueGrowth}% MoM</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">{t('consolidated.transactions')}</p>
                  <p className="text-xl font-bold text-gray-900">{crossModuleKPIs.sales.totalTransactions.toLocaleString()}</p>
                  <p className={`text-xs ${crossModuleKPIs.sales.transactionsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>{crossModuleKPIs.sales.transactionsGrowth >= 0 ? '+' : ''}{crossModuleKPIs.sales.transactionsGrowth}%</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">{t('consolidated.avgTicket')}</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(crossModuleKPIs.sales.avgTicketSize)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">{t('consolidated.conversion')}</p>
                  <p className="text-xl font-bold text-blue-600">{crossModuleKPIs.sales.conversionRate}%</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">{t('consolidated.returnsRate')}</p>
                  <p className="text-xl font-bold text-orange-600">{crossModuleKPIs.sales.returnsRate}%</p>
                </div>
              </div>
            </div>

            {/* Finance KPIs */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4" /> {t('consolidated.finance')}</h3>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: t('consolidated.grossProfit'), value: formatCurrency(crossModuleKPIs.finance.grossProfit), sub: `${crossModuleKPIs.finance.grossMargin}% margin` },
                  { label: t('consolidated.netProfit'), value: formatCurrency(crossModuleKPIs.finance.netProfit), sub: `${crossModuleKPIs.finance.netMargin}% margin` },
                  { label: t('consolidated.opEx'), value: formatCurrency(crossModuleKPIs.finance.operatingExpenses), sub: `${crossModuleKPIs.finance.expenseRatio}% ratio` },
                  { label: t('consolidated.cashFlow'), value: formatCurrency(crossModuleKPIs.finance.cashFlow), sub: `+${crossModuleKPIs.finance.cashFlowGrowth}%` },
                  { label: t('consolidated.arAp'), value: `${formatCurrency(crossModuleKPIs.finance.accountsReceivable)}`, sub: `AP: ${formatCurrency(crossModuleKPIs.finance.accountsPayable)}` },
                ].map(k => (
                  <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500">{k.label}</p>
                    <p className="text-lg font-bold text-gray-900">{k.value}</p>
                    <p className="text-xs text-gray-400">{k.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Inventory KPIs */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Package className="w-4 h-4" /> {t('consolidated.inventory')}</h3>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: t('consolidated.stockValue'), value: formatCurrency(crossModuleKPIs.inventory.totalStockValue), color: 'text-gray-900' },
                  { label: t('consolidated.turnover'), value: `${crossModuleKPIs.inventory.stockTurnover}x`, color: 'text-blue-600' },
                  { label: t('consolidated.fillRate'), value: `${crossModuleKPIs.inventory.fillRate}%`, color: 'text-green-600' },
                  { label: t('consolidated.daysOnHand'), value: `${crossModuleKPIs.inventory.daysOnHand}`, color: 'text-purple-600' },
                ].map(k => (
                  <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500">{k.label}</p>
                    <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-4 mt-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div><p className="text-sm font-medium text-yellow-800">{crossModuleKPIs.inventory.lowStockAlerts} {t('consolidated.lowStock')}</p></div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div><p className="text-sm font-medium text-red-800">{crossModuleKPIs.inventory.outOfStock} {t('consolidated.outOfStock')}</p></div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                  <Package className="w-5 h-5 text-gray-500" />
                  <div><p className="text-sm font-medium text-gray-700">{crossModuleKPIs.inventory.deadStock} {t('consolidated.deadStock')}</p></div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-3">
                  <TrendingDown className="w-5 h-5 text-orange-600" />
                  <div><p className="text-sm font-medium text-orange-800">{crossModuleKPIs.inventory.shrinkageRate}% {t('consolidated.shrinkage')}</p></div>
                </div>
              </div>
            </div>

            {/* Procurement KPIs */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Truck className="w-4 h-4" /> {t('consolidated.procurement')}</h3>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: t('consolidated.totalPos'), value: crossModuleKPIs.procurement.totalPOs, sub: `${crossModuleKPIs.procurement.activePOs} ${t('consolidated.active').toLowerCase()}` },
                  { label: t('consolidated.totalSpend'), value: formatCurrency(crossModuleKPIs.procurement.totalSpend), sub: `MTD: ${formatCurrency(crossModuleKPIs.procurement.spendMTD)}` },
                  { label: t('consolidated.onTimeDelivery'), value: `${crossModuleKPIs.procurement.onTimeDelivery}%`, sub: `${crossModuleKPIs.procurement.activeSuppliers} suppliers` },
                  { label: t('consolidated.avgLeadTime'), value: `${crossModuleKPIs.procurement.avgLeadTime} ${t('consolidated.days')}`, sub: `Fulfillment: ${crossModuleKPIs.procurement.fulfillmentRate}%` },
                ].map(k => (
                  <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500">{k.label}</p>
                    <p className="text-xl font-bold text-gray-900">{k.value}</p>
                    <p className="text-xs text-gray-400">{k.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* HR & Branches */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> {t('consolidated.hr')}</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: t('consolidated.employees'), value: `${crossModuleKPIs.hr.activeEmployees}/${crossModuleKPIs.hr.totalEmployees}` },
                    { label: t('consolidated.attendance'), value: `${crossModuleKPIs.hr.attendanceRate}%` },
                    { label: t('consolidated.turnover'), value: `${crossModuleKPIs.hr.turnoverRate}%` },
                  ].map(k => (
                    <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-3">
                      <p className="text-xs text-gray-500">{k.label}</p>
                      <p className="text-lg font-bold text-gray-900">{k.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Building2 className="w-4 h-4" /> {t('consolidated.branches')}</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: t('consolidated.active'), value: `${crossModuleKPIs.branches.activeBranches}/${crossModuleKPIs.branches.totalBranches}` },
                    { label: t('consolidated.onTarget'), value: `${crossModuleKPIs.branches.onTargetBranches}` },
                    { label: t('consolidated.avgAchievement'), value: `${crossModuleKPIs.branches.avgAchievement}%` },
                  ].map(k => (
                    <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-3">
                      <p className="text-xs text-gray-500">{k.label}</p>
                      <p className="text-lg font-bold text-gray-900">{k.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={() => {
              const lines: string[] = ['Module,Metric,Value'];
              if (crossModuleKPIs) {
                for (const [mod, metrics] of Object.entries(crossModuleKPIs)) {
                  for (const [key, val] of Object.entries(metrics as Record<string, any>)) {
                    lines.push(`${mod},${key},${val}`);
                  }
                }
              }
              const csv = lines.join('\n');
              const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'cross-module-kpis.csv'; a.click(); URL.revokeObjectURL(url);
              toast.success(t('consolidated.exportKpiSuccess'));
            }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Download className="w-4 h-4" /> {t('consolidated.exportKpis')}
            </button>
          </div>
        )}

        {/* ─── Trend Analysis Tab ─── */}
        {subTab === 'trends' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm text-green-700"><strong>{t('consolidated.tabTrends')}</strong>: {t('consolidated.trendDesc')}</p>
            </div>
            {trendData ? (
              <>
                {/* Revenue Trend */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('consolidated.revenueProfitTrend')}</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trendData.revenueTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => [`${value} Jt`, '']} />
                        <Legend />
                        <Bar dataKey="revenue" name="Revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        <Line type="monotone" dataKey="profit" name="Profit" stroke="#10B981" strokeWidth={2} />
                        <Line type="monotone" dataKey="target" name="Target" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Inventory Trend */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('consolidated.inventoryHealthTrend')}</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trendData.inventoryTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="stockValue" name="Stock Value (Jt)" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="turnover" name="Turnover" stroke="#F59E0B" strokeWidth={2} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Procurement Trend */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('consolidated.procurementTrend')}</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trendData.procurementTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" domain={[80, 100]} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="spend" name="Spend (Jt)" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="onTimeRate" name="On-Time %" stroke="#EF4444" strokeWidth={2} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* HR Trend */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('consolidated.hrTrend')}</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData.hrTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="headcount" name="Headcount" stroke="#3B82F6" strokeWidth={2} />
                        <Line type="monotone" dataKey="attendance" name="Attendance %" stroke="#10B981" strokeWidth={2} />
                        <Line type="monotone" dataKey="productivity" name="Productivity" stroke="#F59E0B" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">{t('consolidated.loadingTrend')}</div>
            )}
          </div>
        )}

        {/* ─── Executive Summary Tab ─── */}
        {subTab === 'executive' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-700"><strong>{t('consolidated.tabExecutive')}</strong>: {t('consolidated.executiveDesc')}</p>
            </div>
            {executiveSummary ? (
              <>
                {/* Scorecard */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">{t('consolidated.moduleScorecard')}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{t('consolidated.overallScore')}:</span>
                      <span className={`text-2xl font-bold ${executiveSummary.scorecard.overallScore >= 85 ? 'text-green-600' : executiveSummary.scorecard.overallScore >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {executiveSummary.scorecard.overallScore}/100
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-6 gap-4">
                    {executiveSummary.scorecard.modules.map((m: any) => (
                      <div key={m.name} className="text-center">
                        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-lg font-bold text-white ${
                          m.score >= 85 ? 'bg-green-500' : m.score >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}>
                          {m.score}
                        </div>
                        <p className="text-sm font-medium text-gray-900 mt-2">{m.name}</p>
                        <p className={`text-xs ${m.trend === 'up' ? 'text-green-600' : m.trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                          {m.trend === 'up' ? `↑ ${t('consolidated.improving')}` : m.trend === 'down' ? `↓ ${t('consolidated.declining')}` : `→ ${t('consolidated.stable')}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Radar Chart */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('consolidated.performanceRadar')}</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={executiveSummary.scorecard.modules.map((m: any) => ({ module: m.name, score: m.score }))}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="module" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Radar name="Score" dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Highlights */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('consolidated.highlights')}</h3>
                  <div className="space-y-3">
                    {executiveSummary.highlights.map((h: any, i: number) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
                        h.type === 'positive' ? 'bg-green-50 border border-green-200' :
                        h.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                        'bg-red-50 border border-red-200'
                      }`}>
                        {h.type === 'positive' ? <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" /> :
                         h.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" /> :
                         <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{h.module}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${h.impact === 'high' ? 'bg-red-100 text-red-700' : h.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{h.impact}</span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{h.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('consolidated.recommendations')}</h3>
                  <div className="space-y-3">
                    {executiveSummary.recommendations.map((r: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg">
                        <span className={`px-2 py-1 text-xs font-bold rounded ${
                          r.priority === 'high' ? 'bg-red-100 text-red-700' :
                          r.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>{r.priority.toUpperCase()}</span>
                        <div>
                          <p className="text-sm text-gray-700">{r.action}</p>
                          <p className="text-xs text-gray-400 mt-1">Module: {r.module}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">{t('consolidated.loadingExecutive')}</div>
            )}
          </div>
        )}

        {/* ─── Module Health Tab ─── */}
        {subTab === 'health' && (
          <div className="space-y-6">
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <p className="text-sm text-teal-700"><strong>{t('consolidated.tabHealth')}</strong>: {t('consolidated.healthDesc')}</p>
            </div>
            {moduleHealth.length > 0 ? (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">{t('consolidated.modules')}</p>
                    <p className="text-2xl font-bold text-gray-900">{moduleHealth.length}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">{t('consolidated.healthy')}</p>
                    <p className="text-2xl font-bold text-green-600">{moduleHealth.filter(m => m.status === 'healthy').length}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">{t('consolidated.avgUptime')}</p>
                    <p className="text-2xl font-bold text-blue-600">{(moduleHealth.reduce((s, m) => s + m.uptime, 0) / moduleHealth.length).toFixed(2)}%</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">{t('consolidated.avgLatency')}</p>
                    <p className="text-2xl font-bold text-purple-600">{Math.round(moduleHealth.reduce((s, m) => s + m.latency, 0) / moduleHealth.length)}ms</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('consolidated.module')}</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('consolidated.status')}</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('consolidated.uptime')}</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('consolidated.latency')}</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('consolidated.errorRate')}</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('consolidated.lastIncident')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {moduleHealth.map((m: any) => (
                          <tr key={m.module} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{m.module}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                m.status === 'healthy' ? 'bg-green-100 text-green-700' :
                                m.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                <CircleDot className="w-3 h-3" />
                                {m.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-sm font-medium ${m.uptime >= 99.8 ? 'text-green-600' : m.uptime >= 99.5 ? 'text-yellow-600' : 'text-red-600'}`}>{m.uptime}%</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-sm font-medium ${m.latency <= 120 ? 'text-green-600' : m.latency <= 160 ? 'text-yellow-600' : 'text-red-600'}`}>{m.latency}ms</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-sm font-medium ${m.errorRate <= 0.5 ? 'text-green-600' : m.errorRate <= 1.0 ? 'text-yellow-600' : 'text-red-600'}`}>{m.errorRate}%</span>
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-500">{m.lastIncident || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Uptime bar chart */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">{t('consolidated.uptimeByModule')}</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={moduleHealth} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[99, 100]} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="module" tick={{ fontSize: 11 }} width={120} />
                        <Tooltip />
                        <Bar dataKey="uptime" name="Uptime %" fill="#10B981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">{t('consolidated.loadingHealth')}</div>
            )}
          </div>
        )}
      </div>
    </HQLayout>
  );
}
