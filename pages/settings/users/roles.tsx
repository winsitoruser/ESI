import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FaUserShield, FaPlus, FaEdit, FaTrash, FaSave, FaCheck, FaTimes, FaArrowLeft
} from 'react-icons/fa';
import { PERMISSIONS_STRUCTURE, DEFAULT_ROLES } from '@/lib/permissions/permissions-structure';

const RolesManagementPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const MOCK_S_ROLES = [
    { id: 'r1', name: 'Admin', description: 'Full access ke semua fitur', usersCount: 1, permissions: { 'pos.access': true, 'inventory.access': true, 'settings.access': true } },
    { id: 'r2', name: 'Kasir', description: 'Akses POS dan transaksi', usersCount: 3, permissions: { 'pos.access': true, 'pos.transactions': true } },
    { id: 'r3', name: 'Gudang', description: 'Akses inventori', usersCount: 2, permissions: { 'inventory.access': true, 'inventory.stock': true } },
  ];
  const [roles, setRoles] = useState<any[]>(MOCK_S_ROLES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {} as Record<string, boolean>
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session) {
      fetchRoles();
    }
  }, [session]);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/roles');
      const data = await response.json();

      if (data.success) {
        setRoles(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles(MOCK_S_ROLES);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    try {
      const response = await fetch('/api/settings/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        alert('Role berhasil ditambahkan!');
        setShowAddModal(false);
        resetForm();
        fetchRoles();
      } else {
        alert('Gagal menambahkan role: ' + data.error);
      }
    } catch (error) {
      console.error('Error adding role:', error);
      alert('Terjadi kesalahan saat menambahkan role');
    }
  };

  const handleEditRole = async () => {
    if (!selectedRole) return;

    try {
      const response = await fetch(`/api/settings/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        alert('Role berhasil diupdate!');
        setShowEditModal(false);
        resetForm();
        fetchRoles();
      } else {
        alert('Gagal mengupdate role: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Terjadi kesalahan saat mengupdate role');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus role ini?')) return;

    try {
      const response = await fetch(`/api/settings/roles/${roleId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('Role berhasil dihapus!');
        fetchRoles();
      } else {
        alert('Gagal menghapus role: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('Terjadi kesalahan saat menghapus role');
    }
  };

  const openEditModal = (role: any) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || {}
    });
    setShowEditModal(true);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permissions: {}
    });
    setSelectedRole(null);
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: !prev.permissions[permission]
      }
    }));
  };

  const toggleAllModulePermissions = (module: string, enable: boolean) => {
    const moduleData = PERMISSIONS_STRUCTURE[module as keyof typeof PERMISSIONS_STRUCTURE];
    if (!moduleData) return;

    const newPermissions = { ...formData.permissions };
    Object.keys(moduleData.permissions).forEach(permission => {
      newPermissions[permission] = enable;
    });

    setFormData(prev => ({
      ...prev,
      permissions: newPermissions
    }));
  };

  const applyTemplate = (templateName: keyof typeof DEFAULT_ROLES) => {
    const template = DEFAULT_ROLES[templateName];
    setFormData(prev => ({
      ...prev,
      permissions: { ...template.permissions }
    }));
  };

  const countEnabledPermissions = (permissions: Record<string, boolean>) => {
    return Object.values(permissions).filter(v => v === true).length;
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat Roles...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Role & Permission Management | BEDAGANG Cloud POS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/settings/users')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Kembali ke Users"
            >
              <FaArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Role & Permission Management</h1>
              <p className="text-blue-100">
                Kelola role dan hak akses pengguna berdasarkan modul
              </p>
            </div>
            <FaUserShield className="w-16 h-16 text-white/30" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Total Roles</p>
              <p className="text-2xl font-bold text-gray-900">{roles.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Total Modules</p>
              <p className="text-2xl font-bold text-blue-600">
                {Object.keys(PERMISSIONS_STRUCTURE).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Total Permissions</p>
              <p className="text-2xl font-bold text-purple-600">
                {Object.values(PERMISSIONS_STRUCTURE).reduce((acc, module) => 
                  acc + Object.keys(module.permissions).length, 0
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Custom Roles</p>
              <p className="text-2xl font-bold text-green-600">
                {roles.filter(r => !['admin', 'manager', 'cashier', 'staff'].includes(r.name.toLowerCase())).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Roles List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Daftar Roles</CardTitle>
                <CardDescription>Kelola role dan permission untuk setiap role</CardDescription>
              </div>
              <Button
                onClick={openAddModal}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <FaPlus className="mr-2" />
                Tambah Role
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {roles.length === 0 ? (
              <div className="text-center py-12">
                <FaUserShield className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-2">Belum ada role</p>
                <p className="text-sm text-gray-400">
                  Klik "Tambah Role" untuk membuat role pertama
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {roles.map((role) => (
                  <div key={role.id} className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                            {countEnabledPermissions(role.permissions || {})} permissions
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{role.description}</p>
                        
                        {/* Permission Summary */}
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(PERMISSIONS_STRUCTURE).map(([moduleKey, moduleData]) => {
                            const modulePermissions = Object.keys(moduleData.permissions);
                            const enabledCount = modulePermissions.filter(
                              perm => role.permissions?.[perm] === true
                            ).length;
                            
                            if (enabledCount === 0) return null;
                            
                            return (
                              <span
                                key={moduleKey}
                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                                title={`${enabledCount}/${modulePermissions.length} permissions`}
                              >
                                {moduleData.label}: {enabledCount}/{modulePermissions.length}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(role)}
                        >
                          <FaEdit className="mr-1" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRole(role.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <FaTrash className="mr-1" /> Hapus
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Role Modal */}
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold">
                  {showAddModal ? 'Tambah Role Baru' : 'Edit Role'}
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nama Role *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Supervisor, Warehouse Staff, dll"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Deskripsi
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Deskripsi singkat role ini"
                      />
                    </div>
                  </div>

                  {/* Templates */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gunakan Template (Opsional)
                    </label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyTemplate('admin')}
                      >
                        Admin Template
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyTemplate('manager')}
                      >
                        Manager Template
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyTemplate('cashier')}
                      >
                        Cashier Template
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyTemplate('staff')}
                      >
                        Staff Template
                      </Button>
                    </div>
                  </div>

                  {/* Permissions */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-4">
                      Permissions ({countEnabledPermissions(formData.permissions)} selected)
                    </h4>
                    
                    <div className="space-y-6">
                      {Object.entries(PERMISSIONS_STRUCTURE).map(([moduleKey, moduleData]) => {
                        const modulePermissions = Object.keys(moduleData.permissions);
                        const enabledCount = modulePermissions.filter(
                          perm => formData.permissions[perm] === true
                        ).length;
                        const allEnabled = enabledCount === modulePermissions.length;
                        const someEnabled = enabledCount > 0 && enabledCount < modulePermissions.length;

                        return (
                          <div key={moduleKey} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <h5 className="font-semibold text-gray-900">{moduleData.label}</h5>
                                <span className="text-xs text-gray-500">
                                  {enabledCount}/{modulePermissions.length}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleAllModulePermissions(moduleKey, true)}
                                  className="text-xs"
                                >
                                  <FaCheck className="mr-1" /> All
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleAllModulePermissions(moduleKey, false)}
                                  className="text-xs"
                                >
                                  <FaTimes className="mr-1" /> None
                                </Button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {Object.entries(moduleData.permissions).map(([permKey, permLabel]) => (
                                <label
                                  key={permKey}
                                  className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={formData.permissions[permKey] === true}
                                    onChange={() => togglePermission(permKey)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                  <span className="ml-2 text-sm text-gray-700">{permLabel}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    showAddModal ? setShowAddModal(false) : setShowEditModal(false);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  onClick={showAddModal ? handleAddRole : handleEditRole}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <FaSave className="mr-2" />
                  {showAddModal ? 'Tambah Role' : 'Simpan Perubahan'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RolesManagementPage;
