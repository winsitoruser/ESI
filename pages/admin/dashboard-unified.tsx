// Unified Admin Dashboard - Merged Platform
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Users,
  Building2,
  Package,
  TrendingUp,
  Activity,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  ShoppingBag,
  BarChart3,
  Clock,
  Plus,
  Settings as SettingsIcon,
  FileText,
  Eye
} from 'lucide-react';

interface AnalyticsData {
  totalTenants: number;
  totalUsers: number;
  totalPartners: number;
  totalModules: number;
  tenantsByBusinessType: Array<{ businessType: string; count: number }>;
  activeVsPendingTenants: { active: number; pending: number };
  moduleUsage: Array<{ moduleName: string; tenantCount: number }>;
  recentTenants: Array<{
    id: string;
    name: string;
    businessType: string;
    status: string;
    createdAt: string;
  }>;
  usersByRole: Array<{ role: string; count: number }>;
}

export default function UnifiedAdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
      return;
    }

    if (session && !['ADMIN', 'super_admin'].includes(session.user?.role as string)) {
      router.push('/admin/login');
      return;
    }

    if (status === 'authenticated') {
      fetchAnalytics();
    }
  }, [status, session, router]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics/overview');
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="mt-4 text-gray-600">Error: {error}</p>
            <button
              onClick={fetchAnalytics}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!analytics) {
    return null;
  }

  type ChangeType = 'increase' | 'decrease' | 'neutral';

  const statCards: Array<{
    title: string;
    value: number;
    icon: any;
    color: string;
    bgColor: string;
    iconColor: string;
    change: string;
    changeType: ChangeType;
    link: string;
  }> = [
    {
      title: 'Total Tenant',
      value: analytics.totalTenants,
      icon: Building2,
      color: 'blue',
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      change: '+12%',
      changeType: 'increase',
      link: '/admin/tenants'
    },
    {
      title: 'Total Pengguna',
      value: analytics.totalUsers,
      icon: Users,
      color: 'green',
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      change: '+8%',
      changeType: 'increase',
      link: '/admin/tenants'
    },
    {
      title: 'Modul Aktif',
      value: analytics.totalModules,
      icon: Boxes,
      color: 'purple',
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      change: '15',
      changeType: 'neutral',
      link: '/admin/modules'
    },
    {
      title: 'Partners',
      value: analytics.totalPartners,
      icon: ShoppingBag,
      color: 'orange',
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
      change: '+5%',
      changeType: 'increase',
      link: '/admin/partners'
    }
  ];

  const quickActions = [
    {
      title: 'Buat Tenant',
      description: 'Tambah tenant baru ke sistem',
      icon: Plus,
      color: 'blue',
      action: () => router.push('/admin/tenants?action=create')
    },
    {
      title: 'Kelola Modul',
      description: 'Konfigurasi modul sistem',
      icon: SettingsIcon,
      color: 'purple',
      action: () => router.push('/admin/modules')
    },
    {
      title: 'Lihat Analitik',
      description: 'Analitik sistem terperinci',
      icon: BarChart3,
      color: 'green',
      action: () => router.push('/admin/analytics')
    },
    {
      title: 'Lihat Laporan',
      description: 'Buat laporan sistem',
      icon: FileText,
      color: 'orange',
      action: () => router.push('/admin/analytics')
    }
  ];

  return (
    <>
      <Head>
        <title>Admin Dashboard - Bedagang Unified Platform</title>
        <meta name="description" content="Bedagang Admin Panel - Unified Platform" />
      </Head>

      <AdminLayout title="Dashboard">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {session?.user?.name || 'Admin'}! 👋
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Here's what's happening with your system today.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                onClick={() => router.push(stat.link)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    <div className="flex items-center mt-2">
                      {stat.changeType === 'increase' && (
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                      )}
                      {stat.changeType === 'decrease' && (
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm font-medium ml-1 ${
                        stat.changeType === 'increase' ? 'text-green-600' :
                        stat.changeType === 'decrease' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {stat.change}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">from last month</span>
                    </div>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-8 w-8 ${stat.iconColor}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.title}
                  onClick={action.action}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      action.color === 'blue' ? 'bg-blue-100' :
                      action.color === 'purple' ? 'bg-purple-100' :
                      action.color === 'green' ? 'bg-green-100' :
                      'bg-orange-100'
                    } group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-5 w-5 ${
                        action.color === 'blue' ? 'text-blue-600' :
                        action.color === 'purple' ? 'text-purple-600' :
                        action.color === 'green' ? 'text-green-600' :
                        'text-orange-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{action.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Tenants by Business Type */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Tenants by Business Type</h3>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {analytics.tenantsByBusinessType.map((item, index) => {
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500'];
                const percentage = analytics.totalTenants > 0 ? (item.count / analytics.totalTenants) * 100 : 0;
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{item.businessType}</span>
                      <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${colors[index % colors.length]} h-2 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active vs Pending Tenants */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Tenant Status</h3>
              <Activity className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
                   onClick={() => router.push('/admin/tenants?status=active')}>
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Tenants</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {analytics.activeVsPendingTenants.active}
                  </p>
                </div>
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors cursor-pointer"
                   onClick={() => router.push('/admin/tenants?status=pending')}>
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Tenants</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">
                    {analytics.activeVsPendingTenants.pending}
                  </p>
                </div>
                <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Modules */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Top Modules Usage</h3>
              <button
                onClick={() => router.push('/admin/modules')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
              >
                <span>View All</span>
                <Eye className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              {analytics.moduleUsage.slice(0, 5).map((module, index) => (
                <div key={index} className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-lg transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{module.moduleName}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{module.tenantCount} tenants</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Tenants */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Tenants</h3>
              <button
                onClick={() => router.push('/admin/tenants')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
              >
                <span>View All</span>
                <Eye className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              {analytics.recentTenants.slice(0, 5).map((tenant) => (
                <div 
                  key={tenant.id} 
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 rounded-lg transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-semibold">
                      {tenant.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tenant.name}</p>
                      <p className="text-xs text-gray-500">{tenant.businessType}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    tenant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {tenant.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
