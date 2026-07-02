import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FaUsers, FaPlus, FaEdit, FaTrash, FaSearch, FaUserShield,
  FaEnvelope, FaPhone, FaCheck, FaTimes, FaSpinner, FaCog, FaEye, FaArrowLeft
} from 'react-icons/fa';
import { PERMISSIONS_STRUCTURE } from '@/lib/permissions/permissions-structure';

const UsersSettingsPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const MOCK_USERS = [
    { id: 'u1', name: 'Admin Utama', email: 'admin@bedagang.com', phone: '081234567890', role: { id: 'r1', name: 'Admin' }, position: 'Administrator', isActive: true, lastLogin: '2026-03-15T09:00:00' },
    { id: 'u2', name: 'Budi Kasir', email: 'budi@bedagang.com', phone: '081234567891', role: { id: 'r2', name: 'Kasir' }, position: 'Kasir', isActive: true, lastLogin: '2026-03-15T08:00:00' },
    { id: 'u3', name: 'Siti Gudang', email: 'siti@bedagang.com', phone: '081234567892', role: { id: 'r3', name: 'Gudang' }, position: 'Staff Gudang', isActive: true, lastLogin: '2026-03-14T16:00:00' },
  ];
  const MOCK_ROLES = [
    { id: 'r1', name: 'Admin', description: 'Full access', usersCount: 1, permissions: {} },
    { id: 'r2', name: 'Kasir', description: 'POS access only', usersCount: 1, permissions: {} },
    { id: 'r3', name: 'Gudang', description: 'Inventory access', usersCount: 1, permissions: {} },
  ];
  const [users, setUsers] = useState<any[]>(MOCK_USERS);
  const [roles, setRoles] = useState<any[]>(MOCK_ROLES);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('users');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    roleId: '',
    position: '',
    isActive: true
  });
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [showPermissions, setShowPermissions] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session) {
      fetchUsers();
      fetchRoles();
    }
  }, [session]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/users');
      
      if (!response.ok) {
        console.error('Failed to fetch users:', response.status);
        setUsers([]);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Response is not JSON');
        setUsers([]);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setUsers(data.data || []);
      } else {
        console.error('API error:', data.error);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers(MOCK_USERS);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/settings/roles');
      
      if (!response.ok) {
        console.error('Failed to fetch roles:', response.status);
        setRoles([]);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Response is not JSON');
        setRoles([]);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setRoles(data.data || []);
      } else {
        console.error('API error:', data.error);
        setRoles([]);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles(MOCK_ROLES);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Update selected role when roleId changes
    if (name === 'roleId' && value) {
      const role = roles.find(r => r.id === value);
      setSelectedRole(role);
    }
  };

  const handleAddUser = async () => {
    try {
      const response = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        alert('User berhasil ditambahkan!');
        setShowAddModal(false);
        resetForm();
        fetchUsers();
      } else {
        alert('Gagal menambahkan user: ' + data.error);
      }
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Terjadi kesalahan saat menambahkan user');
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/settings/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        alert('User berhasil diupdate!');
        setShowEditModal(false);
        resetForm();
        fetchUsers();
      } else {
        alert('Gagal mengupdate user: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Terjadi kesalahan saat mengupdate user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) return;

    try {
      const response = await fetch(`/api/settings/users/${userId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('User berhasil dihapus!');
        fetchUsers();
      } else {
        alert('Gagal menghapus user: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Terjadi kesalahan saat menghapus user');
    }
  };

  const openEditModal = (user: any) => {
    setSelectedUser(user);
    const userRole = user.roleDetails || roles.find(r => r.name === user.role);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      password: '',
      roleId: user.roleId || userRole?.id || '',
      position: user.position || '',
      isActive: user.isActive !== false
    });
    setSelectedRole(userRole);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      roleId: '',
      position: '',
      isActive: true
    });
    setSelectedUser(null);
    setSelectedRole(null);
    setShowPermissions(false);
  };

  const getPermissionCount = (permissions: Record<string, boolean>) => {
    return Object.values(permissions || {}).filter(v => v === true).length;
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-green-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat Pengguna...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Pengguna & Tim | BEDAGANG Cloud POS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/settings')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Kembali ke Settings"
            >
              <FaArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Pengguna & Tim</h1>
              <p className="text-green-100">
                Kelola pengguna, role, dan permission
              </p>
            </div>
            <FaUsers className="w-16 h-16 text-white/30" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Total Pengguna</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Aktif</p>
              <p className="text-2xl font-bold text-green-600">
                {users.filter(u => u.isActive !== false).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Admin</p>
              <p className="text-2xl font-bold text-blue-600">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Staff</p>
              <p className="text-2xl font-bold text-purple-600">
                {users.filter(u => u.role === 'staff').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaUsers className="inline mr-2" />
                Daftar Pengguna
              </button>
              <button
                onClick={() => setActiveTab('roles')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'roles'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaUserShield className="inline mr-2" />
                Role & Permission
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'users' && (
              <div className="space-y-4">
                {/* Search and Add */}
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                  <div className="flex-1 relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari pengguna..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <Button
                    onClick={() => setShowAddModal(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <FaPlus className="mr-2" />
                    Tambah Pengguna
                  </Button>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Nama
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Telepon
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                            Tidak ada pengguna
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold">
                                  {user.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                  <p className="text-xs text-gray-500">{user.position || '-'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-gray-900">
                                <FaEnvelope className="mr-2 text-gray-400" />
                                {user.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-gray-900">
                                <FaPhone className="mr-2 text-gray-400" />
                                {user.phone || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.role === 'admin' 
                                  ? 'bg-blue-100 text-blue-800'
                                  : user.role === 'manager'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {user.role || 'staff'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {user.isActive !== false ? (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  <FaCheck className="mr-1" /> Aktif
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                  <FaTimes className="mr-1" /> Nonaktif
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openEditModal(user)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Edit"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Hapus"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'roles' && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Role & Permission</CardTitle>
                        <CardDescription>Kelola role dan permission pengguna</CardDescription>
                      </div>
                      <Button
                        onClick={() => router.push('/settings/users/roles')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <FaCog className="mr-2" />
                        Kelola Roles
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {roles.length === 0 ? (
                        <div className="text-center py-12">
                          <FaUserShield className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-500 mb-2">Belum ada role</p>
                          <p className="text-sm text-gray-400 mb-4">
                            Klik "Kelola Roles" untuk membuat role pertama
                          </p>
                        </div>
                      ) : (
                        roles.map((role) => (
                          <div key={role.id} className="p-4 border border-gray-200 rounded-lg hover:border-green-300 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-semibold text-gray-900">{role.name}</h4>
                                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                    {getPermissionCount(role.permissions)} permissions
                                  </span>
                                  {role.isSystem && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                      System
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                                
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
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Add User Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Tambah Pengguna Baru</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telepon
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="081234567890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    name="roleId"
                    value={formData.roleId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Pilih Role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Permission Preview */}
                {selectedRole && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900">
                        Hak Akses: {selectedRole.name}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowPermissions(!showPermissions)}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <FaEye />
                        {showPermissions ? 'Sembunyikan' : 'Lihat Detail'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      {getPermissionCount(selectedRole.permissions)} permissions aktif
                    </p>
                    
                    {showPermissions && (
                      <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                        {Object.entries(PERMISSIONS_STRUCTURE).map(([moduleKey, moduleData]) => {
                          const modulePermissions = Object.keys(moduleData.permissions);
                          const enabledPerms = modulePermissions.filter(
                            perm => selectedRole.permissions?.[perm] === true
                          );
                          
                          if (enabledPerms.length === 0) return null;
                          
                          return (
                            <div key={moduleKey} className="text-xs">
                              <p className="font-semibold text-gray-700 mb-1">
                                {moduleData.label} ({enabledPerms.length}/{modulePermissions.length})
                              </p>
                              <div className="pl-3 space-y-0.5">
                                {enabledPerms.map(perm => (
                                  <div key={perm} className="flex items-center gap-1 text-gray-600">
                                    <FaCheck className="text-green-600 text-[10px]" />
                                    <span>{(moduleData.permissions as Record<string, string>)[perm]}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Posisi
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Cashier, Manager, dll"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Aktif
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleAddUser}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Tambah
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Edit Pengguna</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telepon
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password Baru (kosongkan jika tidak diubah)
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    name="roleId"
                    value={formData.roleId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Pilih Role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Permission Preview */}
                {selectedRole && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900">
                        Hak Akses: {selectedRole.name}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowPermissions(!showPermissions)}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <FaEye />
                        {showPermissions ? 'Sembunyikan' : 'Lihat Detail'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      {getPermissionCount(selectedRole.permissions)} permissions aktif
                    </p>
                    
                    {showPermissions && (
                      <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                        {Object.entries(PERMISSIONS_STRUCTURE).map(([moduleKey, moduleData]) => {
                          const modulePermissions = Object.keys(moduleData.permissions);
                          const enabledPerms = modulePermissions.filter(
                            perm => selectedRole.permissions?.[perm] === true
                          );
                          
                          if (enabledPerms.length === 0) return null;
                          
                          return (
                            <div key={moduleKey} className="text-xs">
                              <p className="font-semibold text-gray-700 mb-1">
                                {moduleData.label} ({enabledPerms.length}/{modulePermissions.length})
                              </p>
                              <div className="pl-3 space-y-0.5">
                                {enabledPerms.map(perm => (
                                  <div key={perm} className="flex items-center gap-1 text-gray-600">
                                    <FaCheck className="text-green-600 text-[10px]" />
                                    <span>{(moduleData.permissions as Record<string, string>)[perm]}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Posisi
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Aktif
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleEditUser}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Simpan
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default UsersSettingsPage;
