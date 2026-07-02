import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { hasAdminAccess } from '@/utils/adminAuth';
import {
  Users,
  Store,
  FileCheck,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Package,
  Activity,
  LogOut,
  Menu,
  Bell,
  Settings,
  Search,
  ChevronRight,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
  Filter,
  MoreVertical,
  Brain,
  CreditCard,
  Boxes
} from 'lucide-react';

interface DashboardStats {
  partners: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
  };
  outlets: {
    total: number;
  };
  branches: {
    total: number;
  };
  users: {
    total: number;
  };
  activations: {
    pending: number;
    recent: number;
  };
  revenue: {
    monthly: number;
    yearly: number;
  };
  subscriptions: {
    active: number;
    expiring: number;
  };
  charts: {
    partnerGrowth: Array<{ month: string; count: number }>;
    packageDistribution: Array<{ package: string; count: number }>;
  };
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [timeRange, setTimeRange] = useState('6m');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
      return;
    }

    if (session && !hasAdminAccess(session)) {
      router.push('/admin/login');
      return;
    }

    if (status === 'authenticated') {
      fetchDashboardStats();
    }
  }, [status, session, router]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard/stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const data = await response.json();
      setStats(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/admin/login' });
  };

  const handleFilterChange = (range: string) => {
    setTimeRange(range);
    setShowFilterModal(false);
    // Refresh data with new filter
    fetchDashboardStats();
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      // Create export data
      const exportData = {
        date: new Date().toISOString(),
        timeRange,
        stats,
        format
      };

      if (format === 'csv') {
        // Generate CSV
        const csvContent = [
          ['Metric', 'Value'],
          ['Total Partners', stats?.partners.total],
          ['Active Partners', stats?.partners.active],
          ['Pending Partners', stats?.partners.pending],
          ['Active Outlets', stats?.outlets.total],
          ['Pending Activations', stats?.activations.pending],
          ['Monthly Revenue', stats?.revenue.monthly],
          ['Yearly Revenue', stats?.revenue.yearly],
          ['Active Subscriptions', stats?.subscriptions.active],
          ['Expiring Subscriptions', stats?.subscriptions.expiring]
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-stats-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      } else {
        alert(`Export to ${format.toUpperCase()} will be available soon`);
      }
      
      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat dasbor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-gray-600">Kesalahan: {error}</p>
          <button
            onClick={fetchDashboardStats}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const kybPendingCount = (stats as any)?.kyb?.pending || 0;

  const menuItems = [
    { icon: Activity, label: 'Dasbor', path: '/admin/dashboard', active: true },
    { icon: FileCheck, label: 'Tinjauan KYB', path: '/admin/kyb-review', badge: kybPendingCount > 0 ? kybPendingCount : undefined },
    { icon: Users, label: 'Tenant', path: '/admin/tenants' },
    { icon: Package, label: 'Jenis Bisnis', path: '/admin/business-types' },
    { icon: Store, label: 'Cabang', path: '/admin/branches' },
    { icon: Boxes, label: 'Modul', path: '/admin/modules' },
    { icon: Users, label: 'Mitra', path: '/admin/partners' },
    { icon: Store, label: 'Outlet', path: '/admin/outlets' },
    { icon: DollarSign, label: 'Transaksi', path: '/admin/transactions' },
    { icon: CreditCard, label: 'Langganan', path: '/admin/subscriptions', badge: stats.subscriptions?.expiring },
    { icon: BarChart3, label: 'Analitik', path: '/admin/analytics' },
    { icon: Brain, label: 'Model AI', path: '/admin/ai-models' },
    { icon: Settings, label: 'Pengaturan', path: '/admin/settings' },
  ];

  return (
    <>
      <Head>
        <title>Dasbor Admin - Bedagang</title>
        <meta name="description" content="Dasbor Admin Bedagang" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Top Navigation */}
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Menu className="h-5 w-5 text-gray-600" />
                </button>
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">BEDAGANG</h1>
                    <p className="text-xs text-gray-500">Panel Admin</p>
                  </div>
                </div>
              </div>

              {/* Center - Search */}
              <div className="hidden md:flex flex-1 max-w-xl mx-8">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari tenant, outlet, transaksi..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center space-x-3">
                <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell className="h-5 w-5 text-gray-600" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full"></span>
                </button>
                <div className="hidden md:flex items-center space-x-3 pl-3 border-l border-gray-200">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{session?.user?.name || 'Admin'}</p>
                    <p className="text-xs text-gray-500">{session?.user?.email}</p>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {session?.user?.name?.charAt(0) || 'A'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex">
          {/* Sidebar */}
          <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden bg-white border-r border-gray-200`}>
            <div className="h-[calc(100vh-73px)] overflow-y-auto p-4">
              <nav className="space-y-1">
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => router.push(item.path)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                      item.active
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className={`h-5 w-5 ${item.active ? 'text-blue-600' : 'text-gray-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto h-[calc(100vh-73px)]">
            <div className="p-8">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Ringkasan Dasbor</h2>
                    <p className="text-gray-600 mt-1">Pantau kinerja bisnis dan metrik utama Anda</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <button 
                        onClick={() => setShowFilterModal(!showFilterModal)}
                        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Calendar className="h-4 w-4 text-gray-600" />
                        <span className="text-sm text-gray-700">
                          {timeRange === '1m' ? 'Bulan lalu' : 
                           timeRange === '3m' ? '3 bulan terakhir' : 
                           timeRange === '6m' ? '6 bulan terakhir' : 'Tahun lalu'}
                        </span>
                        <Filter className="h-4 w-4 text-gray-600" />
                      </button>
                      
                      {showFilterModal && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                          <div className="py-2">
                            <button onClick={() => handleFilterChange('1m')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700">Bulan lalu</button>
                            <button onClick={() => handleFilterChange('3m')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700">3 bulan terakhir</button>
                            <button onClick={() => handleFilterChange('6m')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700">6 bulan terakhir</button>
                            <button onClick={() => handleFilterChange('1y')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700">Tahun lalu</button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="relative">
                      <button 
                        onClick={() => setShowExportModal(!showExportModal)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        <span className="text-sm">Ekspor</span>
                      </button>
                      
                      {showExportModal && (
                        <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                          <div className="py-2">
                            <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700">Ekspor CSV</button>
                            <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700">Ekspor Excel</button>
                            <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700">Ekspor PDF</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Tenants */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/admin/partners')}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex items-center space-x-1 text-green-600 text-sm font-medium">
                      <ArrowUpRight className="h-4 w-4" />
                      <span>12%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Total Tenant</p>
                    <p className="text-3xl font-bold text-gray-900 mb-2">{stats.partners.total}</p>
                    <div className="flex items-center space-x-3 text-xs">
                      <span className="text-green-600 font-medium">{stats.partners.active} Aktif</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-yellow-600 font-medium">{stats.partners.pending} Trial</span>
                    </div>
                  </div>
                </div>

                {/* Total Branches */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/admin/branches')}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-teal-50 rounded-lg">
                      <Store className="h-6 w-6 text-teal-600" />
                    </div>
                    <div className="flex items-center space-x-1 text-green-600 text-sm font-medium">
                      <ArrowUpRight className="h-4 w-4" />
                      <span>8%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Total Cabang</p>
                    <p className="text-3xl font-bold text-gray-900 mb-2">{stats.branches?.total || 0}</p>
                    <p className="text-xs text-gray-500">Di {stats.partners.active} tenant</p>
                  </div>
                </div>

                {/* Total Users */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex items-center space-x-1 text-green-600 text-sm font-medium">
                      <ArrowUpRight className="h-4 w-4" />
                      <span>5%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Total Pengguna</p>
                    <p className="text-3xl font-bold text-gray-900 mb-2">{stats.users?.total || 0}</p>
                    <p className="text-xs text-gray-500">Pengguna di seluruh sistem</p>
                  </div>
                </div>

                {/* Monthly Revenue */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex items-center space-x-1 text-green-600 text-sm font-medium">
                      <ArrowUpRight className="h-4 w-4" />
                      <span>15%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Pendapatan Bulanan</p>
                    <p className="text-2xl font-bold text-gray-900 mb-2">{formatCurrency(stats.revenue.monthly)}</p>
                    <p className="text-xs text-gray-500">Tahun ini: {formatCurrency(stats.revenue.yearly)}</p>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Partner Growth - Area Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Pertumbuhan Tenant</h3>
                      <p className="text-sm text-gray-500 mt-1">Tren akuisisi tenant bulanan</p>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical className="h-5 w-5 text-gray-400" />
                    </button>
                  </div>
                  
                  {/* Area Chart Visualization */}
                  <div className="relative h-64">
                    <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>
                      
                      {/* Grid lines */}
                      {[0, 1, 2, 3, 4].map((i) => (
                        <line
                          key={i}
                          x1="0"
                          y1={i * 50}
                          x2="600"
                          y2={i * 50}
                          stroke="#E5E7EB"
                          strokeWidth="1"
                        />
                      ))}
                      
                      {/* Area */}
                      <path
                        d={`M 0,${200 - (stats.charts.partnerGrowth[0]?.count || 0) * 10} 
                           ${stats.charts.partnerGrowth.map((item, i) => 
                             `L ${(i * 600) / (stats.charts.partnerGrowth.length - 1)},${200 - item.count * 10}`
                           ).join(' ')} 
                           L 600,200 L 0,200 Z`}
                        fill="url(#areaGradient)"
                      />
                      
                      {/* Line */}
                      <path
                        d={`M 0,${200 - (stats.charts.partnerGrowth[0]?.count || 0) * 10} 
                           ${stats.charts.partnerGrowth.map((item, i) => 
                             `L ${(i * 600) / (stats.charts.partnerGrowth.length - 1)},${200 - item.count * 10}`
                           ).join(' ')}`}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      
                      {/* Points */}
                      {stats.charts.partnerGrowth.map((item, i) => (
                        <circle
                          key={i}
                          cx={(i * 600) / (stats.charts.partnerGrowth.length - 1)}
                          cy={200 - item.count * 10}
                          r="5"
                          fill="#3B82F6"
                          stroke="white"
                          strokeWidth="2"
                        />
                      ))}
                    </svg>
                    
                    {/* X-axis labels */}
                    <div className="flex justify-between mt-4 px-2">
                      {stats.charts.partnerGrowth.map((item, index) => (
                        <span key={index} className="text-xs text-gray-500 font-medium">
                          {item.month}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Revenue Trend - Line Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Tren Pendapatan</h3>
                      <p className="text-sm text-gray-500 mt-1">Perbandingan bulanan</p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  
                  {/* Line Chart */}
                  <div className="relative h-48 mb-4">
                    <svg className="w-full h-full" viewBox="0 0 200 150" preserveAspectRatio="none">
                      {/* Grid */}
                      {[0, 1, 2, 3].map((i) => (
                        <line
                          key={i}
                          x1="0"
                          y1={i * 50}
                          x2="200"
                          y2={i * 50}
                          stroke="#F3F4F6"
                          strokeWidth="1"
                        />
                      ))}
                      
                      {/* Line */}
                      <path
                        d="M 0,120 L 40,100 L 80,80 L 120,90 L 160,60 L 200,40"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      
                      {/* Points */}
                      {[0, 40, 80, 120, 160, 200].map((x, i) => {
                        const y = [120, 100, 80, 90, 60, 40][i];
                        return (
                          <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="4"
                            fill="#10B981"
                            stroke="white"
                            strokeWidth="2"
                          />
                        );
                      })}
                    </svg>
                  </div>
                  
                  {/* Stats */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">This Month</span>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(stats.revenue.monthly)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Year to Date</span>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(stats.revenue.yearly)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Package Distribution */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Package Distribution</h3>
                      <p className="text-sm text-gray-500 mt-1">Active subscriptions by package</p>
                    </div>
                    <Package className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="space-y-4">
                    {stats.charts.packageDistribution.map((item, index) => {
                      const colors = [
                        { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700' },
                        { bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-700' },
                        { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700' }
                      ];
                      const color = colors[index] || colors[0];
                      const percentage = (item.count / stats.charts.packageDistribution.reduce((a, b) => a + b.count, 0)) * 100;
                      
                      return (
                        <div key={index}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div className={`h-10 w-10 rounded-lg ${color.light} flex items-center justify-center`}>
                                <Package className={`h-5 w-5 ${color.text}`} />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{item.package}</p>
                                <p className="text-xs text-gray-500">{item.count} subscriptions</p>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-gray-900">{percentage.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${color.bg} rounded-full transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Actions & Subscriptions */}
                <div className="space-y-6">
                  {/* Subscriptions Status */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Subscriptions Status</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs font-medium text-green-700">Active</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.subscriptions.active}</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                          <span className="text-xs font-medium text-orange-700">Expiring</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.subscriptions.expiring}</p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Aksi Cepat</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => router.push('/admin/kyb-review')}
                        className="relative overflow-hidden p-5 bg-gradient-to-br from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 rounded-xl transition-all transform hover:scale-105 hover:shadow-lg group"
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8"></div>
                        <div className="relative">
                          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg inline-block mb-3">
                            <FileCheck className="h-6 w-6 text-white" />
                          </div>
                          <p className="text-white font-semibold text-sm">Review KYB</p>
                          <p className="text-sky-100 text-xs mt-1">{kybPendingCount} menunggu</p>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => router.push('/admin/tenants')}
                        className="relative overflow-hidden p-5 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl transition-all transform hover:scale-105 hover:shadow-lg group"
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8"></div>
                        <div className="relative">
                          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg inline-block mb-3">
                            <Users className="h-6 w-6 text-white" />
                          </div>
                          <p className="text-white font-semibold text-sm">Kelola Tenant</p>
                          <p className="text-blue-100 text-xs mt-1">{stats.partners.total} tenant</p>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => router.push('/admin/business-types')}
                        className="relative overflow-hidden p-5 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl transition-all transform hover:scale-105 hover:shadow-lg group"
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8"></div>
                        <div className="relative">
                          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg inline-block mb-3">
                            <Package className="h-6 w-6 text-white" />
                          </div>
                          <p className="text-white font-semibold text-sm">Jenis Bisnis</p>
                          <p className="text-green-100 text-xs mt-1">Kelola modul per tipe</p>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => router.push('/admin/analytics')}
                        className="relative overflow-hidden p-5 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl transition-all transform hover:scale-105 hover:shadow-lg group"
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8"></div>
                        <div className="relative">
                          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg inline-block mb-3">
                            <BarChart3 className="h-6 w-6 text-white" />
                          </div>
                          <p className="text-white font-semibold text-sm">Analitik</p>
                          <p className="text-purple-100 text-xs mt-1">Lihat insight</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
