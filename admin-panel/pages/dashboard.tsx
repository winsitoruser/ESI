import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
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
  Menu
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
      return;
    }

    if (session && !['ADMIN', 'SUPER_ADMIN'].includes(session.user?.role as string)) {
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
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
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

  return (
    <>
      <Head>
        <title>Admin Dashboard - Bedagang Admin Panel</title>
        <meta name="description" content="Bedagang Admin Panel Dashboard" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Top Navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-blue-600">BEDAGANG</h1>
                <span className="ml-3 text-sm text-gray-500">Admin Panel</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">{session?.user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Side Navigation */}
        <div className="flex">
          <aside className="w-64 bg-white min-h-screen shadow-sm">
            <nav className="p-4 space-y-2">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="w-full flex items-center space-x-3 px-4 py-3 text-blue-600 bg-blue-50 rounded-lg font-medium"
              >
                <Activity className="h-5 w-5" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => router.push('/admin/partners')}
                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Users className="h-5 w-5" />
                <span>Partners</span>
              </button>
              <button
                onClick={() => router.push('/admin/activations')}
                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <FileCheck className="h-5 w-5" />
                <span>Activations</span>
                {stats.activations.pending > 0 && (
                  <span className="ml-auto bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                    {stats.activations.pending}
                  </span>
                )}
              </button>
              <button
                onClick={() => router.push('/admin/outlets')}
                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Store className="h-5 w-5" />
                <span>Outlets</span>
              </button>
              <button
                onClick={() => router.push('/admin/transactions')}
                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <DollarSign className="h-5 w-5" />
                <span>Transactions</span>
              </button>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-8">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Kelola partner dan monitoring sistem Bedagang POS
                </p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Partners */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Partners</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {stats.partners.total}
                      </p>
                      <div className="mt-2 flex items-center space-x-2 text-xs">
                        <span className="text-green-600 font-medium">
                          {stats.partners.active} Active
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-yellow-600 font-medium">
                          {stats.partners.pending} Pending
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Active Outlets */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Outlets</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {stats.outlets.total}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        POS aktif beroperasi
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <Store className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                </div>

                {/* Pending Activations */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Activations</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {stats.activations.pending}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        {stats.activations.recent} dalam 7 hari terakhir
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-full">
                      <FileCheck className="h-8 w-8 text-yellow-600" />
                    </div>
                  </div>
                </div>

                {/* Monthly Revenue */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Revenue Bulan Ini</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">
                        {formatCurrency(stats.revenue.monthly)}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        Tahun ini: {formatCurrency(stats.revenue.yearly)}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <DollarSign className="h-8 w-8 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Active Subscriptions */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Subscriptions</h3>
                    <Package className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active Subscriptions</span>
                      <span className="text-lg font-bold text-green-600">
                        {stats.subscriptions.active}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Expiring Soon (30 days)</span>
                      <span className="text-lg font-bold text-orange-600">
                        {stats.subscriptions.expiring}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => router.push('/admin/partners')}
                      className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900">Manage Partners</span>
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                    </button>
                    <button
                      onClick={() => router.push('/admin/activations')}
                      className="w-full text-left px-4 py-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-yellow-900">
                          Review Activations ({stats.activations.pending})
                        </span>
                        <FileCheck className="h-4 w-4 text-yellow-600" />
                      </div>
                    </button>
                    <button
                      onClick={() => router.push('/admin/transactions')}
                      className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-green-900">View Transactions</span>
                        <Activity className="h-4 w-4 text-green-600" />
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Partner Growth Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Partner Growth</h3>
                  <div className="space-y-3">
                    {stats.charts.partnerGrowth.map((item, index) => (
                      <div key={index} className="flex items-center">
                        <span className="text-sm text-gray-600 w-24">{item.month}</span>
                        <div className="flex-1 mx-4">
                          <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full flex items-center justify-end pr-2"
                              style={{
                                width: `${Math.max((item.count / Math.max(...stats.charts.partnerGrowth.map(i => i.count))) * 100, 5)}%`
                              }}
                            >
                              <span className="text-xs text-white font-medium">{item.count}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Package Distribution */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Package Distribution</h3>
                  <div className="space-y-4">
                    {stats.charts.packageDistribution.map((item, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{item.package}</span>
                          <span className="text-sm font-bold text-gray-900">{item.count}</span>
                        </div>
                        <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              index === 0 ? 'bg-blue-500' :
                              index === 1 ? 'bg-green-500' :
                              'bg-purple-500'
                            }`}
                            style={{
                              width: `${Math.max((item.count / Math.max(...stats.charts.packageDistribution.map(i => i.count))) * 100, 5)}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
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
