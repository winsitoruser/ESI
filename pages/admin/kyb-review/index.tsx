import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search, Filter, Eye, CheckCircle2, XCircle, Clock, FileText,
  Building2, ChevronLeft, ChevronRight, Loader2, RefreshCw,
  AlertTriangle, Users, MapPin, ArrowUpDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/admin/AdminLayout';

interface KybRow {
  id: string;
  business_name: string;
  business_category: string;
  legal_entity_type: string;
  business_structure: string;
  status: string;
  current_step: number;
  completion_percentage: number;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  pic_name: string;
  pic_phone: string;
  business_city: string;
  business_province: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  tenant_id: string;
  document_count: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: FileText },
  submitted: { label: 'Menunggu Review', color: 'bg-amber-100 text-amber-800', icon: Clock },
  in_review: { label: 'Sedang Direview', color: 'bg-blue-100 text-blue-800', icon: Eye },
  approved: { label: 'Disetujui', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-800', icon: XCircle },
  revision_needed: { label: 'Perlu Revisi', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
};

const categoryLabels: Record<string, string> = {
  fnb: 'F&B / Restoran',
  retail: 'Retail / Toko',
  fashion: 'Fashion',
  beauty: 'Beauty & Salon',
  grocery: 'Grocery',
  pharmacy: 'Apotek',
  electronics: 'Elektronik',
  automotive: 'Otomotif',
  services: 'Jasa / Layanan',
  other: 'Lainnya',
};

const legalLabels: Record<string, string> = {
  perorangan: 'Perorangan',
  ud: 'UD',
  cv: 'CV',
  pt: 'PT',
  koperasi: 'Koperasi',
};

export default function KybReviewList() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<KybRow[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/admin/login');
    }
    if (sessionStatus === 'authenticated') {
      const userRole = (session?.user?.role as string)?.toLowerCase();
      if (!['admin', 'super_admin', 'superadmin'].includes(userRole)) {
        router.push('/admin/login');
        return;
      }
      fetchApplications();
    }
  }, [sessionStatus, statusFilter, pagination.page]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/admin/kyb?${params}`);
      const json = await res.json();
      if (json.success) {
        setApplications(json.data);
        setPagination(prev => ({ ...prev, ...json.pagination }));
      }
    } catch {
      toast.error('Gagal memuat data KYB');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchApplications();
  };

  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (sessionStatus === 'loading') {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>KYB Review - Admin Panel | BEDAGANG</title>
      </Head>

      <AdminLayout>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">KYB Review</h1>
              <p className="text-sm text-gray-500">Kelola dan review aplikasi Know Your Business</p>
            </div>
            <button
              onClick={fetchApplications}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div>
          {/* Status Filter Tabs */}
          <div className="flex items-center space-x-2 mb-6 overflow-x-auto pb-2">
            {[
              { value: 'all', label: 'Semua' },
              { value: 'submitted', label: 'Menunggu Review' },
              { value: 'in_review', label: 'Sedang Direview' },
              { value: 'revision_needed', label: 'Perlu Revisi' },
              { value: 'approved', label: 'Disetujui' },
              { value: 'rejected', label: 'Ditolak' },
              { value: 'draft', label: 'Draft' },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  statusFilter === tab.value
                    ? 'bg-sky-100 text-sky-800 shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama bisnis, nama user, atau email..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              />
            </div>
          </form>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-20">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Belum ada aplikasi KYB</p>
                <p className="text-sm text-gray-400 mt-1">Aplikasi akan muncul setelah pengguna mendaftar dan mengisi data KYB</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Bisnis</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pendaftar</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kategori</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Legalitas</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Struktur</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Progres</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {applications.map((app, idx) => {
                      const st = statusConfig[app.status] || statusConfig.draft;
                      const StatusIcon = st.icon;
                      return (
                        <motion.tr
                          key={app.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.03 }}
                          className="hover:bg-gray-50 transition"
                        >
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{app.business_name}</div>
                              {app.business_city && (
                                <div className="text-xs text-gray-400 flex items-center space-x-1 mt-0.5">
                                  <MapPin className="w-3 h-3" />
                                  <span>{app.business_city}{app.business_province ? `, ${app.business_province}` : ''}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="text-sm text-gray-900">{app.user_name}</div>
                              <div className="text-xs text-gray-400">{app.user_email}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-700">{categoryLabels[app.business_category] || app.business_category || '-'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-700">{legalLabels[app.legal_entity_type] || app.legal_entity_type || '-'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                              app.business_structure === 'multi_branch' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {app.business_structure === 'multi_branch' ? 'Multi-Branch' : 'Single'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center space-x-1 text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              <span>{st.label}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full bg-sky-500"
                                  style={{ width: `${app.completion_percentage}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{app.completion_percentage}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-gray-500">
                              {app.submitted_at
                                ? new Date(app.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                : new Date(app.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                              }
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Link
                              href={`/admin/kyb-review/${app.id}`}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-sky-50 text-sky-700 rounded-lg text-xs font-medium hover:bg-sky-100 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Review</span>
                            </Link>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <span className="text-sm text-gray-500">
                  Menampilkan {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page <= 1}
                    className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-white transition disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-gray-700">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-white transition disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
