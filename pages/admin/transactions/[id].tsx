// Transaction Detail Page
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Calendar,
  Building2,
  User,
  CreditCard,
  FileText,
  Download
} from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string;
  description: string;
  createdAt: string;
  tenant: {
    id: string;
    businessName: string;
    businessEmail: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function TransactionDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;

  const [transaction, setTransaction] = useState<Transaction | null>(null);
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
      fetchTransaction();
    }
  }, [status, session, router, id]);

  const fetchTransaction = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/transactions/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch transaction');
      }

      const data = await response.json();
      setTransaction(data.data);

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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
      case 'cancelled':
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
            <p className="mt-4 text-gray-600">Loading transaction...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && !transaction) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="mt-4 text-gray-600">Error: {error}</p>
            <button
              onClick={() => router.push('/admin/transactions')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Kembali ke Transaksi
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Transaction Detail - {transaction?.id} - Bedagang Admin</title>
      </Head>

      <AdminLayout>
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/transactions')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Transaksi
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Detail Transaksi</h1>
              <p className="mt-2 text-sm text-gray-600">ID Transaksi: {transaction?.id}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(transaction?.status || '')}`}>
              {transaction?.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Transaction Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Transaksi</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">ID Transaksi</label>
                  <p className="text-sm text-gray-900 mt-1 font-mono">{transaction?.id}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Jumlah</label>
                  <div className="flex items-center mt-1">
                    <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900 font-semibold">
                      {formatCurrency(transaction?.amount || 0)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction?.status || '')}`}>
                      {transaction?.status}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Metode Pembayaran</label>
                  <div className="flex items-center mt-1">
                    <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">{transaction?.paymentMethod || '-'}</p>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Deskripsi</label>
                  <div className="flex items-start mt-1">
                    <FileText className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                    <p className="text-sm text-gray-900">{transaction?.description || '-'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Tanggal Transaksi</label>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">
                      {transaction?.createdAt ? new Date(transaction.createdAt).toLocaleString() : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tenant Information */}
            {transaction?.tenant && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Informasi Tenant</h2>
                  <button
                    onClick={() => router.push(`/admin/tenants/${transaction.tenant.id}`)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Lihat Tenant
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{transaction.tenant.businessName}</h3>
                      <p className="text-sm text-gray-500 mt-1">{transaction.tenant.businessEmail}</p>
                      <p className="text-xs text-gray-400 mt-1">ID: {transaction.tenant.id}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Information */}
            {transaction?.user && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">User Information</h2>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <User className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{transaction.user.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{transaction.user.email}</p>
                      <p className="text-xs text-gray-400 mt-1">ID: {transaction.user.id}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Ringkasan</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Total Jumlah</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(transaction?.amount || 0)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(transaction?.status || '')}`}>
                    {transaction?.status}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Metode Pembayaran</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {transaction?.paymentMethod || '-'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Tanggal</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {transaction?.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Aksi</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Download className="h-4 w-4" />
                  <span>Unduh Invoice</span>
                </button>

                <button
                  onClick={() => router.push(`/admin/tenants/${transaction?.tenant?.id}`)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <Building2 className="h-4 w-4" />
                  <span>Lihat Tenant</span>
                </button>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Riwayat Status</h3>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className={`p-1 rounded-full mt-1 ${
                    transaction?.status === 'completed' ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <CheckCircle className={`h-4 w-4 ${
                      transaction?.status === 'completed' ? 'text-green-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Created</p>
                    <p className="text-xs text-gray-500">
                      {transaction?.createdAt ? new Date(transaction.createdAt).toLocaleString() : '-'}
                    </p>
                  </div>
                </div>

                {transaction?.status === 'completed' && (
                  <div className="flex items-start space-x-3">
                    <div className="p-1 rounded-full bg-green-100 mt-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Completed</p>
                      <p className="text-xs text-gray-500">Transaction successful</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
