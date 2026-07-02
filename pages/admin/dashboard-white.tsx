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
  MoreVertical
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-gray-600">Error: {error}</p>
          <button
            onClick={fetchDashboardStats}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const menuItems = [
    { icon: Activity, label: 'Dashboard', path: '/admin/dashboard', active: true },
    { icon: Users, label: 'Partners', path: '/admin/partners' },
    { icon: FileCheck, label: 'Activations', path: '/admin/activations', badge: stats.activations.pending },
    { icon: Store, label: 'Outlets', path: '/admin/outlets' },
    { icon: DollarSign, label: 'Transactions', path: '/admin/transactions' },
    { icon: Package, label: 'Subscriptions', path: '/admin/subscriptions' },
    { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
  ];

  return (
    <>
      <Head>
        <title>Admin Dashboard - Bedagang</title>
        <meta name="description" content="Bedagang Admin Dashboard" />
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
                    <p className="text-xs text-gray-500">Admin Panel</p>
                  </div>
                </div>
              </div>

              {/* Center - Search */}
              <div className="hidden md:flex flex-1 max-w-xl mx-8">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari mitra, outlet, transaksi..."
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
                    <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
                    <p className="text-gray-600 mt-1">Monitor your business performance and key metrics</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <Calendar className="h-4 w-4 text-gray-600" />
                      <span className="text-sm text-gray-700">Last 6 months</span>
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <Download className="h-4 w-4" />
                      <span className="text-sm">Export</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Partners */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
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
                    <p className="text-gray-600 text-sm font-medium mb-1">Total Mitra</p>
                    <p className="text-3xl font-bold text-gray-900 mb-2">{stats.partners.total}</p>
                    <div className="flex items-center space-x-3 text-xs">
                      <span className="text-green-600 font-medium">{stats.partners.active} Aktif</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-yellow-600 font-medium">{stats.partners.pending} Pending</span>
                    </div>
                  </div>
                </div>

                {/* Active Outlets */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <Store className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex items-center space-x-1 text-green-600 text-sm font-medium">
                      <ArrowUpRight className="h-4 w-4" />
                      <span>8%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Outlet Aktif</p>
                    <p className="text-3xl font-bold text-gray-900 mb-2">{stats.outlets.total}</p>
                    <p className="text-xs text-gray-500">Terminal POS beroperasi</p>
                  </div>
                </div>

                {/* Pending Activations */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <FileCheck className="h-6 w-6 text-yellow-600" />
                    </div>
                    <button className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded text-xs font-medium hover:bg-yellow-100">
                      Review
                    </button>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Pending Activations</p>
                    <p className="text-3xl font-bold text-gray-900 mb-2">{stats.activations.pending}</p>
                    <p className="text-xs text-gray-500">{stats.activations.recent} requests this week</p>
                  </div>
                </div>

                {/* Monthly Revenue */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <DollarSign className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex items-center space-x-1 text-green-600 text-sm font-medium">
                      <ArrowUpRight className="h-4 w-4" />
                      <span>15%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 mb-2">{formatCurrency(stats.revenue.monthly)}</p>
                    <p className="text-xs text-gray-500">YTD: {formatCurrency(stats.revenue.yearly)}</p>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Partner Growth - Area Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Partner Growth</h3>
                      <p className="text-sm text-gray-500 mt-1">Monthly partner acquisition trend</p>
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
                      <h3 className="text-lg font-bold text-gray-900">Revenue Trend</h3>
                      <p className="text-sm text-gray-500 mt-1">Monthly comparison</p>
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
                      <h3 className="text-lg font-bold text-gray-900">Distribusi Paket</h3>
                      <p className="text-sm text-gray-500 mt-1">Langganan aktif berdasarkan paket</p>
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
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Status Langganan</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs font-medium text-green-700">Aktif</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.subscriptions.active}</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                          <span className="text-xs font-medium text-orange-700">Segera Berakhir</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.subscriptions.expiring}</p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => router.push('/admin/partners')}
                        className="p-4 border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-lg transition-all group"
                      >
                        <Users className="h-6 w-6 text-gray-600 group-hover:text-blue-600 mb-2" />
                        <p className="text-sm font-medium text-gray-900">Partners</p>
                      </button>
                      <button
                        onClick={() => router.push('/admin/activations')}
                        className="p-4 border-2 border-gray-200 hover:border-yellow-500 hover:bg-yellow-50 rounded-lg transition-all group"
                      >
                        <FileCheck className="h-6 w-6 text-gray-600 group-hover:text-yellow-600 mb-2" />
                        <p className="text-sm font-medium text-gray-900">Activations</p>
                      </button>
                      <button
                        onClick={() => router.push('/admin/transactions')}
                        className="p-4 border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 rounded-lg transition-all group"
                      >
                        <Activity className="h-6 w-6 text-gray-600 group-hover:text-green-600 mb-2" />
                        <p className="text-sm font-medium text-gray-900">Transactions</p>
                      </button>
                      <button
                        onClick={() => router.push('/admin/analytics')}
                        className="p-4 border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 rounded-lg transition-all group"
                      >
                        <BarChart3 className="h-6 w-6 text-gray-600 group-hover:text-purple-600 mb-2" />
                        <p className="text-sm font-medium text-gray-900">Analytics</p>
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
