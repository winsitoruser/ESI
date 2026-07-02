// Partners Detail Page
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
  Users,
  Store,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Package,
  Activity
} from 'lucide-react';

interface Partner {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  businessType: string;
  status: string;
  createdAt: string;
  outlets?: Array<{
    id: string;
    outletName: string;
    address: string;
    phone: string;
    isActive: boolean;
  }>;
  subscriptions?: Array<{
    id: string;
    packageName: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
  activationRequests?: Array<{
    id: string;
    requestDate: string;
    status: string;
    approvedAt: string;
  }>;
}

export default function PartnerDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;

  const [partner, setPartner] = useState<Partner | null>(null);
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
      fetchPartner();
    }
  }, [status, session, router, id]);

  const fetchPartner = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/partners/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch partner');
      }

      const data = await response.json();
      setPartner(data.data);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to change partner status to ${newStatus}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/partners/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update status');
      }

      setSuccess('Partner status updated successfully!');
      fetchPartner();

    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this partner? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/partners/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete partner');
      }

      setSuccess('Partner deleted successfully!');
      setTimeout(() => {
        router.push('/admin/partners');
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'suspended':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading partner...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && !partner) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="mt-4 text-gray-600">Error: {error}</p>
            <button
              onClick={() => router.push('/admin/partners')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Partners
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Partner Detail - {partner?.businessName} - Bedagang Admin</title>
      </Head>

      <AdminLayout>
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/partners')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Partners
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{partner?.businessName}</h1>
              <p className="mt-2 text-sm text-gray-600">Partner ID: {partner?.id}</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(partner?.status || '')}`}>
                {partner?.status}
              </span>
              <button
                onClick={() => router.push(`/admin/partners/${id}/edit`)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
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
            {/* Partner Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Partner Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Business Name</label>
                  <p className="text-sm text-gray-900 mt-1">{partner?.businessName}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Owner Name</label>
                  <p className="text-sm text-gray-900 mt-1">{partner?.ownerName}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <div className="flex items-center mt-1">
                    <Mail className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">{partner?.email}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <div className="flex items-center mt-1">
                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">{partner?.phone || '-'}</p>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Address</label>
                  <div className="flex items-start mt-1">
                    <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                    <p className="text-sm text-gray-900">{partner?.address || '-'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Business Type</label>
                  <p className="text-sm text-gray-900 mt-1">{partner?.businessType || '-'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Registration Date</label>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">
                      {partner?.createdAt ? new Date(partner.createdAt).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Outlets */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Outlets</h2>
                <button
                  onClick={() => router.push(`/admin/outlets?partnerId=${id}`)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All
                </button>
              </div>

              {partner?.outlets && partner.outlets.length > 0 ? (
                <div className="space-y-3">
                  {partner.outlets.map((outlet) => (
                    <div
                      key={outlet.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/admin/outlets/${outlet.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Store className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{outlet.outletName}</h3>
                            <p className="text-sm text-gray-500 mt-1">{outlet.address}</p>
                            <p className="text-sm text-gray-500">{outlet.phone}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          outlet.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {outlet.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Store className="h-12 w-12 text-gray-300 mx-auto" />
                  <p className="text-sm text-gray-500 mt-2">Tidak ada outlet ditemukan</p>
                </div>
              )}
            </div>

            {/* Subscriptions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Langganan</h2>

              {partner?.subscriptions && partner.subscriptions.length > 0 ? (
                <div className="space-y-3">
                  {partner.subscriptions.map((sub) => (
                    <div key={sub.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{sub.packageName}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(sub.startDate).toLocaleDateString()} - {new Date(sub.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sub.status)}`}>
                          {sub.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-300 mx-auto" />
                  <p className="text-sm text-gray-500 mt-2">Tidak ada langganan ditemukan</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Statistik Cepat</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Total Outlets</p>
                  <p className="text-2xl font-bold text-gray-900">{partner?.outlets?.length || 0}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Langganan Aktif</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {partner?.subscriptions?.filter(s => s.status === 'active').length || 0}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(partner?.status || '')}`}>
                    {partner?.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Actions</h3>
              
              <div className="space-y-3">
                {partner?.status === 'pending' && (
                  <button
                    onClick={() => handleStatusChange('active')}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Approve Partner</span>
                  </button>
                )}

                {partner?.status === 'active' && (
                  <button
                    onClick={() => handleStatusChange('suspended')}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    <Activity className="h-4 w-4" />
                    <span>Suspend Partner</span>
                  </button>
                )}

                {partner?.status === 'suspended' && (
                  <button
                    onClick={() => handleStatusChange('active')}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Activate Partner</span>
                  </button>
                )}

                <button
                  onClick={handleDelete}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Partner</span>
                </button>
              </div>
            </div>

            {/* Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
              
              {partner?.activationRequests && partner.activationRequests.length > 0 ? (
                <div className="space-y-3">
                  {partner.activationRequests.slice(0, 5).map((req) => (
                    <div key={req.id} className="text-sm">
                      <p className="text-gray-900 font-medium">{req.status}</p>
                      <p className="text-gray-500 text-xs">
                        {new Date(req.requestDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
