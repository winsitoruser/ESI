import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  FileCheck,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ChevronLeft,
  AlertCircle,
  Package,
  Building2
} from 'lucide-react';

interface ActivationRequest {
  id: string;
  tenantId?: string;
  source?: 'partner' | 'onboarding';
  partner: {
    id: string;
    business_name: string;
    owner_name: string;
    email: string;
    phone: string;
    city: string;
  };
  package: {
    id: string;
    name: string;
    price_monthly: number;
    max_outlets: number;
    max_users: number;
  };
  kyb?: {
    id: string;
    status: string;
    currentStep: number;
    completionPercentage: number;
    submittedAt: string | null;
  } | null;
  business_documents: any;
  notes: string;
  status: string;
  created_at: string;
}

export default function ActivationRequests() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<ActivationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState<ActivationRequest | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [subscriptionMonths, setSubscriptionMonths] = useState(1);
  const [processing, setProcessing] = useState(false);

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
      fetchRequests();
    }
  }, [status, session, router, statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        limit: '50'
      });

      const response = await fetch(`/api/admin/activations?${params}`);
      
      if (!response.ok) {
        throw new Error('Gagal memuat permintaan aktivasi');
      }

      const data = await response.json();
      setRequests(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      const response = await fetch(`/api/admin/activations/${selectedRequest.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_notes: reviewNotes,
          subscription_months: subscriptionMonths
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal menyetujui permintaan');
      }

      alert('Permintaan aktivasi berhasil disetujui!');
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setReviewNotes('');
      fetchRequests();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) {
      alert('Harap berikan alasan penolakan');
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch(`/api/admin/activations/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_notes: reviewNotes,
          rejection_reason: rejectionReason
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal menolak permintaan');
      }

      alert('Permintaan aktivasi ditolak');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setReviewNotes('');
      setRejectionReason('');
      fetchRequests();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
      under_review: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Eye }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (loading && requests.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat permintaan aktivasi...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Permintaan Aktivasi - Admin Bedagang</title>
      </Head>

      <AdminLayout>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Permintaan Aktivasi</h1>
              <p className="mt-2 text-sm text-gray-600">
                Tinjau dan setujui permintaan aktivasi mitra
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                {requests.filter(r => r.status === 'pending').length} Menunggu
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div>
          {/* Status Filter */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center space-x-4">
              <Filter className="h-5 w-5 text-gray-400" />
              <div className="flex space-x-2">
                {['pending', 'approved', 'rejected', 'under_review'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'pending' ? 'Menunggu' : status === 'approved' ? 'Disetujui' : status === 'rejected' ? 'Ditolak' : status === 'under_review' ? 'Sedang Ditinjau' : status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Requests List */}
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Tidak ada permintaan aktivasi</p>
              </div>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <Building2 className="h-6 w-6 text-blue-600" />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {request.partner.business_name}
                              </h3>
                              {request.source === 'onboarding' && (
                                <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-xs font-medium rounded-full">Onboarding</span>
                              )}
                              {request.source === 'partner' && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">Partner</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {request.partner.owner_name} • {request.partner.email}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Lokasi</p>
                            <p className="text-sm font-medium text-gray-900">
                              {request.partner.city}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">{request.source === 'onboarding' ? 'Jenis Bisnis' : 'Paket yang Diminta'}</p>
                            <div className="flex items-center space-x-2">
                              <Package className="h-4 w-4 text-purple-600" />
                              <span className="text-sm font-medium text-gray-900">
                                {request.package.name}
                              </span>
                            </div>
                            {request.source !== 'onboarding' && request.package.price_monthly > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                {formatCurrency(request.package.price_monthly)}/bulan
                              </p>
                            )}
                          </div>
                          <div>
                            {request.source === 'onboarding' && request.kyb ? (
                              <>
                                <p className="text-xs text-gray-500 mb-1">Progress KYB</p>
                                <div className="flex items-center space-x-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${request.kyb.completionPercentage}%` }} />
                                  </div>
                                  <span className="text-xs font-medium text-gray-700">{request.kyb.completionPercentage}%</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Step {request.kyb.currentStep}/6 • {request.kyb.status}</p>
                              </>
                            ) : (
                              <>
                                <p className="text-xs text-gray-500 mb-1">Batas Paket</p>
                                <p className="text-sm text-gray-700">
                                  {request.package.max_outlets} outlet • {request.package.max_users} pengguna
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        {request.notes && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Catatan dari Mitra:</p>
                            <p className="text-sm text-gray-700">{request.notes}</p>
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {getStatusBadge(request.status)}
                            <span className="text-xs text-gray-500">
                              Tanggal Permintaan {new Date(request.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </span>
                          </div>

                          {request.status === 'pending' && (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowApprovalModal(true);
                                }}
                                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Setujui
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowRejectModal(true);
                                }}
                                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Tolak
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Setujui Permintaan Aktivasi
            </h3>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>{selectedRequest.partner.business_name}</strong>
              </p>
              <p className="text-sm text-gray-600">
                Paket: {selectedRequest.package.name} - {formatCurrency(selectedRequest.package.price_monthly)}/bulan
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durasi Langganan
                </label>
                <select
                  value={subscriptionMonths}
                  onChange={(e) => setSubscriptionMonths(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 Bulan</option>
                  <option value={3}>3 Bulan</option>
                  <option value={6}>6 Bulan</option>
                  <option value={12}>12 Bulan (Tahunan)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan Tinjauan (Opsional)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Tambahkan catatan untuk persetujuan ini..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedRequest(null);
                  setReviewNotes('');
                }}
                disabled={processing}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleApprove}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {processing ? 'Memproses...' : 'Setujui & Buat Langganan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Tolak Permintaan Aktivasi
            </h3>
            
            <div className="mb-4 p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>{selectedRequest.partner.business_name}</strong>
              </p>
              <p className="text-sm text-gray-600">
                {selectedRequest.partner.owner_name} • {selectedRequest.partner.email}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alasan Penolakan <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="Berikan alasan penolakan..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="Tambahkan catatan tambahan..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                  setReviewNotes('');
                  setRejectionReason('');
                }}
                disabled={processing}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectionReason}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {processing ? 'Memproses...' : 'Tolak Permintaan'}
              </button>
            </div>
          </div>
        </div>
      )}
      </AdminLayout>
    </>
  );
}
