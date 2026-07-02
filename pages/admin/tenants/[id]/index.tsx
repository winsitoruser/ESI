import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Users,
  Package,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

interface TenantDetail {
  id: string;
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  setupCompleted: boolean;
  onboardingStep: number;
  createdAt: string;
  updatedAt: string;
  businessType: {
    id: string;
    code: string;
    name: string;
    description: string;
    icon: string;
  };
  partner: {
    id: string;
    businessName: string;
    ownerName: string;
    email: string;
    status: string;
  } | null;
  users: Array<{
    id: number;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  }>;
  tenantModules: Array<{
    id: string;
    isEnabled: boolean;
    enabledAt: string;
    disabledAt: string | null;
    module: {
      id: string;
      code: string;
      name: string;
      description: string;
      icon: string;
      isCore: boolean;
    };
  }>;
}

export default function TenantDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
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
      fetchTenantDetails();
    }
  }, [status, session, router, id]);

  const fetchTenantDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/tenants/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tenant details');
      }

      const data = await response.json();
      setTenant(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/tenants/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete tenant');
      }

      alert('Tenant deleted successfully');
      router.push('/admin/tenants');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading tenant details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !tenant) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600">Error: {error || 'Tenant not found'}</p>
            <Link href="/admin/tenants" className="mt-4 text-blue-600 hover:underline">
              Kembali ke Tenant
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const enabledModules = tenant.tenantModules.filter(tm => tm.isEnabled);
  const disabledModules = tenant.tenantModules.filter(tm => !tm.isEnabled);

  return (
    <AdminLayout>
      <Head>
        <title>{tenant.businessName} - Tenant Details - Admin Panel</title>
      </Head>

      {/* Header */}
      <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin/tenants" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{tenant.businessName}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {tenant.businessType.name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href={`/admin/tenants/${id}/edit`}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Edit className="w-5 h-5 mr-2" />
                Edit
              </Link>
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Delete
              </button>
            </div>
          </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Business Name</p>
                    <p className="text-sm font-medium text-gray-900">{tenant.businessName}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{tenant.businessEmail || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{tenant.businessPhone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 md:col-span-2">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-sm font-medium text-gray-900">{tenant.businessAddress || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modules */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Modules</h2>
                <Link
                  href={`/admin/tenants/${id}/modules`}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Manage Modules →
                </Link>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Enabled ({enabledModules.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {enabledModules.map((tm) => (
                      <span
                        key={tm.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {tm.module.name}
                      </span>
                    ))}
                  </div>
                </div>
                {disabledModules.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Disabled ({disabledModules.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {disabledModules.map((tm) => (
                        <span
                          key={tm.id}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          {tm.module.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Users */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Users ({tenant.users.length})</h2>
              <div className="space-y-3">
                {tenant.users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {user.role}
                      </span>
                      {user.isActive ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                ))}
                {tenant.users.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">Tidak ada pengguna ditemukan</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Setup Status</span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    tenant.setupCompleted
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {tenant.setupCompleted ? 'Completed' : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Onboarding Step</span>
                  <span className="text-sm font-medium text-gray-900">
                    {tenant.onboardingStep || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Business Type */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Type</h2>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{tenant.businessType.name}</p>
                  <p className="text-xs text-gray-500">{tenant.businessType.description}</p>
                </div>
              </div>
            </div>

            {/* Partner Info */}
            {tenant.partner && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Partner</h2>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-900">{tenant.partner.businessName}</p>
                  <p className="text-sm text-gray-600">{tenant.partner.ownerName}</p>
                  <p className="text-sm text-gray-500">{tenant.partner.email}</p>
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                    tenant.partner.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tenant.partner.status}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
