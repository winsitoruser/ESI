import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import AdvancedFilter from '@/components/settings/AdvancedFilter';
import DataTable from '@/components/settings/DataTable';
import Modal from '@/components/ui/modal';
import { 
  FaUsers, FaPlus, FaEdit, FaTrash, FaKey, FaUserLock, FaEye, 
  FaEyeSlash, FaSearch, FaFilter, FaDownload, FaUpload, FaUserShield
} from 'react-icons/fa';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier' | 'staff';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  branches?: { id: string; name: string }[];
}

const UserManagement: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const MOCK_MGR_USERS: User[] = [
    { id: 'u1', name: 'Admin Utama', email: 'admin@bedagang.com', role: 'admin', isActive: true, lastLogin: '2026-03-15T09:00:00', createdAt: '2026-01-01', branches: [{ id: 'b1', name: 'Pusat' }] },
    { id: 'u2', name: 'Budi Kasir', email: 'budi@bedagang.com', role: 'cashier', isActive: true, lastLogin: '2026-03-15T08:00:00', createdAt: '2026-01-15', branches: [{ id: 'b1', name: 'Pusat' }] },
    { id: 'u3', name: 'Siti Manager', email: 'siti@bedagang.com', role: 'manager', isActive: true, lastLogin: '2026-03-14T16:00:00', createdAt: '2026-02-01', branches: [{ id: 'b2', name: 'Cabang Bandung' }] },
  ];
  const [users, setUsers] = useState<User[]>(MOCK_MGR_USERS);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'cashier' as 'admin' | 'manager' | 'cashier' | 'staff',
    isActive: true,
    branchIds: [] as string[]
  });

  const MOCK_MGR_BRANCHES = [{ id: 'b1', name: 'Pusat', address: 'Jakarta' }, { id: 'b2', name: 'Cabang Bandung', address: 'Bandung' }];
  const [branches, setBranches] = useState<any[]>(MOCK_MGR_BRANCHES);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session) {
      fetchUsers();
      fetchBranches();
    }
  }, [session, pagination.page, pagination.limit]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/settings/users?page=${pagination.page}&limit=${pagination.limit}`
      );
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data);
        setPagination(prev => ({ ...prev, total: data.total }));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers(MOCK_MGR_USERS);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/settings/store/branches');
      const data = await response.json();
      
      if (data.success) {
        setBranches(data.data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches(MOCK_MGR_BRANCHES);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingUser 
        ? `/api/settings/users/${editingUser.id}`
        : '/api/settings/users';
      
      const method = editingUser ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        alert(editingUser ? 'User berhasil diupdate!' : 'User berhasil ditambahkan!');
        setShowModal(false);
        resetForm();
        fetchUsers();
      } else {
        alert('Gagal: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Hapus user ${user.name}?`)) return;

    try {
      const response = await fetch(`/api/settings/users/${user.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('User berhasil dihapus!');
        fetchUsers();
      } else {
        alert('Gagal: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!confirm(`Reset password untuk ${user.name}?`)) return;

    try {
      const response = await fetch(`/api/settings/users/${user.id}/reset-password`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        alert(`Password berhasil direset! Password baru: ${data.password}`);
      } else {
        alert('Gagal: ' + data.error);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Terjadi kesalahan');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'cashier',
      isActive: true,
      branchIds: []
    });
    setEditingUser(null);
    setShowPassword(false);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive,
      branchIds: user.branches?.map(b => b.id) || []
    });
    setShowModal(true);
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Email', 'Role', 'Status', 'Last Login', 'Created At'],
      ...users.map(user => [
        user.name,
        user.email,
        user.role,
        user.isActive ? 'Active' : 'Inactive',
        user.lastLogin || 'Never',
        new Date(user.createdAt).toLocaleString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const filterOptions = [
    {
      key: 'role',
      label: 'Role',
      type: 'select' as const,
      options: [
        { value: 'admin', label: 'Admin' },
        { value: 'manager', label: 'Manager' },
        { value: 'cashier', label: 'Cashier' },
        { value: 'staff', label: 'Staff' }
      ]
    },
    {
      key: 'isActive',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ]
    }
  ];

  const columns = [
    {
      key: 'name',
      label: 'Nama',
      sortable: true,
      render: (value: string, row: User) => (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
            <span className="text-blue-600 font-medium text-sm">
              {value.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium">{value}</div>
            <div className="text-sm text-gray-500">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'admin' ? 'bg-purple-100 text-purple-700' :
          value === 'manager' ? 'bg-blue-100 text-blue-700' :
          value === 'cashier' ? 'bg-green-100 text-green-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    {
      key: 'isActive',
      label: 'Status',
      sortable: true,
      render: (value: boolean) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'branches',
      label: 'Cabang',
      render: (branches: any[]) => (
        <div className="text-sm">
          {branches && branches.length > 0 ? (
            branches.map(b => b.name).join(', ')
          ) : (
            <span className="text-gray-500">All Branches</span>
          )}
        </div>
      )
    },
    {
      key: 'lastLogin',
      label: 'Last Login',
      sortable: true,
      render: (value: string) => (
        <div className="text-sm">
          {value ? new Date(value).toLocaleString() : 'Never'}
        </div>
      )
    }
  ];

  const actions = [
    {
      label: 'Edit',
      icon: <FaEdit />,
      onClick: (user: User) => openEditModal(user)
    },
    {
      label: 'Reset Password',
      icon: <FaKey />,
      onClick: (user: User) => handleResetPassword(user)
    },
    {
      label: 'Delete',
      icon: <FaTrash />,
      onClick: (user: User) => handleDelete(user),
      variant: 'danger' as const,
      condition: (user: User) => user.id !== session?.user?.id
    }
  ];

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Head>
        <title>User Management | BEDAGANG Cloud POS</title>
      </Head>

      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <FaUsers className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">User Management</h1>
                  <p className="text-purple-100">Kelola pengguna dan hak akses sistem</p>
                </div>
              </div>
              <Button
                onClick={() => setShowModal(true)}
                className="bg-white text-purple-600 hover:bg-purple-50"
              >
                <FaPlus className="mr-2" />
                Tambah User
              </Button>
            </div>
          </div>

          {/* Filters */}
          <AdvancedFilter
            filters={filterOptions}
            onFilterChange={() => {}}
            onExport={handleExport}
            data={users}
          />

          {/* Data Table */}
          <DataTable
            data={users}
            columns={columns}
            actions={actions}
            loading={loading}
            pagination={{
              ...pagination,
              onPageChange: (page) => setPagination(prev => ({ ...prev, page })),
              onLimitChange: (limit) => setPagination(prev => ({ ...prev, limit, page: 1 }))
            }}
            selectable
            onSelectionChange={setSelectedUsers}
          />

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedUsers.length} user dipilih
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <FaUserLock className="mr-1" />
                      Bulk Update Role
                    </Button>
                    <Button variant="outline" size="sm">
                      <FaUpload className="mr-1" />
                      Export Selected
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add/Edit User Modal */}
        {showModal && (
          <Modal
            title={editingUser ? 'Edit User' : 'Tambah User Baru'}
            onClose={() => {
              setShowModal(false);
              resetForm();
            }}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nama Lengkap *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  disabled={!!editingUser}
                />
              </div>

              {!editingUser && (
                <div>
                  <Label>Password *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <Label>Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="cashier">Cashier</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {branches.length > 0 && (
                <div>
                  <Label>Cabang Access</Label>
                  <div className="space-y-2 mt-2">
                    <label className="flex items-center">
                      <Checkbox
                        checked={formData.branchIds.length === 0}
                        onCheckedChange={(checked) => {
                          setFormData(prev => ({ ...prev, branchIds: checked ? [] : branches.map(b => b.id) }));
                        }}
                      />
                      <span className="ml-2">All Branches</span>
                    </label>
                    {branches.map(branch => (
                      <label key={branch.id} className="flex items-center">
                        <Checkbox
                          checked={formData.branchIds.includes(branch.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData(prev => ({ ...prev, branchIds: [...prev.branchIds, branch.id] }));
                            } else {
                              setFormData(prev => ({ 
                                ...prev, 
                                branchIds: prev.branchIds.filter(id => id !== branch.id)
                              }));
                            }
                          }}
                        />
                        <span className="ml-2">{branch.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <Checkbox
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: !!checked }))}
                />
                <span className="ml-2">User Active</span>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Batal
                </Button>
                <Button type="submit">
                  {editingUser ? 'Update' : 'Simpan'}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </DashboardLayout>
    </>
  );
};

export default UserManagement;
