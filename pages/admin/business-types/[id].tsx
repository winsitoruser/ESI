// Business Type Edit Page
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Save,
  ArrowLeft,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  ShoppingBag,
  Package
} from 'lucide-react';

interface BusinessType {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
  tenantCount: number;
  modules: Array<{
    id: string;
    code: string;
    name: string;
    description: string;
    icon: string;
    BusinessTypeModule: {
      isDefault: boolean;
      isOptional: boolean;
    };
  }>;
}

interface Module {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  isAssociated: boolean;
  isDefault: boolean;
  isOptional: boolean;
}

export default function BusinessTypeEditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;

  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    isActive: true
  });

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
      fetchBusinessType();
      fetchModules();
    }
  }, [status, session, router, id]);

  const fetchBusinessType = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/business-types/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch business type');
      }

      const data = await response.json();
      setBusinessType(data.data);

      // Set form data
      setFormData({
        name: data.data.name,
        description: data.data.description || '',
        icon: data.data.icon || '',
        isActive: data.data.isActive
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async () => {
    try {
      const response = await fetch(`/api/admin/business-types/${id}/modules`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch modules');
      }

      const data = await response.json();
      setModules(data.data.modules || []);
    } catch (err: any) {
      console.error('Error fetching modules:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/admin/business-types/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update business type');
      }

      setSuccess('Business type updated successfully!');
      setTimeout(() => {
        router.push('/admin/business-types');
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveModules = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const modulesData = modules.map(m => ({
        moduleId: m.id,
        isAssociated: m.isAssociated,
        isDefault: m.isDefault,
        isOptional: m.isOptional
      }));

      const response = await fetch(`/api/admin/business-types/${id}/modules`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ modules: modulesData })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update modules');
      }

      setSuccess('Modules updated successfully!');
      fetchBusinessType();
      fetchModules();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this business type? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);

      const response = await fetch(`/api/admin/business-types/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete business type');
      }

      setSuccess('Business type deleted successfully!');
      setTimeout(() => {
        router.push('/admin/business-types');
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setModules(modules.map(m => 
      m.id === moduleId 
        ? { ...m, isAssociated: !m.isAssociated, isDefault: !m.isAssociated ? true : m.isDefault }
        : m
    ));
  };

  const updateModuleConfig = (moduleId: string, field: 'isDefault' | 'isOptional', value: boolean) => {
    setModules(modules.map(m => 
      m.id === moduleId ? { ...m, [field]: value } : m
    ));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading business type...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && !businessType) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="mt-4 text-gray-600">Error: {error}</p>
            <button
              onClick={() => router.push('/admin/business-types')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Kembali ke Jenis Bisnis
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Edit Business Type - {businessType?.name} - Bedagang Admin</title>
      </Head>

      <AdminLayout>
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/business-types')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Jenis Bisnis
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Ubah Jenis Bisnis</h1>
          <p className="mt-2 text-sm text-gray-600">
            Perbarui konfigurasi jenis bisnis dan asosiasi modul
          </p>
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
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Business Type Information */}
            <form onSubmit={handleSubmit}>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Type Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Type Code
                    </label>
                    <input
                      type="text"
                      value={businessType?.code || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Code cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Type Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icon
                    </label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="e.g., ShoppingBag"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                      Business type is active
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      <span>{saving ? 'Menyimpan...' : 'Simpan Informasi'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Module Associations */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Asosiasi Modul</h2>
                <button
                  onClick={handleSaveModules}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Menyimpan...' : 'Simpan Modul'}</span>
                </button>
              </div>
              
              <div className="space-y-3">
                {modules.map((module) => (
                  <div key={module.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id={`module-${module.id}`}
                        checked={module.isAssociated}
                        onChange={() => toggleModule(module.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                      />
                      <div className="ml-3 flex-1">
                        <label htmlFor={`module-${module.id}`} className="block text-sm font-medium text-gray-900">
                          {module.name}
                        </label>
                        <p className="text-xs text-gray-500">{module.code}</p>
                        {module.description && (
                          <p className="text-xs text-gray-600 mt-1">{module.description}</p>
                        )}

                        {module.isAssociated && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id={`default-${module.id}`}
                                checked={module.isDefault}
                                onChange={(e) => updateModuleConfig(module.id, 'isDefault', e.target.checked)}
                                className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label htmlFor={`default-${module.id}`} className="ml-2 text-xs text-gray-600">
                                Default module (enabled by default for new tenants)
                              </label>
                            </div>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id={`optional-${module.id}`}
                                checked={module.isOptional}
                                onChange={(e) => updateModuleConfig(module.id, 'isOptional', e.target.checked)}
                                className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label htmlFor={`optional-${module.id}`} className="ml-2 text-xs text-gray-600">
                                Optional module (can be disabled by tenants)
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Business Type Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Business Type Stats</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Tenants Using</p>
                  <p className="text-2xl font-bold text-gray-900">{businessType?.tenantCount || 0}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Total Modules</p>
                  <p className="text-2xl font-bold text-gray-900">{modules.filter(m => m.isAssociated).length}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Default Modules</p>
                  <p className="text-2xl font-bold text-gray-900">{modules.filter(m => m.isAssociated && m.isDefault).length}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    businessType?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {businessType?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            {session?.user?.role === 'super_admin' && (
              <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
                <h3 className="text-sm font-semibold text-red-900 mb-4">Danger Zone</h3>
                
                <button
                  onClick={handleDelete}
                  disabled={deleting || (businessType?.tenantCount || 0) > 0}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{deleting ? 'Deleting...' : 'Delete Business Type'}</span>
                </button>

                {(businessType?.tenantCount || 0) > 0 && (
                  <p className="text-xs text-red-600 text-center mt-2">
                    Cannot delete: Business type is used by {businessType?.tenantCount} tenant(s)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
