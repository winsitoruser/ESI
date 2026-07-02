import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Package,
  TrendingUp,
  Building2,
  CheckCircle,
  Plus,
  Edit,
  Eye,
  Search,
  Boxes,
  Users,
  AlertCircle,
  RefreshCw,
  XCircle
} from 'lucide-react';

interface BusinessType {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
  stats: {
    totalTenants: number;
    defaultModulesCount: number;
    optionalModulesCount: number;
    totalModulesCount: number;
  };
  businessTypeModules: Array<{
    isDefault: boolean;
    isOptional: boolean;
    module: {
      id: string;
      code: string;
      name: string;
      icon: string;
    };
  }>;
}

const businessTypeIcons: Record<string, string> = {
  fnb: '🍽️',
  retail: '🛒',
  fashion: '👔',
  beauty: '💄',
  grocery: '🛍️',
  pharmacy: '💊',
  electronics: '📱',
  automotive: '🚗',
  services: '🔧',
  other: '📦',
  hybrid: '🏪',
};

export default function BusinessTypesManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newBt, setNewBt] = useState({ code: '', name: '', description: '', icon: '' });
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
      return;
    }

    const userRole = (session?.user?.role as string)?.toLowerCase();
    if (session && !['admin', 'super_admin', 'superadmin'].includes(userRole)) {
      router.push('/admin/dashboard');
      return;
    }

    if (status === 'authenticated') {
      fetchBusinessTypes();
    }
  }, [status, session, router]);

  const fetchBusinessTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/business-types');
      
      if (!response.ok) {
        throw new Error('Gagal memuat jenis bisnis');
      }

      const data = await response.json();
      setBusinessTypes(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newBt.code.trim() || !newBt.name.trim()) {
      setCreateError('Kode dan nama wajib diisi');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);
      const response = await fetch('/api/admin/business-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBt),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Gagal membuat jenis bisnis');
      }

      setShowCreateModal(false);
      setNewBt({ code: '', name: '', description: '', icon: '' });
      fetchBusinessTypes();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const filteredTypes = businessTypes.filter(bt =>
    bt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bt.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bt.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalTenants = businessTypes.reduce((sum, bt) => sum + (bt.stats?.totalTenants || 0), 0);
  const totalModules = businessTypes.reduce((sum, bt) => sum + (bt.stats?.totalModulesCount || 0), 0);
  const activeTypes = businessTypes.filter(bt => bt.isActive !== false).length;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat jenis bisnis...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Jenis Bisnis - Panel Admin Bedagang</title>
      </Head>

      <AdminLayout>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Jenis Bisnis</h1>
              <p className="mt-1 text-sm text-gray-500">
                Kelola jenis bisnis, modul default, dan mapping ke onboarding KYB
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchBusinessTypes}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Jenis Bisnis
              </button>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Jenis Bisnis</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{businessTypes.length}</p>
                <p className="text-xs text-green-600 mt-1">{activeTypes} aktif</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Total Tenant</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalTenants}</p>
                <p className="text-xs text-gray-500 mt-1">Semua jenis bisnis</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Total Mapping Modul</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalModules}</p>
                <p className="text-xs text-gray-500 mt-1">Default + opsional</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Boxes className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Rata-rata Modul</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {businessTypes.length > 0 ? Math.round(totalModules / businessTypes.length) : 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">Per jenis bisnis</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari jenis bisnis..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Business Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-8">
          {filteredTypes.map((bt) => (
            <div
              key={bt.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all group"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{businessTypeIcons[bt.code] || '📦'}</span>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{bt.name}</h3>
                      <div className="flex items-center space-x-2">
                        <code className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{bt.code}</code>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          bt.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {bt.isActive !== false ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {bt.description || 'Tidak ada deskripsi'}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                    <p className="text-lg font-bold text-blue-600">{bt.stats?.totalTenants || 0}</p>
                    <p className="text-xs text-gray-500">Tenant</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
                    <p className="text-lg font-bold text-emerald-600">{bt.stats?.defaultModulesCount || 0}</p>
                    <p className="text-xs text-gray-500">Default</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2.5 text-center">
                    <p className="text-lg font-bold text-amber-600">{bt.stats?.optionalModulesCount || 0}</p>
                    <p className="text-xs text-gray-500">Opsional</p>
                  </div>
                </div>

                {/* Module Tags */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1.5">Modul Default:</p>
                  <div className="flex flex-wrap gap-1">
                    {(bt.businessTypeModules || [])
                      .filter(btm => btm.isDefault)
                      .slice(0, 6)
                      .map((btm) => (
                        <span
                          key={btm.module?.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700"
                        >
                          {btm.module?.name}
                        </span>
                      ))}
                    {(bt.businessTypeModules || []).filter(btm => btm.isDefault).length > 6 && (
                      <span className="text-xs text-gray-400 px-1">
                        +{(bt.businessTypeModules || []).filter(btm => btm.isDefault).length - 6} lainnya
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
                  <Link
                    href={`/admin/business-types/${bt.id}`}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1.5" />
                    Edit & Kelola Modul
                  </Link>
                  <Link
                    href={`/admin/tenants?businessType=${bt.code}`}
                    className="inline-flex items-center justify-center px-3 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 transition"
                    title="Lihat tenant"
                  >
                    <Users className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTypes.length === 0 && !loading && (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
            <Package className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-medium text-gray-900">
              {searchTerm ? 'Tidak ada hasil' : 'Belum ada jenis bisnis'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? `Tidak ditemukan jenis bisnis untuk "${searchTerm}"`
                : 'Jalankan script seed atau tambah jenis bisnis baru'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Jenis Bisnis
              </button>
            )}
          </div>
        )}

        {/* KYB Integration Info */}
        <div className="mt-6 bg-sky-50 border border-sky-200 rounded-xl p-5">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-sky-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-sky-900">Integrasi KYB & Onboarding</h4>
              <p className="text-xs text-sky-700 mt-1">
                Kode jenis bisnis (<code className="bg-sky-100 px-1 rounded">fnb</code>, <code className="bg-sky-100 px-1 rounded">retail</code>, dll.) harus sesuai dengan kategori bisnis di form KYB onboarding.
                Saat admin menyetujui KYB, sistem otomatis mengaktifkan modul default sesuai jenis bisnis tenant.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {['fnb', 'retail', 'fashion', 'beauty', 'grocery', 'pharmacy', 'electronics', 'automotive', 'services', 'other'].map(code => {
                  const exists = businessTypes.some(bt => bt.code === code);
                  return (
                    <span
                      key={code}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        exists ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {exists ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                      {code}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
              <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Tambah Jenis Bisnis Baru</h3>

                {createError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    {createError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kode *</label>
                    <input
                      type="text"
                      value={newBt.code}
                      onChange={(e) => setNewBt({ ...newBt, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      placeholder="contoh: wholesale"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">Huruf kecil, tanpa spasi. Harus unik.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
                    <input
                      type="text"
                      value={newBt.name}
                      onChange={(e) => setNewBt({ ...newBt, name: e.target.value })}
                      placeholder="contoh: Wholesale / Grosir"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                    <textarea
                      value={newBt.description}
                      onChange={(e) => setNewBt({ ...newBt, description: e.target.value })}
                      rows={3}
                      placeholder="Deskripsi singkat jenis bisnis..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                    <input
                      type="text"
                      value={newBt.icon}
                      onChange={(e) => setNewBt({ ...newBt, icon: e.target.value })}
                      placeholder="contoh: ShoppingBag"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">Nama icon dari Lucide (opsional)</p>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    onClick={() => { setShowCreateModal(false); setCreateError(null); }}
                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {creating ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}
