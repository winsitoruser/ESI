import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  BarChart3, ShoppingCart, DollarSign, Package, Users, Truck, Layers,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw,
  Download, Calendar, FileText, Eye, Search, Filter, Clock, CheckCircle,
  AlertTriangle, Star, Activity, Zap, ChevronRight, Grid3X3, List,
  Settings, PieChart as PieChartIcon, UserCheck
} from 'lucide-react';

interface ModuleKPI {
  label: string;
  value: number;
  format: string;
  change: number;
  invertColor?: boolean;
}

interface ReportModule {
  id: string;
  name: string;
  icon: string;
  color: string;
  href: string;
  kpis: ModuleKPI[];
}

interface QuickStats {
  totalRevenue: number;
  revenueGrowth: number;
  totalTransactions: number;
  transactionGrowth: number;
  totalCustomers: number;
  customerGrowth: number;
  activeBranches: number;
  totalBranches: number;
  netProfit: number;
  profitGrowth: number;
  employeeCount: number;
  avgAttendance: number;
}

interface RecentReport {
  id: number;
  name: string;
  type: string;
  date: string;
  status: string;
}

const ICON_MAP: Record<string, any> = {
  ShoppingCart, DollarSign, Package, Users, Truck, Layers, BarChart3, UserCheck
};

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; gradient: string; light: string }> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200', gradient: 'from-blue-500 to-blue-700', light: 'bg-blue-50' },
  green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200', gradient: 'from-green-500 to-green-700', light: 'bg-green-50' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200', gradient: 'from-purple-500 to-purple-700', light: 'bg-purple-50' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200', gradient: 'from-orange-500 to-orange-700', light: 'bg-orange-50' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200', gradient: 'from-teal-500 to-teal-700', light: 'bg-teal-50' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200', gradient: 'from-indigo-500 to-indigo-700', light: 'bg-indigo-50' },
  rose: { bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-200', gradient: 'from-rose-500 to-rose-700', light: 'bg-rose-50' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-200', gradient: 'from-cyan-500 to-cyan-700', light: 'bg-cyan-50' },
};

