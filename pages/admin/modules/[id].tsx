// Module Edit Page
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Save, ArrowLeft, Trash2, AlertCircle, Package, CheckCircle, XCircle,
  Layers, Zap, Shield, Users, Link2, Hash, Code, FileText, GitBranch
} from 'lucide-react';

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

interface ModuleDetail {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  sortOrder: number;
  isCore: boolean;
  isActive: boolean;
  category: string;
  pricingTier: string;
  setupComplexity: string;
  color: string;
  version: string;
  features: string[];
  tags: string[];
  tenantCount: number;
  totalTenants: number;
  businessTypes: Array<{
    id: string;
    code: string;
    name: string;
    BusinessTypeModule: { isDefault: boolean; isOptional: boolean };
  }>;
  dependencies: Array<{ id: string; moduleCode: string; moduleName: string; type: string }>;
  dependedBy: Array<{ id: string; moduleCode: string; moduleName: string; type: string }>;
  subModules: Array<{ id: string; code: string; name: string; isActive: boolean }>;
}

interface BusinessType {
  id: string;
  code: string;
  name: string;
}

export default function ModuleEditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;

  const [module, setModule] = useState<ModuleDetail | null>(null);
  const [allBusinessTypes, setAllBusinessTypes] = useState<BusinessType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [featuresInput, setFeaturesInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const [formData, setFormData] = useState({
    name: '', description: '', icon: 'Package', route: '', sortOrder: 0,
    isActive: true, category: 'operations', pricingTier: 'basic',
    setupComplexity: 'simple', color: '#3B82F6', version: '1.0.0'
  });

  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<Map<string, { isDefault: boolean; isOptional: boolean }>>(new Map());

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/admin/login'); return; }
    const userRole = (session?.user?.role as string)?.toLowerCase();
    if (session && !['admin', 'super_admin', 'superadmin'].includes(userRole)) { router.push('/admin/login'); return; }
    if (status === 'authenticated' && id) { fetchModule(); fetchBusinessTypes(); }
  }, [status, session, router, id]);

  const fetchModule = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/modules/${id}`);
      if (!res.ok) throw new Error('Failed to fetch module');
      const data = await res.json();
      const m = data.data;
      setModule(m);
      setFormData({
        name: m.name || '', description: m.description || '', icon: m.icon || 'Package',
        route: m.route || '', sortOrder: m.sortOrder || 0, isActive: m.isActive,
        category: m.category || 'operations', pricingTier: m.pricingTier || 'basic',
        setupComplexity: m.setupComplexity || 'simple', color: m.color || '#3B82F6',
        version: m.version || '1.0.0'
      });
      setFeaturesInput(Array.isArray(m.features) ? m.features.join('\n') : '');
      setTagsInput(Array.isArray(m.tags) ? m.tags.join(', ') : '');
      const btMap = new Map();
      m.businessTypes?.forEach((bt: any) => {
        btMap.set(bt.id, { isDefault: bt.BusinessTypeModule?.isDefault ?? true, isOptional: bt.BusinessTypeModule?.isOptional ?? false });
      });
      setSelectedBusinessTypes(btMap);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const fetchBusinessTypes = async () => {
    try {
      const res = await fetch('/api/admin/business-types');
      if (!res.ok) return;
      const data = await res.json();
      setAllBusinessTypes(data.data || []);
    } catch (err) { console.error('Error fetching business types:', err); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true); setError(null); setSuccess(null);
      const features = featuresInput.split('\n').map(f => f.trim()).filter(Boolean);
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const businessTypes = Array.from(selectedBusinessTypes.entries()).map(([btId, config]) => ({
        businessTypeId: btId, isDefault: config.isDefault, isOptional: config.isOptional
      }));
      const res = await fetch(`/api/admin/modules/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, features, tags, businessTypes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update module');
      setSuccess('Modul berhasil diperbarui!');
      setTimeout(() => router.push('/admin/modules'), 1500);
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus modul ini? Tindakan ini tidak dapat dibatalkan.')) return;
    try {
      setDeleting(true); setError(null);
      const res = await fetch(`/api/admin/modules/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete module');
      setSuccess('Modul berhasil dihapus!');
      setTimeout(() => router.push('/admin/modules'), 1500);
    } catch (err: any) { setError(err.message); } finally { setDeleting(false); }
  };

  const toggleBusinessType = (btId: string) => {
    const newMap = new Map(selectedBusinessTypes);
    if (newMap.has(btId)) newMap.delete(btId);
    else newMap.set(btId, { isDefault: true, isOptional: false });
    setSelectedBusinessTypes(newMap);
  };

  const updateBusinessTypeConfig = (btId: string, field: 'isDefault' | 'isOptional', value: boolean) => {
    const newMap = new Map(selectedBusinessTypes);
    const current = newMap.get(btId);
    if (current) { newMap.set(btId, { ...current, [field]: value }); setSelectedBusinessTypes(newMap); }
  };

  const isSuperAdmin = ['super_admin', 'superadmin'].includes((session?.user?.role as string)?.toLowerCase() || '');

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading module...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && !module) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="mt-4 text-gray-600">{error}</p>
            <button onClick={() => router.push('/admin/modules')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Kembali ke Modul
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Edit {module?.name} - Admin Bedagang</title>
      </Head>

      <AdminLayout>
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin/modules" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-3">
            <ArrowLeft className="h-4 w-4 mr-1" /> Kembali ke Modul
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: (module?.color || '#3B82F6') + '20' }}>
              <Package className="w-5 h-5" style={{ color: module?.color || '#3B82F6' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit: {module?.name}</h1>
              <p className="text-sm text-gray-500 font-mono">{module?.code}</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
            {/* Left — Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h2 className="text-base font-semibold text-gray-900">Informasi Dasar</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Kode Modul</label>
                    <input type="text" value={module?.code || ''} disabled
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 font-mono" />
                    <p className="text-xs text-gray-400 mt-1">Kode tidak dapat diubah</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Modul *</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Route</label>
                    <input type="text" value={formData.route} onChange={(e) => setFormData({...formData, route: e.target.value})}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="/hq/..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Sort Order</label>
                    <input type="number" value={formData.sortOrder} onChange={(e) => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
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
                    <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      {CATEGORY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Pricing Tier</label>
                    <select value={formData.pricingTier} onChange={(e) => setFormData({...formData, pricingTier: e.target.value})}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="basic">Basic (Free)</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Kompleksitas Setup</label>
                    <select value={formData.setupComplexity} onChange={(e) => setFormData({...formData, setupComplexity: e.target.value})}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="simple">Simple</option>
                      <option value="moderate">Moderate</option>
                      <option value="complex">Complex</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Icon</label>
                    <select value={formData.icon} onChange={(e) => setFormData({...formData, icon: e.target.value})}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Warna</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})}
                        className="w-10 h-10 rounded border border-gray-300 cursor-pointer" />
                      <input type="text" value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Versi</label>
                    <input type="text" value={formData.version} onChange={(e) => setFormData({...formData, version: e.target.value})}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
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
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="Satu fitur per baris" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags</label>
                    <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                      className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="basic, free, operations" />
                  </div>
                </div>
              </div>

              {/* Business Type Associations */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Users className="h-5 w-5 text-cyan-600" />
                  <h2 className="text-base font-semibold text-gray-900">Asosiasi Tipe Bisnis</h2>
                </div>
                {allBusinessTypes.length === 0 ? (
                  <p className="text-sm text-gray-400">Tidak ada tipe bisnis tersedia</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {allBusinessTypes.map((bt) => {
                      const isSelected = selectedBusinessTypes.has(bt.id);
                      const config = selectedBusinessTypes.get(bt.id);
                      return (
                        <div key={bt.id} className={`border rounded-lg p-3 transition-all ${isSelected ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'}`}>
                          <div className="flex items-start gap-2">
                            <input type="checkbox" id={`bt-${bt.id}`} checked={isSelected} onChange={() => toggleBusinessType(bt.id)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <label htmlFor={`bt-${bt.id}`} className="block text-sm font-medium text-gray-900 cursor-pointer">{bt.name}</label>
                              <p className="text-xs text-gray-400 font-mono">{bt.code}</p>
                              {isSelected && (
                                <div className="mt-2 flex gap-4">
                                  <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                                    <input type="checkbox" checked={config?.isDefault || false} onChange={(e) => updateBusinessTypeConfig(bt.id, 'isDefault', e.target.checked)}
                                      className="h-3 w-3 text-blue-600 border-gray-300 rounded" />
                                    Default
                                  </label>
                                  <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                                    <input type="checkbox" checked={config?.isOptional || false} onChange={(e) => updateBusinessTypeConfig(bt.id, 'isOptional', e.target.checked)}
                                      className="h-3 w-3 text-blue-600 border-gray-300 rounded" />
                                    Optional
                                  </label>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right — Sidebar */}
            <div className="space-y-6">
              {/* Module Settings */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Pengaturan</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Aktif</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Statistik</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Tenants Aktif</span>
                    <span className="text-lg font-bold text-gray-900">{module?.tenantCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Total Tenants</span>
                    <span className="text-sm text-gray-600">{module?.totalTenants || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Tipe</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      module?.isCore ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                    }`}>{module?.isCore ? 'Core' : 'Optional'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Status</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      formData.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>{formData.isActive ? 'Aktif' : 'Nonaktif'}</span>
                  </div>
                </div>
              </div>

              {/* Dependencies */}
              {(module?.dependencies?.length || module?.dependedBy?.length) ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <GitBranch className="h-4 w-4 text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-900">Dependensi</h3>
                  </div>
                  {module?.dependencies && module.dependencies.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-400 uppercase font-semibold mb-1.5">Membutuhkan</p>
                      <div className="space-y-1">
                        {module.dependencies.map((d, i) => (
                          <div key={i} className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                            d.type === 'required' ? 'bg-red-50 text-red-700' :
                            d.type === 'recommended' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-gray-50 text-gray-600'
                          }`}>
                            <span className="font-mono">{d.moduleCode}</span>
                            <span className="text-[10px] opacity-70">{d.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {module?.dependedBy && module.dependedBy.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold mb-1.5">Dibutuhkan oleh</p>
                      <div className="space-y-1">
                        {module.dependedBy.map((d, i) => (
                          <div key={i} className="flex items-center justify-between px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs">
                            <span className="font-mono">{d.moduleCode}</span>
                            <span className="text-[10px] opacity-70">{d.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Actions */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
                <button type="submit" disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <Save className="h-4 w-4" />
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>

                {!module?.isCore && isSuperAdmin && (
                  <button type="button" onClick={handleDelete}
                    disabled={deleting || (module?.tenantCount || 0) > 0}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <Trash2 className="h-4 w-4" />
                    {deleting ? 'Menghapus...' : 'Hapus Modul'}
                  </button>
                )}

                {(module?.tenantCount || 0) > 0 && !module?.isCore && (
                  <p className="text-xs text-gray-500 text-center">
                    Tidak dapat dihapus: Digunakan oleh {module?.tenantCount} tenant
                  </p>
                )}

                {(module?.dependedBy?.length || 0) > 0 && !module?.isCore && (
                  <p className="text-xs text-gray-500 text-center">
                    Tidak dapat dihapus: {module?.dependedBy?.length} modul lain bergantung pada ini
                  </p>
                )}
              </div>
            </div>
          </div>
        </form>
      </AdminLayout>
    </>
  );
}
