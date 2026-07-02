import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Package,
  CheckCircle,
  XCircle,
  Building2
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

interface Module {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  isCore: boolean;
  isEnabled: boolean;
}

interface TenantModule {
  id: string;
  moduleId: string;
  isEnabled: boolean;
  enabledAt: string;
  disabledAt: string | null;
  module: Module;
}

export default function TenantModulesManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [tenant, setTenant] = useState<any>(null);
  const [tenantModules, setTenantModules] = useState<TenantModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<Map<string, boolean>>(new Map());

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
      fetchTenantDetails();
      fetchTenantModules();
    }
  }, [status, session, router, id]);

  const fetchTenantDetails = async () => {
    try {
      const response = await fetch(`/api/admin/tenants/${id}`);
      if (!response.ok) throw new Error('Failed to fetch tenant');
      const data = await response.json();
      setTenant(data.data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchTenantModules = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/tenants/${id}/modules`);
      if (!response.ok) throw new Error('Failed to fetch modules');
      const data = await response.json();
      setTenantModules(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId: string, currentStatus: boolean) => {
    const newChanges = new Map(changes);
    newChanges.set(moduleId, !currentStatus);
    setChanges(newChanges);
  };

  const handleSave = async () => {
    if (changes.size === 0) {
      alert('No changes to save');
      return;
    }

    try {
      setSaving(true);
      const modules = Array.from(changes.entries()).map(([moduleId, isEnabled]) => ({
        moduleId,
        isEnabled
      }));

      const response = await fetch(`/api/admin/tenants/${id}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules })
      });

      if (!response.ok) throw new Error('Failed to update modules');

      alert('Modules updated successfully!');
      setChanges(new Map());
      fetchTenantModules();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getModuleStatus = (tenantModule: TenantModule) => {
    const moduleId = tenantModule.module.id;
    if (changes.has(moduleId)) {
      return changes.get(moduleId);
    }
    return tenantModule.isEnabled;
  };

  const hasChanges = changes.size > 0;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat modul...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Manage Modules - {tenant?.businessName} - Admin Panel</title>
      </Head>

      {/* Header */}
      <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/tenants"
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Manage Modules</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {tenant?.businessName} - {tenant?.businessType?.name}
                </p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
                hasChanges && !saving
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Menyimpan...' : `Simpan Perubahan ${hasChanges ? `(${changes.size})` : ''}`}
            </button>
          </div>
      </div>

      {/* Modules Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenantModules.map((tenantModule) => {
            const isEnabled = getModuleStatus(tenantModule);
            const hasChange = changes.has(tenantModule.module.id);

            return (
              <div
                key={tenantModule.id}
                className={`bg-white rounded-lg shadow p-6 border-2 transition-all ${
                  hasChange
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : isEnabled
                    ? 'border-green-200'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      isEnabled ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Package className={`w-6 h-6 ${
                        isEnabled ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {tenantModule.module.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {tenantModule.module.code}
                      </p>
                    </div>
                  </div>
                  {tenantModule.module.isCore && (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      Core
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  {tenantModule.module.description || 'No description available'}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {isEnabled ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                    <span className={`text-sm font-medium ${
                      isEnabled ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {isEnabled ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleModule(tenantModule.module.id, isEnabled!)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isEnabled
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {isEnabled ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </div>

                {hasChange && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs text-blue-600 font-medium">
                      ⚠️ Perubahan tertunda: Akan di{isEnabled ? 'aktifkan' : 'nonaktifkan'}
                    </p>
                  </div>
                )}

                {tenantModule.enabledAt && isEnabled && !hasChange && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Diaktifkan: {new Date(tenantModule.enabledAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {tenantModules.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada modul ditemukan</h3>
            <p className="mt-1 text-sm text-gray-500">
              Tenant ini belum memiliki modul yang dikonfigurasi.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
