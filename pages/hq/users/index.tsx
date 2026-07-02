import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import HQLayout from '../../../components/hq/HQLayout';
import DataTable, { Column } from '../../../components/hq/ui/DataTable';
import Modal, { ConfirmDialog } from '../../../components/hq/ui/Modal';
import { StatusBadge } from '../../../components/hq/ui';
import { CanAccess, PageGuard, useMyPermissions } from '../../../components/permissions';
import {
  Users, Plus, Edit, Trash2, Eye, Shield, Mail, Phone, Building2,
  UserCheck, UserX, Key, Lock, Search, Filter, CheckCircle, XCircle,
  AlertTriangle, Send, Link2, Link2Off, Briefcase, Calendar, CreditCard,
  Activity, RefreshCw, ExternalLink, Clock, Laptop, Smartphone, Globe,
  ChevronDown, BarChart3, UserCog
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface HrisUser {
  id: string;
  name: string; email: string; phone: string;
  role: string; // legacy enum atau code role dinamis
  role_id?: string | null;
  role_name?: string | null;
  role_level?: number | null;
  branch_name: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  // HRIS fields
  employee_id: string | null;
  employee_number: string | null;
  department: string | null;
  position: string | null;
  employment_type: string | null;
  hris_status: string | null;
  join_date: string | null;
  photo_url?: string | null;
}

interface ApiRole {
  id: string;
  code: string;
  name: string;
  description: string;
  level: number;
  dataScope: string;
  permissions: Record<string, boolean>;
  userCount: number;
  isSystem: boolean;
  isActive: boolean;
}

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-red-100 text-red-800',
  2: 'bg-purple-100 text-purple-800',
  3: 'bg-blue-100 text-blue-800',
  4: 'bg-green-100 text-green-800',
  5: 'bg-gray-100 text-gray-800',
  6: 'bg-yellow-100 text-yellow-800'
};

// Legacy labels untuk enum lama (fallback)
const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800', SUPERHERO: 'bg-red-100 text-red-800',
  ADMIN: 'bg-blue-100 text-blue-800', HQ_ADMIN: 'bg-purple-100 text-purple-800',
  BRANCH_MANAGER: 'bg-green-100 text-green-800', MANAGER: 'bg-blue-100 text-blue-800',
  SUPERVISOR: 'bg-teal-100 text-teal-800',
  CASHIER: 'bg-yellow-100 text-yellow-800', STAFF: 'bg-gray-100 text-gray-800',
  WAREHOUSE: 'bg-amber-100 text-amber-800', FINANCE_STAFF: 'bg-purple-100 text-purple-800',
  HR_STAFF: 'bg-indigo-100 text-indigo-800', AUDITOR: 'bg-yellow-100 text-yellow-800'
};
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', SUPERHERO: 'Superhero', ADMIN: 'Admin', HQ_ADMIN: 'HQ Admin',
  BRANCH_MANAGER: 'Branch Manager', MANAGER: 'Manager', SUPERVISOR: 'Supervisor',
  CASHIER: 'Kasir', STAFF: 'Staff', WAREHOUSE: 'Staff Gudang',
  FINANCE_STAFF: 'Staff Keuangan', HR_STAFF: 'Staff HRD', AUDITOR: 'Auditor'
};
const EMP_TYPE_LABELS: Record<string, string> = {
  permanent: 'Tetap', contract: 'Kontrak', probation: 'Masa Percobaan', intern: 'Magang', freelance: 'Freelance'
};
const HRIS_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700', inactive: 'bg-gray-100 text-gray-600',
  on_leave: 'bg-yellow-100 text-yellow-700', terminated: 'bg-red-100 text-red-700', resigned: 'bg-orange-100 text-orange-700'
};

