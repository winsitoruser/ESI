import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeft, Package, Save, X, Code, FileText, Link2, Hash,
  Palette, Tag, Layers, Zap, Shield
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

const ICON_OPTIONS = [
  'Package', 'ShoppingCart', 'Users', 'BarChart3', 'Settings', 'Wallet',
  'Truck', 'Store', 'UserCheck', 'Briefcase', 'Megaphone', 'Globe',
  'MessageCircle', 'Target', 'Award', 'Factory', 'Send', 'Plug',
  'Shield', 'Layers', 'LayoutDashboard', 'Calendar', 'ChefHat',
  'Utensils', 'Ticket', 'Clock', 'Building2'
];

const CATEGORY_OPTIONS = [
  { value: 'core', label: 'Sistem Inti' },
  { value: 'operations', label: 'Operasional' },
  { value: 'finance', label: 'Keuangan' },
  { value: 'hr', label: 'SDM & HR' },
  { value: 'crm', label: 'CRM' },
  { value: 'sales', label: 'Sales & Marketing' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'analytics', label: 'Analitik' },
  { value: 'integration', label: 'Integrasi' },
  { value: 'system', label: 'Sistem' },
];

export default function NewModule() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featuresInput, setFeaturesInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    icon: 'Package',
    route: '',
    sortOrder: 0,
    isCore: false,
    isActive: true,
    category: 'operations',
    pricingTier: 'basic',
    setupComplexity: 'simple',
    color: '#3B82F6',
    version: '1.0.0',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const features = featuresInput.split('\n').map(f => f.trim()).filter(Boolean);
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

      const response = await fetch('/api/admin/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, features, tags }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create module');
      }

      const data = await response.json();
      router.push(`/admin/modules/${data.data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target;
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked
      : target.type === 'number' ? parseInt(target.value) || 0
      : target.value;
    setFormData({ ...formData, [target.name]: value });
  };

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
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Buat Modul Baru - Admin Panel</title>
      </Head>

      <AdminLayout>
        {/* Header */}
        <div className="mb-6 flex items-center space-x-4">
          <Link href="/admin/modules" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Buat Modul Baru</h1>
            <p className="text-sm text-gray-500">Tambah modul baru ke platform</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-w-5xl pb-8">
          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
              <X className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column — Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h2 className="text-base font-semibold text-gray-900">Informasi Dasar</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Kode Modul *</label>
                    <div className="relative">
                      <Code className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="text" name="code" value={formData.code} onChange={handleChange} required
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="contoh: pos, inventory" />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Huruf kecil, angka, underscore. Unik.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Modul *</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="text" name="name" value={formData.name} onChange={handleChange} required
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="contoh: Point of Sale" />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} rows={3}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Jelaskan fungsi dan kegunaan modul ini" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Route</label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="text" name="route" value={formData.route} onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="/hq/pos" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Sort Order</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="number" name="sortOrder" value={formData.sortOrder} onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Classification */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Layers className="h-5 w-5 text-purple-600" />
                  <h2 className="text-base font-semibold text-gray-900">Klasifikasi</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Kategori</label>
                    <select name="category" value={formData.category} onChange={handleChange}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      {CATEGORY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Pricing Tier</label>
                    <select name="pricingTier" value={formData.pricingTier} onChange={handleChange}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="basic">Basic (Free)</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Kompleksitas Setup</label>
                    <select name="setupComplexity" value={formData.setupComplexity} onChange={handleChange}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="simple">Simple</option>
                      <option value="moderate">Moderate</option>
                      <option value="complex">Complex</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Icon</label>
                    <select name="icon" value={formData.icon} onChange={handleChange}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Warna</label>
                    <div className="flex items-center gap-2">
                      <input type="color" name="color" value={formData.color} onChange={handleChange}
                        className="w-10 h-10 rounded border border-gray-300 cursor-pointer" />
                      <input type="text" value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Versi</label>
                    <input type="text" name="version" value={formData.version} onChange={handleChange}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="1.0.0" />
                  </div>
                </div>
              </div>

              {/* Features & Tags */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Zap className="h-5 w-5 text-amber-600" />
                  <h2 className="text-base font-semibold text-gray-900">Fitur & Tags</h2>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Daftar Fitur</label>
                    <textarea value={featuresInput} onChange={(e) => setFeaturesInput(e.target.value)} rows={5}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      placeholder="Satu fitur per baris, contoh:&#10;Kasir digital&#10;Multi payment&#10;Cetak struk thermal" />
                    <p className="text-xs text-gray-400 mt-1">Satu fitur per baris</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags</label>
                    <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="basic, free, operations (pisahkan dengan koma)" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column — Settings & Actions */}
            <div className="space-y-6">
              {/* Module Settings */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Shield className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-base font-semibold text-gray-900">Pengaturan</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Core Module</p>
                      <p className="text-xs text-gray-500">Tidak bisa dinonaktifkan</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" name="isCore" checked={formData.isCore} onChange={handleChange} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Aktif</p>
                      <p className="text-xs text-gray-500">Tersedia untuk digunakan</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Preview</h3>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: formData.color + '20' }}>
                      <Package className="w-5 h-5" style={{ color: formData.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{formData.name || 'Nama Modul'}</p>
                      <p className="text-xs text-gray-400 font-mono">{formData.code || 'kode_modul'}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{formData.description || 'Deskripsi modul'}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.isCore && <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700">CORE</span>}
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      formData.pricingTier === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                      formData.pricingTier === 'professional' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>{formData.pricingTier}</span>
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-500">v{formData.version}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <Save className="h-4 w-4" />
                  {loading ? 'Membuat...' : 'Buat Modul'}
                </button>
                <Link href="/admin/modules"
                  className="w-full flex items-center justify-center px-4 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                  Batal
                </Link>
              </div>
            </div>
          </div>
        </form>
      </AdminLayout>
    </>
  );
}
