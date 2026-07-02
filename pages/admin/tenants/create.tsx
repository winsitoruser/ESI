import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  ArrowLeft,
  Building2,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface BusinessType {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
}

export default function CreateTenantPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    businessName: '',
    businessEmail: '',
    businessPhone: '',
    businessAddress: '',
    businessTypeId: '',
    tenantType: 'single', // 'single' or 'multi'
    maxBranches: 1,
    subscriptionPlan: 'basic',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: ''
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/admin/login');
      return;
    }

    if (status === 'authenticated' && session) {
      const userRole = (session.user?.role as string)?.toLowerCase();
      if (!['admin', 'super_admin', 'superadmin'].includes(userRole)) {
        router.push('/admin/login');
        return;
      }
      
      // Only fetch after session is confirmed and role is valid
      fetchBusinessTypes();
    }
  }, [status, session]);

  const fetchBusinessTypes = async () => {
    try {
      const response = await fetch('/api/admin/business-types');
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          router.push('/admin/login');
          return;
        }
        throw new Error(errorData.error || 'Gagal memuat tipe bisnis');
      }

      const data = await response.json();
      setBusinessTypes(data.data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Fetch business types error:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const response = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal membuat tenant');
      }

      const data = await response.json();
      setSuccess(true);
      
      // Display owner credentials if available
      if (data.data.owner && data.data.owner.tempPassword) {
        alert(`Tenant berhasil dibuat!\n\nKredensial Owner:\nEmail: ${data.data.owner.email}\nPassword: ${data.data.owner.tempPassword}\n\nSimpan kredensial ini untuk diberikan kepada owner.`);
      }
      
      setTimeout(() => {
        router.push(`/admin/tenants/${data.data.tenant.id}`);
      }, 2000);

    } catch (err: any) {
      setError(err.message);
      console.error('Create tenant error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Buat Tenant Baru - Panel Admin</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/admin/tenants"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Daftar Tenant
            </Link>
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Buat Tenant Baru</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Tambahkan tenant baru ke sistem
                </p>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-sm text-green-800">
                  Tenant berhasil dibuat! Mengalihkan...
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Tenant Type Selection */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Tipe Tenant</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => setFormData(prev => ({ ...prev, tenantType: 'single', maxBranches: 1 }))}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.tenantType === 'single'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        formData.tenantType === 'single' ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                        {formData.tenantType === 'single' && (
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">Single Branch</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Untuk bisnis dengan satu lokasi/cabang. Cocok untuk UMKM dan bisnis kecil.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setFormData(prev => ({ ...prev, tenantType: 'multi', maxBranches: 5 }))}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.tenantType === 'multi'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        formData.tenantType === 'multi' ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                        {formData.tenantType === 'multi' && (
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">Multi Branch (HQ-Based)</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Untuk bisnis dengan multiple cabang. Sistem HQ untuk sinkronisasi data antar cabang.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Plan Selection */}
              <div className="pt-6 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Paket Layanan</h2>
                <p className="text-sm text-gray-600 mb-4">Pilih paket layanan sesuai kebutuhan tenant</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    onClick={() => setFormData(prev => ({ ...prev, subscriptionPlan: 'basic' }))}
                    className={`p-5 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.subscriptionPlan === 'basic'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        formData.subscriptionPlan === 'basic' ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                        {formData.subscriptionPlan === 'basic' && (
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-3">Basic</h3>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            Maksimal 5 pengguna
                          </li>
                          <li className="flex items-center text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            1 cabang
                          </li>
                          <li className="flex items-center text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            Fitur POS dasar
                          </li>
                          <li className="flex items-center text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            Inventori & Stok
                          </li>
                          <li className="flex items-center text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            Laporan dasar
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setFormData(prev => ({ ...prev, subscriptionPlan: 'professional' }))}
                    className={`p-5 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.subscriptionPlan === 'professional'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        formData.subscriptionPlan === 'professional' ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                        {formData.subscriptionPlan === 'professional' && (
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-3">Professional</h3>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            Maksimal 20 pengguna
                          </li>
                          <li className="flex items-center text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            Hingga 5 cabang
                          </li>
                          <li className="flex items-center text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            Semua fitur Basic
                          </li>
                          <li className="flex items-center text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            Analytics & Dashboard
                          </li>
                          <li className="flex items-center text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            Multi-branch sync
                          </li>
                          <li className="flex items-center text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            Manajemen karyawan
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setFormData(prev => ({ ...prev, subscriptionPlan: 'enterprise' }))}
                    className={`p-5 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.subscriptionPlan === 'enterprise'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        formData.subscriptionPlan === 'enterprise' ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                        {formData.subscriptionPlan === 'enterprise' && (
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-3">Enterprise</h3>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            Pengguna unlimited
                          </li>
                          <li className="flex items-center text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            Cabang unlimited
                          </li>
                          <li className="flex items-center text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            Semua fitur Professional
                          </li>
                          <li className="flex items-center text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            API & Integrasi
                          </li>
                          <li className="flex items-center text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            Custom modules
                          </li>
                          <li className="flex items-center text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            Priority support
                          </li>
                          <li className="flex items-center text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            Dedicated account manager
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div className="pt-6 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Bisnis</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Bisnis <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Contoh: Toko Maju Jaya"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Bisnis <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="businessEmail"
                      value={formData.businessEmail}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="bisnis@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telepon Bisnis <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="businessPhone"
                      value={formData.businessPhone}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="08123456789"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alamat Bisnis <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="businessAddress"
                      value={formData.businessAddress}
                      onChange={handleChange}
                      required
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Alamat lengkap bisnis"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipe Bisnis <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="businessTypeId"
                      value={formData.businessTypeId}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Pilih Tipe Bisnis</option>
                      {businessTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name} - {type.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Owner Information */}
              <div className="pt-6 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Pemilik</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Pemilik <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nama lengkap pemilik"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Pemilik <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="ownerEmail"
                      value={formData.ownerEmail}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="pemilik@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telepon Pemilik <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="ownerPhone"
                      value={formData.ownerPhone}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="08123456789"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6 border-t border-gray-200 flex items-center justify-end space-x-4">
                <Link
                  href="/admin/tenants"
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {loading ? 'Menyimpan...' : 'Buat Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