export default function UserManagement() {
  const { can } = useMyPermissions();
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<HrisUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [searchQ, setSearchQ] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterHris, setFilterHris] = useState('');
  const [stats, setStats] = useState<any>({ total: 0, linked_hris: 0, unlinked: 0, active_today: 0 });

  // Modals & tabs
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showToggleConfirm, setShowToggleConfirm] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showAssignRoleModal, setShowAssignRoleModal] = useState(false);
  const [viewTab, setViewTab] = useState<'account' | 'hris' | 'activity' | 'privilege'>('account');
  const [selectedUser, setSelectedUser] = useState<HrisUser | null>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dynamic roles from /api/hq/roles
  const [apiRoles, setApiRoles] = useState<ApiRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [assignRoleId, setAssignRoleId] = useState<string>('');

  // Link modal state
  const [empSearch, setEmpSearch] = useState('');
  const [empResults, setEmpResults] = useState<any[]>([]);
  const [empSearching, setEmpSearching] = useState(false);

  // Form
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', role: 'STAFF', branchId: '', password: '' });
  const [syncForm, setSyncForm] = useState({ department: '', position: '', employmentType: 'permanent', joinDate: '', salary: '', jobLevel: '' });
  const [createHrisProfile, setCreateHrisProfile] = useState(false);

  const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
  const fmtDateTime = (d: any) => d ? new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
  const initials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: 'list', page: String(page), limit: String(pageSize) });
      if (searchQ) params.set('search', searchQ);
      if (filterRole) params.set('role', filterRole);
      if (filterHris) params.set('hris', filterHris);
      const res = await fetch(`/api/hq/users/manage?${params}`);
      const json = await res.json();
      if (json.success) { setUsers(json.data.users || []); setTotal(json.data.total || 0); }
    } catch { setUsers([]); } finally { setLoading(false); }
  }, [page, pageSize, searchQ, filterRole, filterHris]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/hq/users/manage?action=stats');
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch {}
  }, []);

  const fetchDetail = async (user: HrisUser) => {
    setDetailLoading(true); setUserDetail(null);
    try {
      const res = await fetch(`/api/hq/users/manage?action=detail&id=${user.id}`);
      const json = await res.json();
      if (json.success) setUserDetail(json.data);
    } catch {} finally { setDetailLoading(false); }
  };

  const searchEmployees = async (q: string) => {
    setEmpSearching(true);
    try {
      const res = await fetch(`/api/hq/users/manage?action=search-employees&q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setEmpResults(json.data || []);
    } catch {} finally { setEmpSearching(false); }
  };

  const fetchApiRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const res = await fetch('/api/hq/roles?active=true');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.roles)) setApiRoles(json.roles);
      }
    } catch {} finally { setLoadingRoles(false); }
  }, []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted) { fetchUsers(); fetchStats(); fetchApiRoles(); }
  }, [mounted, fetchUsers, fetchStats, fetchApiRoles]);
  useEffect(() => { if (empSearch.length >= 2) searchEmployees(empSearch); else setEmpResults([]); }, [empSearch]);

  if (!mounted) return null;

  const post = async (url: string, body: any) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res.json();
  };

  const handleCreate = async () => {
    setActionLoading(true); setActionMsg(null);
    try {
      const res = await post('/api/hq/users', formData);
      if (res.user || res.message?.includes('success')) {
        if (createHrisProfile && syncForm.department && syncForm.position) {
          await post('/api/hq/users/manage?action=sync-to-hris', { userId: res.user?.id, ...syncForm });
        }
        setShowCreateModal(false); resetForm(); fetchUsers(); fetchStats();
      } else setActionMsg({ type: 'error', text: res.error || 'Gagal membuat pengguna' });
    } catch { setActionMsg({ type: 'error', text: 'Gagal membuat pengguna' }); }
    setActionLoading(false);
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/hq/users/${selectedUser.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (res.ok) { setShowEditModal(false); resetForm(); fetchUsers(); }
    } catch { } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await fetch(`/api/hq/users/${selectedUser.id}`, { method: 'DELETE' });
      setShowDeleteConfirm(false); setSelectedUser(null); fetchUsers(); fetchStats();
    } catch { } finally { setActionLoading(false); }
  };

  const handleToggleActive = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await fetch(`/api/hq/users/${selectedUser.id}/toggle-active`, { method: 'POST' });
      setShowToggleConfirm(false); setSelectedUser(null); fetchUsers(); fetchStats();
    } catch { } finally { setActionLoading(false); }
  };

  const handleLinkEmployee = async (employeeId: string) => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await post('/api/hq/users/manage?action=link-employee', { userId: selectedUser.id, employeeId });
      if (res.success) {
        setShowLinkModal(false); setEmpSearch(''); setEmpResults([]);
        fetchUsers(); fetchStats();
        if (showViewModal) fetchDetail(selectedUser);
      }
    } catch { } finally { setActionLoading(false); }
  };

  const handleUnlinkEmployee = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await post('/api/hq/users/manage?action=unlink-employee', { userId: selectedUser.id });
      fetchUsers(); fetchStats(); fetchDetail(selectedUser);
    } catch { } finally { setActionLoading(false); }
  };

  const handleSyncToHris = async () => {
    if (!selectedUser || !syncForm.department || !syncForm.position) return;
    setActionLoading(true); setActionMsg(null);
    try {
      const res = await post('/api/hq/users/manage?action=sync-to-hris', { userId: selectedUser.id, ...syncForm });
      if (res.success) {
        setActionMsg({ type: 'success', text: res.message });
        setTimeout(() => { setShowSyncModal(false); setActionMsg(null); fetchUsers(); fetchStats(); fetchDetail(selectedUser); }, 1800);
      } else setActionMsg({ type: 'error', text: res.error || 'Gagal membuat profil HRIS' });
    } catch { setActionMsg({ type: 'error', text: 'Gagal membuat profil HRIS' }); }
    setActionLoading(false);
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !assignRoleId) return;
    setActionLoading(true); setActionMsg(null);
    try {
      const res = await post(`/api/hq/users/${selectedUser.id}/role`, { roleId: assignRoleId });
      if (res.role) {
        setActionMsg({ type: 'success', text: `Role "${res.role.name}" berhasil diterapkan` });
        setTimeout(() => {
          setShowAssignRoleModal(false);
          setActionMsg(null);
          setAssignRoleId('');
          fetchUsers();
        }, 1200);
      } else {
        setActionMsg({ type: 'error', text: res.error || 'Gagal assign role' });
      }
    } catch {
      setActionMsg({ type: 'error', text: 'Gagal assign role' });
    } finally { setActionLoading(false); }
  };

  const openAssignRoleModal = (user: HrisUser) => {
    setSelectedUser(user);
    // Prefill kalau user punya role_id; kalau tidak, cari by code matching user.role
    const match = apiRoles.find(r =>
      (user.role_id && r.id === user.role_id) ||
      r.code?.toUpperCase() === String(user.role).toUpperCase()
    );
    setAssignRoleId(match?.id || '');
    setShowAssignRoleModal(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/hq/users/${selectedUser.id}/reset-password`, { method: 'POST' });
      if (response.ok) { setShowResetPasswordModal(false); setSelectedUser(null); }
    } catch { } finally { setActionLoading(false); }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', role: 'STAFF', branchId: '', password: '' });
    setSyncForm({ department: '', position: '', employmentType: 'permanent', joinDate: '', salary: '', jobLevel: '' });
    setCreateHrisProfile(false); setSelectedUser(null); setActionMsg(null);
  };

  const openEditModal = (user: HrisUser) => {
    setSelectedUser(user);
    setFormData({ name: user.name, email: user.email, phone: user.phone, role: user.role, branchId: '', password: '' });
    setShowEditModal(true);
  };

  const openViewModal = (user: HrisUser) => {
    setSelectedUser(user); setViewTab('account');
    setShowViewModal(true); fetchDetail(user);
  };

  const getTimeSince = (dateString: string | null) => {
    if (!dateString) return 'Belum pernah login';
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    return `${days} hari lalu`;
  };

  const columns: Column<HrisUser>[] = [
    {
      key: 'name',
      header: 'Pengguna',
      sortable: true,
      render: (_, user) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">{user.name}</div>
            <div className="text-xs text-gray-500 truncate">{user.email}</div>
            {user.phone && <div className="text-xs text-gray-400">{user.phone}</div>}
          </div>
        </div>
      )
    },
    {
      key: 'role', header: 'Role', sortable: true,
      render: (value, user) => {
        const code = (user.role_id ? apiRoles.find(r => r.id === user.role_id)?.code : null) || String(value || '').toUpperCase();
        const matchedApi = apiRoles.find(r => r.code === code);
        const label = user.role_name || matchedApi?.name || ROLE_LABELS[code] || value || '-';
        const colorCls = matchedApi
          ? LEVEL_COLORS[matchedApi.level] || 'bg-gray-100 text-gray-800'
          : ROLE_COLORS[code] || 'bg-gray-100 text-gray-800';
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colorCls}`} title={code}>
            {label}
          </span>
        );
      }
    },
    {
      key: 'department', header: 'Dept / Jabatan',
      render: (_, user) => user.employee_id ? (
        <div>
          <p className="text-sm font-medium text-gray-800">{user.department || '-'}</p>
          <p className="text-xs text-gray-500">{user.position || '-'}</p>
        </div>
      ) : <span className="text-xs text-gray-400 italic">-</span>
    },
    {
      key: 'employee_id', header: 'Status HRIS', align: 'center' as const,
      render: (_, user) => user.employee_id ? (
        <div className="flex flex-col items-center gap-1">
          <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full"><Link2 className="w-3 h-3" />Terhubung</span>
          {user.employee_number && <span className="text-[10px] text-gray-400">{user.employee_number}</span>}
        </div>
      ) : (
        <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" />Belum Ditautkan</span>
      )
    },
    {
      key: 'is_active', header: 'Status', align: 'center' as const,
      render: (value) => <StatusBadge status={value ? 'active' : 'inactive'} />
    },
    {
      key: 'last_login_at', header: 'Login Terakhir',
      render: (value) => <span className="text-sm text-gray-500">{getTimeSince(value)}</span>
    },
    {
      key: 'actions', header: 'Aksi', align: 'center' as const, width: '130px',
      render: (_, user) => (
        <div className="flex items-center justify-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); openViewModal(user); }} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Detail"><Eye className="w-4 h-4" /></button>
          {can('users.update') && <button onClick={(e) => { e.stopPropagation(); openEditModal(user); }} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Edit"><Edit className="w-4 h-4" /></button>}
          {can('users.role_assign') && <button onClick={(e) => { e.stopPropagation(); openAssignRoleModal(user); }} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Ubah Role & Privilege"><Shield className="w-4 h-4" /></button>}
          {can('users.reset_password') && <button onClick={(e) => { e.stopPropagation(); setSelectedUser(user); setShowResetPasswordModal(true); }} className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg" title="Reset Password"><Key className="w-4 h-4" /></button>}
          {can('users.update') && !user.employee_id && <button onClick={(e) => { e.stopPropagation(); setSelectedUser(user); setShowLinkModal(true); }} className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg" title="Tautkan ke HRIS"><Link2 className="w-4 h-4" /></button>}
          {can('users.delete') && user.role !== 'SUPER_ADMIN' && <button onClick={(e) => { e.stopPropagation(); setSelectedUser(user); setShowDeleteConfirm(true); }} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Hapus"><Trash2 className="w-4 h-4" /></button>}
        </div>
      )
    }
  ];

  return (
    <PageGuard
      anyPermission={['users.view', 'users.*']}
      title="Manajemen Pengguna"
      description="Administrasi akun, role & privilege user sistem."
    >
    <HQLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Pengguna</h1>
            <p className="text-gray-500 text-sm">Kelola akun pengguna, role, dan tautan profil HRIS karyawan</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/hq/hris" className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm">
              <Briefcase className="w-4 h-4" /> Buka HRIS
            </Link>
            <CanAccess permission="roles.view">
              <Link href="/hq/users/roles" className="flex items-center gap-1.5 px-3 py-2 border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 text-sm">
                <Shield className="w-4 h-4" /> Kelola Role
              </Link>
            </CanAccess>
            <CanAccess permission="users.create">
              <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                <Plus className="w-4 h-4" /> Tambah Pengguna
              </button>
            </CanAccess>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Pengguna', value: stats.total || users.length, icon: Users, color: 'blue' },
            { label: 'Terhubung HRIS', value: stats.linked_hris ?? users.filter(u => u.employee_id).length, icon: Link2, color: 'green', action: () => setFilterHris('linked') },
            { label: 'Belum Ditautkan', value: stats.unlinked ?? users.filter(u => !u.employee_id).length, icon: Link2Off, color: 'amber', action: () => setFilterHris('unlinked') },
            { label: 'Aktif Hari Ini', value: stats.active_today || 0, icon: Activity, color: 'purple' },
          ].map(s => (
            <button key={s.label} onClick={s.action} className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-left ${s.action ? 'hover:border-blue-300 cursor-pointer transition-colors' : ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className={`text-2xl font-bold mt-0.5 text-${s.color}-600`}>{s.value}</p>
                </div>
                <div className={`p-3 bg-${s.color}-100 rounded-xl`}><s.icon className={`w-6 h-6 text-${s.color}-600`} /></div>
              </div>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Cari nama / email..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
          </div>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none">
            <option value="">Semua Role</option>
            {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filterHris} onChange={e => setFilterHris(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none">
            <option value="">Semua Status HRIS</option>
            <option value="linked">✅ Terhubung HRIS</option>
            <option value="unlinked">⚠️ Belum Ditautkan</option>
          </select>
          {(filterRole || filterHris || searchQ) && (
            <button onClick={() => { setFilterRole(''); setFilterHris(''); setSearchQ(''); }} className="text-xs text-gray-500 hover:text-red-600 underline">Reset filter</button>
          )}
          <button onClick={() => { fetchUsers(); fetchStats(); }} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
        </div>

        {/* Table */}
        <DataTable columns={columns} data={users} loading={loading} searchPlaceholder="Cari pengguna..."
          pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}
          actions={{ onRefresh: fetchUsers }}
          onRowClick={(user) => openViewModal(user)}
        />
      </div>

      {/* ── Create/Edit Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={showCreateModal || showEditModal} onClose={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}
        title={showCreateModal ? 'Tambah Pengguna Baru' : 'Edit Pengguna'} size="md"
        footer={<div className="flex justify-between items-center">
          {actionMsg && <p className={`text-sm ${actionMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{actionMsg.text}</p>}
          <div className="flex gap-2 ml-auto">
            <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
            <button onClick={showCreateModal ? handleCreate : handleUpdate} disabled={actionLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{actionLoading ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </div>}
      >
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Nama Lengkap</label><input type="text" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" placeholder="Nama lengkap" /></div>
              <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Email</label><input type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" placeholder="email@perusahaan.com" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Telepon</label><input type="tel" value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" placeholder="081234567890" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Role
                {loadingRoles && <RefreshCw className="inline-block w-3 h-3 ml-1 animate-spin text-gray-400" />}
              </label>
                <select value={formData.role} onChange={e => setFormData(f => ({ ...f, role: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none bg-white">
                  {apiRoles.length > 0 ? (
                    apiRoles.filter(r => r.code !== 'SUPERHERO').map(r => (
                      <option key={r.id} value={r.code}>{r.name} {r.isSystem ? '•' : ''} (L{r.level})</option>
                    ))
                  ) : (
                    Object.entries(ROLE_LABELS).filter(([v]) => !['SUPER_ADMIN', 'SUPERHERO'].includes(v)).map(([v, l]) => <option key={v} value={v}>{l}</option>)
                  )}
                </select>
                {apiRoles.length > 0 && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    {(() => {
                      const r = apiRoles.find(x => x.code === formData.role);
                      return r ? `${r.description} • Scope: ${r.dataScope}` : '';
                    })()}
                  </p>
                )}
              </div>
              {showCreateModal && <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Password Awal</label><input type="password" value={formData.password} onChange={e => setFormData(f => ({ ...f, password: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" placeholder="••••••••" /></div>}
            </div>
            {showCreateModal && (
              <div className="border-t pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={createHrisProfile} onChange={e => setCreateHrisProfile(e.target.checked)} className="rounded" />
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-green-600" />Buat profil HRIS otomatis</span>
                </label>
                {createHrisProfile && (
                  <div className="mt-3 grid grid-cols-2 gap-3 bg-green-50 rounded-xl p-4">
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Departemen *</label><input value={syncForm.department} onChange={e => setSyncForm(f => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none" placeholder="Sales, Finance..." /></div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Jabatan *</label><input value={syncForm.position} onChange={e => setSyncForm(f => ({ ...f, position: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none" placeholder="Sales Rep..." /></div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Tipe Kepegawaian</label>
                      <select value={syncForm.employmentType} onChange={e => setSyncForm(f => ({ ...f, employmentType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none">
                        {Object.entries(EMP_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Tanggal Bergabung</label><input type="date" value={syncForm.joinDate} onChange={e => setSyncForm(f => ({ ...f, joinDate: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none" /></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ── View Modal — 3 Tabs ────────────────────────────────────────────────── */}
      <Modal isOpen={showViewModal} onClose={() => { setShowViewModal(false); setSelectedUser(null); }} title="Detail Pengguna" size="lg"
        footer={<div className="flex justify-between items-center">
          <div className="flex gap-2">
            {selectedUser && !selectedUser.employee_id && <><button onClick={() => setShowSyncModal(true)} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"><Briefcase className="w-4 h-4" />Buat Profil HRIS</button><button onClick={() => setShowLinkModal(true)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600"><Link2 className="w-4 h-4" />Tautkan HRIS</button></>}
            {selectedUser?.employee_id && <Link href={`/hq/hris?employee=${selectedUser.employee_id}`} className="flex items-center gap-1.5 px-3 py-2 border border-green-500 text-green-600 rounded-lg text-sm hover:bg-green-50"><ExternalLink className="w-4 h-4" />Buka di HRIS</Link>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowViewModal(false)} className="px-4 py-2 border rounded-lg text-sm">Tutup</button>
            <button onClick={() => { setShowViewModal(false); openEditModal(selectedUser!); }} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"><Edit className="w-4 h-4" />Edit</button>
          </div>
        </div>}>
        {selectedUser && (
          <div>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0">{initials(selectedUser.name)}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900">{selectedUser.name}</h3>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[selectedUser.role]}`}>{ROLE_LABELS[selectedUser.role]}</span>
                  <StatusBadge status={selectedUser.is_active ? 'active' : 'inactive'} />
                  {selectedUser.employee_id ? <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full"><Link2 className="w-3 h-3" />HRIS: {selectedUser.employee_number}</span> : <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" />Belum Terhubung HRIS</span>}
                </div>
              </div>
            </div>
            <div className="flex border-b border-gray-200 mb-4">
              {[
                { key: 'account', icon: UserCog, label: 'Profil Akun' },
                { key: 'privilege', icon: Shield, label: 'Role & Privilege' },
                { key: 'hris', icon: Briefcase, label: 'Profil HRIS' },
                { key: 'activity', icon: Activity, label: 'Aktivitas Login' }
              ].map(t => (
                <button key={t.key} onClick={() => setViewTab(t.key as any)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${viewTab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}><t.icon className="w-4 h-4" />{t.label}</button>
              ))}
            </div>
            {viewTab === 'account' && (
              <div className="grid grid-cols-2 gap-3">
                {[{ icon: Phone, label: 'Telepon', value: selectedUser.phone }, { icon: Building2, label: 'Cabang', value: selectedUser.branch_name || 'Semua Cabang' }, { icon: Calendar, label: 'Terdaftar', value: fmtDate(selectedUser.created_at) }, { icon: Clock, label: 'Login Terakhir', value: fmtDateTime(selectedUser.last_login_at) }].map(r => (
                  <div key={r.label} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3"><r.icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" /><div><p className="text-xs text-gray-500">{r.label}</p><p className="text-sm font-medium">{r.value || '-'}</p></div></div>
                ))}
                <div className="col-span-2 flex gap-2 pt-2">
                  <button onClick={() => setShowResetPasswordModal(true)} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"><Key className="w-4 h-4" />Reset Password</button>
                  <button onClick={() => setShowToggleConfirm(true)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm ${selectedUser.is_active ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{selectedUser.is_active ? <><UserX className="w-4 h-4" />Nonaktifkan</> : <><UserCheck className="w-4 h-4" />Aktifkan</>}</button>
                </div>
              </div>
            )}
            {viewTab === 'privilege' && (
              <div className="space-y-4">
                {(() => {
                  const role = selectedUser.role_id
                    ? apiRoles.find(r => r.id === selectedUser.role_id)
                    : apiRoles.find(r => r.code === String(selectedUser.role).toUpperCase());
                  if (!role) {
                    return (
                      <div className="text-center py-10 space-y-3">
                        <Shield className="w-12 h-12 text-gray-200 mx-auto" />
                        <p className="text-gray-500 text-sm">Role pengguna ini belum terpetakan ke sistem privilege baru</p>
                        <button onClick={() => openAssignRoleModal(selectedUser)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Terapkan Role</button>
                      </div>
                    );
                  }
                  const permEntries = Object.entries(role.permissions || {}).filter(([, v]) => v);
                  return (
                    <>
                      <div className="rounded-xl border border-gray-200 p-4 bg-gradient-to-br from-indigo-50 to-white">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-indigo-600 font-semibold uppercase">{role.code}</p>
                            <h4 className="font-bold text-gray-900 text-lg">{role.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${LEVEL_COLORS[role.level] || 'bg-gray-100 text-gray-800'}`}>Level {role.level}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                          <div className="bg-white rounded-lg p-2 text-center border"><p className="text-gray-500">Scope</p><p className="font-semibold capitalize">{role.dataScope}</p></div>
                          <div className="bg-white rounded-lg p-2 text-center border"><p className="text-gray-500">Sistem</p><p className="font-semibold">{role.isSystem ? 'Ya' : 'Kustom'}</p></div>
                          <div className="bg-white rounded-lg p-2 text-center border"><p className="text-gray-500">Permission</p><p className="font-semibold text-indigo-600">{permEntries.length}</p></div>
                        </div>
                        <button onClick={() => openAssignRoleModal(selectedUser)} className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"><UserCog className="w-4 h-4" />Ganti Role</button>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">Permission yang Dimiliki ({permEntries.length})</p>
                        <div className="max-h-56 overflow-y-auto grid grid-cols-2 gap-1.5 text-[11px]">
                          {permEntries.map(([k]) => (
                            <span key={k} className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-md border border-green-100 truncate">
                              <CheckCircle className="w-3 h-3 flex-shrink-0" />{k}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            {viewTab === 'hris' && (
              <div>
                {detailLoading ? <div className="flex items-center justify-center py-10 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />Memuat data HRIS...</div>
                : !selectedUser.employee_id ? (
                  <div className="text-center py-10 space-y-3"><Briefcase className="w-12 h-12 text-gray-200 mx-auto" /><p className="text-gray-500 text-sm">Pengguna ini belum terhubung ke profil HRIS</p>
                    <div className="flex justify-center gap-2"><button onClick={() => setShowSyncModal(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">+ Buat Profil HRIS</button><button onClick={() => setShowLinkModal(true)} className="px-4 py-2 border border-amber-500 text-amber-600 rounded-lg text-sm">Tautkan ke Karyawan</button></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[{ label: 'No. Karyawan', value: userDetail?.employee?.employee_no || selectedUser.employee_number }, { label: 'Departemen', value: userDetail?.employee?.department || selectedUser.department }, { label: 'Jabatan', value: userDetail?.employee?.position || selectedUser.position }, { label: 'Tipe Kerja', value: EMP_TYPE_LABELS[userDetail?.employee?.employment_type || selectedUser.employment_type || ''] }, { label: 'Tanggal Bergabung', value: fmtDate(userDetail?.employee?.join_date || selectedUser.join_date) }, { label: 'Status', value: userDetail?.employee?.hris_status || selectedUser.hris_status }, { label: 'Grade', value: userDetail?.employee?.grade_name || userDetail?.employee?.job_level }, { label: 'Atasan', value: userDetail?.employee?.manager_name }].map(r => (
                        <div key={r.label} className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500">{r.label}</p><p className="text-sm font-semibold text-gray-800 mt-0.5 capitalize">{r.value || '-'}</p></div>
                      ))}
                    </div>
                    {userDetail?.leaveStats?.length > 0 && <div><p className="text-sm font-semibold text-gray-700 mb-2">Riwayat Cuti (tahun ini)</p><div className="space-y-1">{userDetail.leaveStats.map((ls: any) => (<div key={ls.leave_type} className="flex justify-between text-xs text-gray-600 bg-blue-50 px-3 py-2 rounded-lg"><span className="capitalize">{ls.leave_type}</span><span className="font-semibold">{ls.days} hari</span></div>))}</div></div>}
                    <button onClick={handleUnlinkEmployee} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700"><Link2Off className="w-3.5 h-3.5" />Lepas Tautan HRIS</button>
                  </div>
                )}
              </div>
            )}
            {viewTab === 'activity' && (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {detailLoading ? <div className="flex items-center justify-center py-10 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />Memuat riwayat...</div>
                : !userDetail?.activity?.length ? <p className="text-center text-gray-400 text-sm py-8">Belum ada riwayat aktivitas</p>
                : userDetail.activity.map((a: any, i: number) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${a.status === 'success' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${a.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>{a.action === 'login' ? <Globe className="w-3.5 h-3.5 text-white" /> : <Key className="w-3.5 h-3.5 text-white" />}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between"><p className="text-sm font-medium capitalize text-gray-800">{a.action?.replace('_', ' ')}</p><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{a.status === 'success' ? 'Berhasil' : 'Gagal'}</span></div>
                      <p className="text-xs text-gray-500 mt-0.5">{fmtDateTime(a.timestamp)}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">{a.ip_address && <span className="flex items-center gap-0.5"><Globe className="w-3 h-3" />{a.ip_address}</span>}{a.user_agent && <span className="flex items-center gap-0.5 truncate">{a.user_agent?.includes('iPhone') ? <Smartphone className="w-3 h-3" /> : <Laptop className="w-3 h-3" />}<span className="truncate">{a.user_agent}</span></span>}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Link Employee Modal ────────────────────────────────────────────────── */}
      <Modal isOpen={showLinkModal} onClose={() => { setShowLinkModal(false); setEmpSearch(''); setEmpResults([]); }} title="Tautkan ke Profil HRIS" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Cari karyawan di HRIS yang belum memiliki akun sistem, lalu tautkan ke <strong>{selectedUser?.name}</strong>.</p>
          <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder="Cari nama / no. karyawan..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" /></div>
          {empSearching && <p className="text-center text-sm text-gray-400">Mencari...</p>}
          {empResults.map(e => (<div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border hover:border-blue-300"><div><p className="text-sm font-semibold">{e.name}</p><p className="text-xs text-gray-500">{e.employee_no} · {e.department} · {e.position}</p></div><button onClick={() => handleLinkEmployee(e.id)} disabled={actionLoading} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs disabled:opacity-50">Tautkan</button></div>))}
          {empSearch.length >= 2 && !empSearching && empResults.length === 0 && <p className="text-center text-sm text-gray-400 py-4">Tidak ada karyawan ditemukan</p>}
        </div>
      </Modal>

      {/* ── Sync to HRIS Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={showSyncModal} onClose={() => { setShowSyncModal(false); setActionMsg(null); }} title="Buat Profil HRIS" size="md"
        footer={<div className="flex justify-between items-center">{actionMsg && <p className={`text-sm ${actionMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{actionMsg.text}</p>}<div className="flex gap-2 ml-auto"><button onClick={() => setShowSyncModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button><button onClick={handleSyncToHris} disabled={actionLoading || !syncForm.department || !syncForm.position} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">{actionLoading ? 'Membuat...' : 'Buat Profil HRIS'}</button></div></div>}>
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800">Profil HRIS untuk: <strong>{selectedUser?.name}</strong> ({selectedUser?.email})</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Departemen *</label><input value={syncForm.department} onChange={e => setSyncForm(f => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400" placeholder="Sales, Finance, IT..." /></div>
            <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Jabatan *</label><input value={syncForm.position} onChange={e => setSyncForm(f => ({ ...f, position: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400" placeholder="Sales Representative..." /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Tipe Kepegawaian</label><select value={syncForm.employmentType} onChange={e => setSyncForm(f => ({ ...f, employmentType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none">{Object.entries(EMP_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Tanggal Bergabung</label><input type="date" value={syncForm.joinDate} onChange={e => setSyncForm(f => ({ ...f, joinDate: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Gaji Pokok (Rp)</label><input type="number" value={syncForm.salary} onChange={e => setSyncForm(f => ({ ...f, salary: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none" placeholder="Opsional" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Grade / Level</label><input value={syncForm.jobLevel} onChange={e => setSyncForm(f => ({ ...f, jobLevel: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none" placeholder="G4, G5..." /></div>
          </div>
        </div>
      </Modal>

      {/* ── Assign Role Modal ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={showAssignRoleModal}
        onClose={() => { setShowAssignRoleModal(false); setAssignRoleId(''); setActionMsg(null); }}
        title="Ubah Role & Privilege"
        size="md"
        footer={<div className="flex justify-between items-center">
          {actionMsg && <p className={`text-sm ${actionMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{actionMsg.text}</p>}
          <div className="flex gap-2 ml-auto">
            <Link href="/hq/users/roles" className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Kelola Role</Link>
            <button onClick={() => setShowAssignRoleModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
            <button onClick={handleAssignRole} disabled={actionLoading || !assignRoleId} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">
              {actionLoading ? 'Menerapkan...' : 'Terapkan Role'}
            </button>
          </div>
        </div>}
      >
        <div className="space-y-4">
          <div className="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-800">
            Pilih role untuk <strong>{selectedUser?.name}</strong> ({selectedUser?.email}).
            Role akan menentukan menu, module, serta hak akses (view, create, update, delete, approve) yang dimilikinya.
          </div>
          {loadingRoles && <p className="text-sm text-gray-400">Memuat daftar role...</p>}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {apiRoles.filter(r => r.code !== 'SUPERHERO' || selectedUser?.role === 'SUPER_ADMIN').map(r => {
              const selected = assignRoleId === r.id;
              const permCount = Object.values(r.permissions || {}).filter(Boolean).length;
              return (
                <label key={r.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}>
                  <input
                    type="radio"
                    name="assign-role"
                    checked={selected}
                    onChange={() => setAssignRoleId(r.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-semibold text-sm truncate">{r.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${LEVEL_COLORS[r.level] || 'bg-gray-100 text-gray-700'}`}>L{r.level}</span>
                        {r.isSystem && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">SYS</span>}
                      </div>
                      <span className="text-[10px] text-indigo-600 font-semibold flex-shrink-0">{permCount} perm</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Code: <span className="font-mono">{r.code}</span> · Scope: <span className="capitalize">{r.dataScope}</span> · {r.userCount} user
                    </p>
                  </div>
                </label>
              );
            })}
            {apiRoles.length === 0 && !loadingRoles && (
              <p className="text-center text-sm text-gray-400 py-6">Belum ada role tersedia. Buat role baru di halaman <Link href="/hq/users/roles" className="text-indigo-600 underline">Manajemen Role</Link>.</p>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Confirm Dialogs ───────────────────────────────────────────────────── */}
      <ConfirmDialog isOpen={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setSelectedUser(null); }} onConfirm={handleDelete} title="Hapus Pengguna" message={`Yakin hapus pengguna "${selectedUser?.name}"?`} confirmText="Hapus" variant="danger" loading={actionLoading} />
      <ConfirmDialog isOpen={showToggleConfirm} onClose={() => { setShowToggleConfirm(false); setSelectedUser(null); }} onConfirm={handleToggleActive} title={selectedUser?.is_active ? 'Nonaktifkan Pengguna' : 'Aktifkan Pengguna'} message={selectedUser?.is_active ? `"${selectedUser?.name}" tidak akan bisa login.` : `Aktifkan kembali "${selectedUser?.name}"?`} confirmText={selectedUser?.is_active ? 'Nonaktifkan' : 'Aktifkan'} variant={selectedUser?.is_active ? 'warning' : 'info'} loading={actionLoading} />
      <ConfirmDialog isOpen={showResetPasswordModal} onClose={() => { setShowResetPasswordModal(false); setSelectedUser(null); }} onConfirm={handleResetPassword} title="Reset Password" message={`Kirim email reset password ke "${selectedUser?.email}"?`} confirmText="Kirim Email" variant="info" loading={actionLoading} />
    </HQLayout>
    </PageGuard>
  );
}
