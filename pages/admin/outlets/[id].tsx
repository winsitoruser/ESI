// Outlets Detail Page
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  ArrowLeft,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Store,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Users,
  Activity
} from 'lucide-react';

interface Outlet {
  id: string;
  outletName: string;
  address: string;
  phone: string;
  email: string;
  city: string;
  province: string;
  postalCode: string;
  isActive: boolean;
  createdAt: string;
  partner: {
    id: string;
    businessName: string;
    ownerName: string;
    email: string;
    status: string;
  };
}

export default function OutletDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;

  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      fetchOutlet();
    }
  }, [status, session, router, id]);

  const fetchOutlet = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/outlets/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch outlet');
      }

      const data = await response.json();
      setOutlet(data.data);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = !outlet?.isActive;
    
    if (!confirm(`Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} this outlet?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/outlets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: newStatus })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update status');
      }

      setSuccess(`Outlet ${newStatus ? 'activated' : 'deactivated'} successfully!`);
      fetchOutlet();

    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this outlet? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/outlets/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete outlet');
      }

      setSuccess('Outlet deleted successfully!');
      setTimeout(() => {
        router.push('/admin/outlets');
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading outlet...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && !outlet) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="mt-4 text-gray-600">Error: {error}</p>
            <button
              onClick={() => router.push('/admin/outlets')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Kembali ke Outlet
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Outlet Detail - {outlet?.outletName} - Bedagang Admin</title>
      </Head>

      <AdminLayout>
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/outlets')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Outlet
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{outlet?.outletName}</h1>
              <p className="mt-2 text-sm text-gray-600">Outlet ID: {outlet?.id}</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                outlet?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {outlet?.isActive ? 'Active' : 'Inactive'}
              </span>
              <button
                onClick={() => router.push(`/admin/outlets/${id}/edit`)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Edit className="h-4 w-4" />
                <span>Ubah</span>
              </button>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <XCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Outlet Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Outlet Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Outlet Name</label>
                  <p className="text-sm text-gray-900 mt-1">{outlet?.outletName}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      outlet?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {outlet?.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <div className="flex items-center mt-1">
                    <Mail className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">{outlet?.email || '-'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <div className="flex items-center mt-1">
                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">{outlet?.phone || '-'}</p>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Address</label>
                  <div className="flex items-start mt-1">
                    <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                    <p className="text-sm text-gray-900">{outlet?.address || '-'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">City</label>
                  <p className="text-sm text-gray-900 mt-1">{outlet?.city || '-'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Province</label>
                  <p className="text-sm text-gray-900 mt-1">{outlet?.province || '-'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Postal Code</label>
                  <p className="text-sm text-gray-900 mt-1">{outlet?.postalCode || '-'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Created Date</label>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">
                      {outlet?.createdAt ? new Date(outlet.createdAt).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Partner Information */}
            {outlet?.partner && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Partner Information</h2>
                  <button
                    onClick={() => router.push(`/admin/partners/${outlet.partner.id}`)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Partner
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{outlet.partner.businessName}</h3>
                      <p className="text-sm text-gray-500 mt-1">Owner: {outlet.partner.ownerName}</p>
                      <div className="flex items-center mt-2">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        <p className="text-sm text-gray-600">{outlet.partner.email}</p>
                      </div>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          outlet.partner.status === 'active' ? 'bg-green-100 text-green-700' :
                          outlet.partner.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {outlet.partner.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Info</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                    outlet?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {outlet?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {outlet?.createdAt ? new Date(outlet.createdAt).toLocaleDateString() : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {outlet?.city}, {outlet?.province}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Actions</h3>
              
              <div className="space-y-3">
                <button
                  onClick={handleToggleStatus}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    outlet?.isActive
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  <span>{outlet?.isActive ? 'Deactivate Outlet' : 'Activate Outlet'}</span>
                </button>

                <button
                  onClick={handleDelete}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Outlet</span>
                </button>
              </div>
            </div>

            {/* Map Preview (Placeholder) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Location</h3>
              
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-8 w-8 text-gray-400 mx-auto" />
                  <p className="text-sm text-gray-500 mt-2">Map preview</p>
                  <p className="text-xs text-gray-400">Coming soon</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-gray-600">{outlet?.address}</p>
                <p className="text-sm text-gray-600">{outlet?.city}, {outlet?.province} {outlet?.postalCode}</p>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
