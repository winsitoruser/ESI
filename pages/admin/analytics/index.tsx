import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  TrendingUp,
  Users,
  Building2,
  Package,
  Activity,
  BarChart3,
  PieChart
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalTenants: number;
    totalUsers: number;
    totalPartners: number;
    totalModules: number;
    activeTenants: number;
    pendingTenants: number;
  };
  tenantsByBusinessType: Array<{
    businessType: {
      id: string;
      code: string;
      name: string;
      icon: string;
    };
    count: number;
  }>;
  moduleUsage: Array<{
    module: {
      id: string;
      code: string;
      name: string;
      icon: string;
    };
    totalAssignments: number;
    enabledCount: number;
  }>;
  recentTenants: Array<any>;
  usersByRole: Array<{
    role: string;
    count: number;
  }>;
}

export default function AnalyticsDashboard() {
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

    const userRole = (session?.user?.role as string)?.toLowerCase();
    if (session && !['admin', 'super_admin', 'superadmin'].includes(userRole)) {
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

  const getBusinessTypeIcon = (code: string) => {
    const icons: any = {
      'retail': '🛒',
      'fnb': '🍽️',
      'hybrid': '🏪'
    };
    return icons[code] || '📦';
  };

  const getRoleLabel = (role: string) => {
    const labels: any = {
      'super_admin': 'Super Admin',
      'SUPER_ADMIN': 'Super Admin',
      'ADMIN': 'Admin',
      'owner': 'Pemilik',
      'admin': 'Admin',
      'manager': 'Manajer',
      'cashier': 'Kasir',
      'staff': 'Staf'
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat analitik...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !analytics) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600">Kesalahan: {error || 'Gagal memuat analitik'}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Dasbor Analitik - Panel Admin</title>
      </Head>

      <AdminLayout>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dasbor Analitik</h1>
              <p className="mt-2 text-sm text-gray-600">
                Analitik dan wawasan di seluruh sistem
              </p>
            </div>
            <button
              onClick={fetchAnalytics}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Activity className="w-5 h-5 mr-2" />
              Muat Ulang
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tenant</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {analytics.overview.totalTenants}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {analytics.overview.activeTenants} aktif, {analytics.overview.pendingTenants} menunggu
                </p>
              </div>
              <Building2 className="w-12 h-12 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pengguna</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {analytics.overview.totalUsers}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Di semua tenant
                </p>
              </div>
              <Users className="w-12 h-12 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Mitra</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {analytics.overview.totalPartners}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Mitra terdaftar
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Modul</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {analytics.overview.totalModules}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Modul tersedia
                </p>
              </div>
              <Package className="w-12 h-12 text-orange-600" />
            </div>
          </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tenants by Business Type */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Tenant per Jenis Bisnis</h2>
              <PieChart className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {analytics.tenantsByBusinessType.map((item) => (
                <div key={item.businessType.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getBusinessTypeIcon(item.businessType.code)}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {item.businessType.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(item.count / analytics.overview.totalTenants) * 100}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Modules */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Top Modules Usage</h2>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {analytics.moduleUsage.slice(0, 8).map((item) => (
                <div key={item.module.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Package className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {item.module.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${(item.enabledCount / item.totalAssignments) * 100}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                      {item.enabledCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Users by Role */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Users by Role</h2>
              <Users className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {analytics.usersByRole.map((item) => (
                <div key={item.role} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {getRoleLabel(item.role)}
                  </span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{
                          width: `${(item.count / analytics.overview.totalUsers) * 100}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Tenants */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Tenants</h2>
              <Activity className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              {analytics.recentTenants.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tenant.businessName}</p>
                    <p className="text-xs text-gray-500">
                      {tenant.businessType?.name || 'N/A'}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    tenant.setupCompleted
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {tenant.setupCompleted ? 'Active' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      </AdminLayout>
    </>
  );
}
