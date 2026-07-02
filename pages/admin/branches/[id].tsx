import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Store,
  ChevronLeft,
  MapPin,
  Phone,
  Mail,
  Users,
  Building2,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Settings,
  Calendar
} from 'lucide-react';

interface BranchDetail {
  id: string;
  code: string;
  name: string;
  type: string;
  tenant: {
    id: string;
    name: string;
    code: string;
    status: string;
    subscriptionPlan: string;
    maxBranches: number;
  };
  store: {
    id: string;
    name: string;
    code: string;
    address: string;
    city: string;
    province: string;
    phone: string;
  } | null;
  manager: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  assignedUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  isActive: boolean;
  region: string | null;
  syncStatus: string | null;
  lastSyncAt: string | null;
  settings: any;
  syncLogs: Array<{
    id: string;
    syncType: string;
    direction: string;
    status: string;
    itemsSynced: number;
    totalItems: number;
    errorMessage: string | null;
    startedAt: string;
    completedAt: string | null;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function BranchDetail() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [branch, setBranch] = useState<BranchDetail | null>(null);
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

    if (status === 'authenticated' && id) {
      fetchBranchDetail();
    }
  }, [status, session, router, id]);

  const fetchBranchDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/branches/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch branch details');
      }

      const data = await response.json();
      setBranch(data.data);
    } catch (err: any) {
      setError(err.message);
      console.error('Fetch branch detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSyncStatusBadge = (status: string | null) => {
    if (!status) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
          <AlertCircle className="w-4 h-4 mr-2" />
          No Sync
        </span>
      );
    }

    const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
      synced: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      syncing: { bg: 'bg-blue-100', text: 'text-blue-700', icon: RefreshCw },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      error: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-4 h-4 mr-2" />
        {status.toUpperCase()}
      </span>
    );
  };

  const getSyncLogStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string }> = {
      completed: { bg: 'bg-green-100', text: 'text-green-800' },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-800' },
      failed: { bg: 'bg-red-100', text: 'text-red-800' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' }
    };

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat detail cabang...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !branch) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="mt-4 text-gray-600">Kesalahan: {error || 'Cabang tidak ditemukan'}</p>
            <Link href="/admin/branches">
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Kembali ke Cabang
              </button>
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>{branch.name} - Branch Details</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin/branches" className="text-gray-400 hover:text-gray-600">
              <ChevronLeft className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{branch.name}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {branch.code} • {branch.type.toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {branch.isActive ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <CheckCircle className="w-4 h-4 mr-2" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                <XCircle className="w-4 h-4 mr-2" />
                Inactive
              </span>
            )}
            <button
              onClick={fetchBranchDetail}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Muat Ulang
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Branch Information */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Informasi Cabang</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Kode Cabang</label>
                    <p className="text-sm text-gray-900">{branch.code}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Tipe Cabang</label>
                    <p className="text-sm text-gray-900">{branch.type.toUpperCase()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Wilayah</label>
                    <p className="text-sm text-gray-900">{branch.region || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                    <p className="text-sm text-gray-900">{branch.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Informasi Kontak</h2>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <p className="text-sm text-gray-900">{branch.address}</p>
                      <p className="text-sm text-gray-500">{branch.city}, {branch.province} {branch.postalCode}</p>
                    </div>
                  </div>
                  {branch.phone && (
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 text-gray-400 mr-3" />
                      <p className="text-sm text-gray-900">{branch.phone}</p>
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 mr-3" />
                      <p className="text-sm text-gray-900">{branch.email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned Users */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Pengguna Terdaftar ({branch.assignedUsers.length})</h2>
                {branch.assignedUsers.length > 0 ? (
                  <div className="space-y-3">
                    {branch.assignedUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          {user.role}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Tidak ada pengguna terdaftar di cabang ini</p>
                )}
              </div>

              {/* Sync Logs */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Log Sinkronisasi Terbaru</h2>
                {branch.syncLogs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Arah</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Progres</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {branch.syncLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">{log.syncType}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{log.direction}</td>
                            <td className="px-4 py-3">{getSyncLogStatusBadge(log.status)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {log.itemsSynced}/{log.totalItems}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {new Date(log.createdAt).toLocaleDateString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Tidak ada log sinkronisasi</p>
                )}
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Tenant Info */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Tenant</h2>
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{branch.tenant.name}</p>
                    <p className="text-xs text-gray-500">{branch.tenant.code}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className="font-medium text-gray-900">{branch.tenant.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Plan:</span>
                    <span className="font-medium text-gray-900">{branch.tenant.subscriptionPlan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Max Branches:</span>
                    <span className="font-medium text-gray-900">{branch.tenant.maxBranches}</span>
                  </div>
                </div>
              </div>

              {/* Manager Info */}
              {branch.manager && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Manager</h2>
                  <div className="flex items-center mb-3">
                    <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{branch.manager.name}</p>
                      <p className="text-xs text-gray-500">{branch.manager.email}</p>
                    </div>
                  </div>
                  {branch.manager.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {branch.manager.phone}
                    </div>
                  )}
                </div>
              )}

              {/* Store Info */}
              {branch.store && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Store</h2>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <p className="font-medium text-gray-900">{branch.store.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Code:</span>
                      <p className="font-medium text-gray-900">{branch.store.code}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sync Status */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Sync Status</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Status Saat Ini</label>
                    {getSyncStatusBadge(branch.syncStatus)}
                  </div>
                  {branch.lastSyncAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Sinkronisasi Terakhir</label>
                      <div className="flex items-center text-sm text-gray-900">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        {new Date(branch.lastSyncAt).toLocaleString('id-ID')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Metadata</h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Dibuat:</span>
                    <p className="text-gray-900">{new Date(branch.createdAt).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Terakhir Diperbarui:</span>
                    <p className="text-gray-900">{new Date(branch.updatedAt).toLocaleDateString('id-ID')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
