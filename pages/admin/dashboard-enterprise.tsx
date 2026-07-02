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
  X,
  Bell,
  Settings,
  Search,
  ChevronRight,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Shield,
  Globe
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

export default function AdminDashboardEnterprise() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-400 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="h-6 w-6 text-blue-400 animate-pulse" />
            </div>
          </div>
          <p className="mt-6 text-lg text-blue-100 font-medium">Memuat Dashboard Enterprise...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center max-w-md">
          <div className="bg-red-500/10 rounded-full p-4 inline-block mb-4">
            <AlertCircle className="h-12 w-12 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Connection Error</h3>
          <p className="text-blue-200 mb-6">{error}</p>
          <button
            onClick={fetchDashboardStats}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
          >
            Retry Connection
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
    { icon: Users, label: 'Mitra', path: '/admin/partners', badge: stats.partners.total },
    { icon: FileCheck, label: 'Aktivasi', path: '/admin/activations', badge: stats.activations.pending, badgeColor: 'yellow' },
    { icon: Store, label: 'Outlet', path: '/admin/outlets', badge: stats.outlets.total },
    { icon: DollarSign, label: 'Transaksi', path: '/admin/transactions' },
    { icon: Package, label: 'Langganan', path: '/admin/subscriptions' },
    { icon: BarChart3, label: 'Analitik', path: '/admin/analytics' },
    { icon: Settings, label: 'Pengaturan', path: '/admin/settings' },
  ];

  return (
    <>
      <Head>
        <title>Enterprise Dashboard - Bedagang Admin</title>
        <meta name="description" content="Bedagang Enterprise Admin Dashboard" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Top Navigation Bar */}
        <nav className="bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left Section */}
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  {sidebarOpen ? <X className="h-5 w-5 text-slate-300" /> : <Menu className="h-5 w-5 text-slate-300" />}
                </button>
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                      BEDAGANG
                    </h1>
                    <p className="text-xs text-slate-400">Enterprise Admin</p>
                  </div>
                </div>
              </div>

              {/* Center Section - Search */}
              <div className="hidden md:flex flex-1 max-w-2xl mx-8">
                <div className="relative w-full">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari mitra, outlet, transaksi..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Right Section */}
              <div className="flex items-center space-x-4">
                <button className="relative p-2 hover:bg-slate-800 rounded-lg transition-colors">
                  <Bell className="h-5 w-5 text-slate-300" />
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                </button>
                <div className="hidden md:flex items-center space-x-3 pl-4 border-l border-slate-700">
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-200">{session?.user?.name || 'Admin'}</p>
                    <p className="text-xs text-slate-400">{session?.user?.email}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {session?.user?.name?.charAt(0) || 'A'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex">
          {/* Sidebar */}
          <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 overflow-hidden`}>
            <div className="h-[calc(100vh-73px)] bg-slate-900/50 backdrop-blur-xl border-r border-slate-700/50 p-4">
              <nav className="space-y-1">
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => router.push(item.path)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
                      item.active
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                        : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className={`h-5 w-5 ${item.active ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.badgeColor === 'yellow'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-8 overflow-y-auto h-[calc(100vh-73px)]">
            <div className="max-w-[1800px] mx-auto">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Enterprise Dashboard</h2>
                    <p className="text-slate-400">Pantau dan kelola seluruh ekosistem POS Anda</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Ekspor Laporan</span>
                    </button>
                    <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all shadow-lg shadow-blue-500/30 flex items-center space-x-2">
                      <Zap className="h-4 w-4" />
                      <span>Aksi Cepat</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats Grid - Enhanced */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Partners */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex items-center space-x-1 text-green-400 text-sm font-medium">
                        <ArrowUpRight className="h-4 w-4" />
                        <span>+12%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm font-medium mb-1">Total Mitra</p>
                      <p className="text-4xl font-bold text-white mb-3">{stats.partners.total}</p>
                      <div className="flex items-center space-x-4 text-xs">
                        <div className="flex items-center space-x-1">
                          <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                          <span className="text-slate-400">{stats.partners.active} Aktif</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
                          <span className="text-slate-400">{stats.partners.pending} Pending</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Outlets */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 hover:border-green-500/50 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
                        <Store className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex items-center space-x-1 text-green-400 text-sm font-medium">
                        <ArrowUpRight className="h-4 w-4" />
                        <span>+8%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm font-medium mb-1">Outlet Aktif</p>
                      <p className="text-4xl font-bold text-white mb-3">{stats.outlets.total}</p>
                      <p className="text-xs text-slate-400">Terminal POS beroperasi</p>
                    </div>
                  </div>
                </div>

                {/* Pending Activations */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 hover:border-yellow-500/50 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl">
                        <FileCheck className="h-6 w-6 text-white" />
                      </div>
                      <button className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs font-medium hover:bg-yellow-500/30 transition-colors">
                        Review
                      </button>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm font-medium mb-1">Pending Activations</p>
                      <p className="text-4xl font-bold text-white mb-3">{stats.activations.pending}</p>
                      <p className="text-xs text-slate-400">{stats.activations.recent} requests this week</p>
                    </div>
                  </div>
                </div>

                {/* Monthly Revenue */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 hover:border-purple-500/50 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                        <DollarSign className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex items-center space-x-1 text-green-400 text-sm font-medium">
                        <ArrowUpRight className="h-4 w-4" />
                        <span>+15%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm font-medium mb-1">Monthly Revenue</p>
                      <p className="text-3xl font-bold text-white mb-3">{formatCurrency(stats.revenue.monthly)}</p>
                      <p className="text-xs text-slate-400">YTD: {formatCurrency(stats.revenue.yearly)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts and Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Partner Growth Chart */}
                <div className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Partner Growth Trend</h3>
                      <p className="text-sm text-slate-400">Last 6 months performance</p>
                    </div>
                    <button className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors">
                      View Details
                    </button>
                  </div>
                  <div className="space-y-4">
                    {stats.charts.partnerGrowth.map((item, index) => (
                      <div key={index} className="group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-300">{item.month}</span>
                          <span className="text-sm font-bold text-blue-400">{item.count} partners</span>
                        </div>
                        <div className="relative h-3 bg-slate-700/30 rounded-full overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500 group-hover:from-blue-400 group-hover:to-cyan-400"
                            style={{
                              width: `${Math.max((item.count / Math.max(...stats.charts.partnerGrowth.map(i => i.count))) * 100, 5)}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Package Distribution */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-1">Distribusi Paket</h3>
                    <p className="text-sm text-slate-400">Langganan aktif</p>
                  </div>
                  <div className="space-y-6">
                    {stats.charts.packageDistribution.map((item, index) => {
                      const colors = [
                        { from: 'from-blue-500', to: 'to-cyan-500', bg: 'bg-blue-500/20', text: 'text-blue-400' },
                        { from: 'from-green-500', to: 'to-emerald-500', bg: 'bg-green-500/20', text: 'text-green-400' },
                        { from: 'from-purple-500', to: 'to-pink-500', bg: 'bg-purple-500/20', text: 'text-purple-400' }
                      ];
                      const color = colors[index] || colors[0];
                      
                      return (
                        <div key={index} className="group">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`h-10 w-10 rounded-lg ${color.bg} flex items-center justify-center`}>
                                <Package className={`h-5 w-5 ${color.text}`} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">{item.package}</p>
                                <p className="text-xs text-slate-400">{item.count} subscriptions</p>
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
                          </div>
                          <div className="h-2 bg-slate-700/30 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${color.from} ${color.to} rounded-full transition-all duration-500`}
                              style={{
                                width: `${Math.max((item.count / Math.max(...stats.charts.packageDistribution.map(i => i.count))) * 100, 10)}%`
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Subscriptions Overview */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Ringkasan Langganan</h3>
                      <p className="text-sm text-slate-400">Status dan peringatan terkini</p>
                    </div>
                    <Globe className="h-6 w-6 text-slate-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium text-green-400">Aktif</span>
                      </div>
                      <p className="text-3xl font-bold text-white">{stats.subscriptions.active}</p>
                      <p className="text-xs text-slate-400 mt-1">Langganan</p>
                    </div>
                    <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/20">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="h-2 w-2 bg-orange-400 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium text-orange-400">Segera Berakhir</span>
                      </div>
                      <p className="text-3xl font-bold text-white">{stats.subscriptions.expiring}</p>
                      <p className="text-xs text-slate-400 mt-1">Dalam 30 hari</p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-1">Aksi Cepat</h3>
                    <p className="text-sm text-slate-400">Operasi yang sering digunakan</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => router.push('/admin/partners')}
                      className="p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 rounded-xl transition-all group"
                    >
                      <Users className="h-6 w-6 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-sm font-medium text-white">Kelola Mitra</p>
                    </button>
                    <button
                      onClick={() => router.push('/admin/activations')}
                      className="p-4 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 hover:border-yellow-500/40 rounded-xl transition-all group"
                    >
                      <FileCheck className="h-6 w-6 text-yellow-400 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-sm font-medium text-white">Tinjau Permintaan</p>
                    </button>
                    <button
                      onClick={() => router.push('/admin/transactions')}
                      className="p-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 rounded-xl transition-all group"
                    >
                      <Activity className="h-6 w-6 text-green-400 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-sm font-medium text-white">Lihat Transaksi</p>
                    </button>
                    <button
                      onClick={() => router.push('/admin/analytics')}
                      className="p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 rounded-xl transition-all group"
                    >
                      <BarChart3 className="h-6 w-6 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-sm font-medium text-white">Analitik</p>
                    </button>
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