export default function ReportsHub() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<ReportModule[]>([]);
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hq/reports/comprehensive?section=overview');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setModules(data.modules || []);
        setQuickStats(data.quickStats || null);
        setRecentReports(data.recentReports || []);
        if (selectedModules.length === 0 && data.modules) {
          setSelectedModules(data.modules.map((m: ReportModule) => m.id));
        }
      }
    } catch (error) {
      console.error('Error fetching reports hub:', error);
      toast.error('Gagal memuat data laporan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('report-selected-modules');
    if (saved) {
      try { setSelectedModules(JSON.parse(saved)); } catch {}
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedModules.length > 0) {
      localStorage.setItem('report-selected-modules', JSON.stringify(selectedModules));
    }
  }, [selectedModules]);

  if (!mounted) {
    return (
      <HQLayout title="Pusat Laporan" subtitle="Laporan komprehensif seluruh modul">
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </HQLayout>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)}M`;
    if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)}Jt`;
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency': return formatCurrency(value);
      case 'percent': return `${value}%`;
      case 'decimal': return `${value.toFixed(1)}x`;
      default: return value.toLocaleString('id-ID');
    }
  };

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(m => m !== moduleId)
        : [...prev, moduleId]
    );
  };

  const filteredModules = modules.filter(m =>
    selectedModules.includes(m.id) &&
    (searchTerm === '' || m.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getIcon = (iconName: string) => ICON_MAP[iconName] || BarChart3;
  const getColor = (color: string) => COLOR_MAP[color] || COLOR_MAP.blue;

  const exportAllReports = () => {
    const lines = ['Module,KPI,Value,Change (%)'];
    modules.forEach(m => {
      m.kpis.forEach(k => {
        lines.push(`${m.name},${k.label},${formatValue(k.value, k.format)},${k.change}`);
      });
    });
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-reports-summary-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export ringkasan laporan berhasil');
  };

  return (
    <HQLayout title="Pusat Laporan" subtitle="Laporan komprehensif seluruh modul ERP">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari laporan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <button
              onClick={() => setShowWidgetSelector(!showWidgetSelector)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                showWidgetSelector ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Settings className="w-4 h-4" />
              Widget
            </button>
            <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={exportAllReports}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Export Semua
            </button>
          </div>
        </div>

        {/* Widget Selector Panel */}
        {showWidgetSelector && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Pilih Modul Laporan</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedModules(modules.map(m => m.id))}
                  className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                >
                  Pilih Semua
                </button>
                <button
                  onClick={() => setSelectedModules([])}
                  className="text-xs px-3 py-1 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  Hapus Semua
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {modules.map(m => {
                const color = getColor(m.color);
                const Icon = getIcon(m.icon);
                const selected = selectedModules.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleModule(m.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      selected
                        ? `${color.light} ${color.border} ${color.text}`
                        : 'bg-gray-50 border-gray-200 text-gray-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {m.name}
                    {selected && <CheckCircle className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Stats Overview */}
        {quickStats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Revenue', value: formatCurrency(quickStats.totalRevenue), change: quickStats.revenueGrowth, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Net Profit', value: formatCurrency(quickStats.netProfit), change: quickStats.profitGrowth, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Transaksi', value: quickStats.totalTransactions.toLocaleString(), change: quickStats.transactionGrowth, icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Pelanggan', value: quickStats.totalCustomers.toLocaleString(), change: quickStats.customerGrowth, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: 'Karyawan', value: `${quickStats.employeeCount}`, change: quickStats.avgAttendance, icon: UserCheck, color: 'text-teal-600', bg: 'bg-teal-50' },
              { label: 'Cabang Aktif', value: `${quickStats.activeBranches}/${quickStats.totalBranches}`, change: 0, icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <span className="text-xs text-gray-500">{stat.label}</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                {stat.change !== 0 && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${stat.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {stat.change >= 0 ? '+' : ''}{stat.change}%
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Module Report Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredModules.map((mod) => {
              const Icon = getIcon(mod.icon);
              const color = getColor(mod.color);
              return (
                <Link
                  key={mod.id}
                  href={mod.href}
                  className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-blue-200 transition-all duration-200 overflow-hidden"
                >
                  <div className={`h-1.5 bg-gradient-to-r ${color.gradient}`} />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${color.bg}`}>
                          <Icon className={`w-5 h-5 ${color.text}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {mod.name}
                          </h3>
                          <p className="text-xs text-gray-400">Laporan {mod.name}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {mod.kpis.map((kpi) => {
                        const isPositive = kpi.invertColor ? kpi.change < 0 : kpi.change >= 0;
                        return (
                          <div key={kpi.label} className="bg-gray-50 rounded-lg p-2.5">
                            <p className="text-xs text-gray-500 truncate">{kpi.label}</p>
                            <p className="text-sm font-bold text-gray-900 mt-0.5">
                              {formatValue(kpi.value, kpi.format)}
                            </p>
                            {kpi.change !== 0 && (
                              <p className={`text-xs mt-0.5 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                {kpi.change >= 0 ? '+' : ''}{kpi.change}%
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Modul Laporan</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">KPI 1</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">KPI 2</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">KPI 3</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">KPI 4</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredModules.map((mod) => {
                  const Icon = getIcon(mod.icon);
                  const color = getColor(mod.color);
                  return (
                    <tr key={mod.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${color.bg}`}>
                            <Icon className={`w-4 h-4 ${color.text}`} />
                          </div>
                          <span className="font-medium text-gray-900">{mod.name}</span>
                        </div>
                      </td>
                      {mod.kpis.map((kpi, i) => (
                        <td key={i} className="py-3 px-4 text-right">
                          <p className="text-xs text-gray-400">{kpi.label}</p>
                          <p className="text-sm font-semibold text-gray-900">{formatValue(kpi.value, kpi.format)}</p>
                          {kpi.change !== 0 && (
                            <p className={`text-xs ${(kpi.invertColor ? kpi.change < 0 : kpi.change >= 0) ? 'text-green-600' : 'text-red-600'}`}>
                              {kpi.change >= 0 ? '+' : ''}{kpi.change}%
                            </p>
                          )}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={mod.href}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Lihat
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent Reports & Quick Access */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Reports */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                Laporan Terbaru
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {recentReports.map((report) => {
                const typeColors: Record<string, string> = {
                  sales: 'bg-blue-100 text-blue-700',
                  finance: 'bg-green-100 text-green-700',
                  inventory: 'bg-purple-100 text-purple-700',
                  hris: 'bg-teal-100 text-teal-700',
                  procurement: 'bg-indigo-100 text-indigo-700',
                  customers: 'bg-orange-100 text-orange-700',
                };
                return (
                  <div key={report.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{report.name}</p>
                        <p className="text-xs text-gray-400">{new Date(report.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[report.type] || 'bg-gray-100 text-gray-700'}`}>
                        {report.type}
                      </span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Access Links */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Akses Cepat
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {[
                { href: '/hq/reports/sales', label: 'Laporan Penjualan', icon: ShoppingCart, color: 'blue' },
                { href: '/hq/reports/finance', label: 'Laporan Keuangan', icon: DollarSign, color: 'green' },
                { href: '/hq/reports/inventory', label: 'Laporan Inventori', icon: Package, color: 'purple' },
                { href: '/hq/reports/customers', label: 'Laporan Pelanggan', icon: Users, color: 'orange' },
                { href: '/hq/reports/hris', label: 'Laporan SDM', icon: UserCheck, color: 'teal' },
                { href: '/hq/reports/procurement', label: 'Laporan Pengadaan', icon: Truck, color: 'indigo' },
                { href: '/hq/reports/consolidated', label: 'Laporan Konsolidasi', icon: Layers, color: 'rose' },
                { href: '/hq/reports/data-analysis', label: 'Olah Data & Analisis', icon: BarChart3, color: 'cyan' },
              ].map((item) => {
                const color = getColor(item.color);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${color.border} ${color.light} hover:shadow-sm transition-all group`}
                  >
                    <div className={`p-2 rounded-lg ${color.bg}`}>
                      <item.icon className={`w-4 h-4 ${color.text}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-gray-500" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Summary */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-bold mb-1">Pusat Laporan Komprehensif</h3>
              <p className="text-blue-100 text-sm">
                {modules.length} modul laporan tersedia. Pilih widget yang diinginkan untuk tampilan yang disesuaikan.
                Semua data ter-update secara real-time dari seluruh modul ERP.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{modules.length}</p>
                <p className="text-xs text-blue-200">Modul</p>
              </div>
              <div className="w-px h-10 bg-white/30" />
              <div className="text-center">
                <p className="text-2xl font-bold">{selectedModules.length}</p>
                <p className="text-xs text-blue-200">Aktif</p>
              </div>
              <div className="w-px h-10 bg-white/30" />
              <div className="text-center">
                <p className="text-2xl font-bold">{recentReports.length}</p>
                <p className="text-xs text-blue-200">Laporan</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HQLayout>
  );
}
