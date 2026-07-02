import React, { useEffect, useMemo, useState } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import Modal, { ConfirmDialog } from '../../../components/hq/ui/Modal';
import { StatusBadge } from '../../../components/hq/ui/Badge';
import {
  Shield, ShieldCheck, Save, RefreshCw, Plus, Edit, Trash2, Search, Users,
  Lock, Unlock, Eye, CheckCircle, Settings, Key, Layers, Filter, Copy,
  AlertTriangle, Download, Upload, Printer, Zap, ChevronDown, ChevronRight,
  Sparkles, FileKey, Gauge, History, UserCog, Activity, Clock
} from 'lucide-react';
import {
  PERMISSION_CATALOG,
  ROLE_PRESETS,
  ROLE_LEVELS,
  DATA_SCOPES,
  ACTION_META,
  expandPermissions,
  countPermissions,
  type DataScope,
  type ActionType,
  type PermissionOperation
} from '../../../lib/permissions/permissions-catalog';

interface Role {
  id: string;
  code: string;
  name: string;
  description: string;
  level: number;
  dataScope: DataScope;
  permissions: Record<string, boolean>;
  userCount: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

type TabKey = 'list' | 'matrix' | 'templates' | 'audit' | 'users';

interface RoleGroup {
  role_id: string;
  role_code: string;
  role_name: string;
  level: number;
  data_scope: string;
  is_active: boolean;
  user_count: number;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  legacy_role?: string;
  role_id?: string | null;
  role_code?: string | null;
  role_name?: string | null;
  role_level?: number | null;
  is_active: boolean;
  assigned_branch_id?: string | null;
  last_login_at?: string | null;
}

interface AuditEntry {
  id: string;
  action: string;
  actorId: string | number | null;
  actorName: string | null;
  actorRole: string | null;
  targetType: string;
  targetId: string | null;
  targetLabel: string | null;
  oldValues?: any;
  newValues?: any;
  details?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp: string;
}

const ACTION_STYLE: Record<string, { label: string; color: string; icon: any }> = {
  'role.create':       { label: 'Role Dibuat',     color: 'green',  icon: Plus },
  'role.update':       { label: 'Role Diperbarui', color: 'blue',   icon: Edit },
  'role.delete':       { label: 'Role Dihapus',    color: 'red',    icon: Trash2 },
  'role.assign':       { label: 'Role Diberikan',  color: 'indigo', icon: UserCog },
  'role.revoke':       { label: 'Role Dicabut',    color: 'amber',  icon: Lock },
  'permission.grant':  { label: 'Permission +',    color: 'emerald',icon: CheckCircle },
  'permission.revoke': { label: 'Permission -',    color: 'rose',   icon: AlertTriangle }
};

const ACTION_ICONS: Record<ActionType, React.ComponentType<any>> = {
  view: Eye, create: Plus, update: Edit, delete: Trash2,
  approve: CheckCircle, export: Download, import: Upload,
  print: Printer, manage: Settings, execute: Zap
};

// Static color classes (Tailwind JIT friendly)
const COLOR_BG50: Record<string, string> = {
  blue: 'bg-blue-50', green: 'bg-green-50', amber: 'bg-amber-50', purple: 'bg-purple-50',
  indigo: 'bg-indigo-50', pink: 'bg-pink-50', cyan: 'bg-cyan-50', orange: 'bg-orange-50',
  teal: 'bg-teal-50', red: 'bg-red-50', rose: 'bg-rose-50', gray: 'bg-gray-50',
  yellow: 'bg-yellow-50'
};
const COLOR_BG100: Record<string, string> = {
  blue: 'bg-blue-100', green: 'bg-green-100', amber: 'bg-amber-100', purple: 'bg-purple-100',
  indigo: 'bg-indigo-100', pink: 'bg-pink-100', cyan: 'bg-cyan-100', orange: 'bg-orange-100',
  teal: 'bg-teal-100', red: 'bg-red-100', rose: 'bg-rose-100', gray: 'bg-gray-100',
  yellow: 'bg-yellow-100'
};
const COLOR_TEXT600: Record<string, string> = {
  blue: 'text-blue-600', green: 'text-green-600', amber: 'text-amber-600', purple: 'text-purple-600',
  indigo: 'text-indigo-600', pink: 'text-pink-600', cyan: 'text-cyan-600', orange: 'text-orange-600',
  teal: 'text-teal-600', red: 'text-red-600', rose: 'text-rose-600', gray: 'text-gray-600',
  yellow: 'text-yellow-600'
};
const COLOR_TEXT700: Record<string, string> = {
  blue: 'text-blue-700', green: 'text-green-700', amber: 'text-amber-700', purple: 'text-purple-700',
  indigo: 'text-indigo-700', pink: 'text-pink-700', cyan: 'text-cyan-700', orange: 'text-orange-700',
  teal: 'text-teal-700', red: 'text-red-700', rose: 'text-rose-700', gray: 'text-gray-700',
  yellow: 'text-yellow-700'
};
const cbg50 = (c: string) => COLOR_BG50[c] || 'bg-gray-50';
const cbg100 = (c: string) => COLOR_BG100[c] || 'bg-gray-100';
const ctext600 = (c: string) => COLOR_TEXT600[c] || 'text-gray-600';
const ctext700 = (c: string) => COLOR_TEXT700[c] || 'text-gray-700';

const emptyForm = {
  code: '',
  name: '',
  description: '',
  level: 5,
  dataScope: 'branch' as DataScope,
  isActive: true,
  permissions: {} as Record<string, boolean>
};

export default function UserRoles() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<TabKey>('list');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<number | 'all'>('all');
  const [filterType, setFilterType] = useState<'all' | 'system' | 'custom'>('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [permSearch, setPermSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Audit tab state
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState<string>('all');

  // Users-per-role tab state
  const [roleGroups, setRoleGroups] = useState<RoleGroup[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [selectedGroupRoleId, setSelectedGroupRoleId] = useState<string | 'unassigned' | null>(null);
  const [groupUsers, setGroupUsers] = useState<UserRow[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkTargetRoleId, setBulkTargetRoleId] = useState<string>('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchRoleGroups = async () => {
    setGroupLoading(true);
    try {
      const res = await fetch('/api/hq/users/by-role?group=1');
      if (res.ok) {
        const json = await res.json();
        setRoleGroups(json.groups || []);
        setUnassignedCount(json.unassignedCount || 0);
      }
    } catch {} finally { setGroupLoading(false); }
  };

  const fetchUsersByRole = async (roleId: string | 'unassigned') => {
    setGroupLoading(true);
    setSelectedUserIds(new Set());
    setBulkMsg(null);
    try {
      if (roleId === 'unassigned') {
        const res = await fetch('/api/hq/users/by-role');
        if (res.ok) {
          const json = await res.json();
          setGroupUsers(((json.users || []) as UserRow[]).filter(u => !u.role_id));
        }
      } else {
        const res = await fetch(`/api/hq/users/by-role?roleId=${encodeURIComponent(roleId)}`);
        if (res.ok) {
          const json = await res.json();
          setGroupUsers(json.users || []);
        }
      }
    } catch {} finally { setGroupLoading(false); }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const selectAllUsers = (checked: boolean) => {
    setSelectedUserIds(checked ? new Set(groupUsers.map(u => u.id)) : new Set());
  };

  const runBulkAction = async (action: 'assign' | 'revoke') => {
    if (selectedUserIds.size === 0) return;
    if (action === 'assign' && !bulkTargetRoleId) {
      setBulkMsg({ type: 'error', text: 'Pilih role tujuan terlebih dahulu' });
      return;
    }
    setBulkLoading(true);
    setBulkMsg(null);
    try {
      const res = await fetch('/api/hq/users/by-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userIds: Array.from(selectedUserIds),
          roleId: action === 'assign' ? bulkTargetRoleId : undefined
        })
      });
      const json = await res.json();
      if (res.ok) {
        setBulkMsg({ type: 'success', text: json.message || 'Berhasil' });
        // Refresh
        await fetchRoleGroups();
        if (selectedGroupRoleId) await fetchUsersByRole(selectedGroupRoleId);
      } else {
        setBulkMsg({ type: 'error', text: json.error || 'Gagal menjalankan bulk action' });
      }
    } catch (err: any) {
      setBulkMsg({ type: 'error', text: err?.message || 'Gagal menjalankan bulk action' });
    } finally {
      setBulkLoading(false);
    }
  };

  const fetchAudit = async (action?: string) => {
    setAuditLoading(true);
    try {
      const qs = action && action !== 'all' ? `?action=${encodeURIComponent(action)}` : '';
      const res = await fetch(`/api/hq/roles/audit${qs}`);
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json.logs || []);
      }
    } catch {} finally { setAuditLoading(false); }
  };

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/hq/roles');
      if (r.ok) {
        const json = await r.json();
        setRoles(json.roles || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchRoles();
  }, []);

  if (!mounted) return null;

  const resetForm = () => setForm(emptyForm);

  const openCreate = () => {
    resetForm();
    setPermSearch('');
    setExpanded({});
    setShowCreateModal(true);
  };

  const openEdit = (role: Role) => {
    setSelectedRole(role);
    setForm({
      code: role.code,
      name: role.name,
      description: role.description,
      level: role.level,
      dataScope: role.dataScope,
      isActive: role.isActive,
      permissions: { ...role.permissions }
    });
    setPermSearch('');
    setExpanded({});
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.code) return;
    setSaving(true);
    try {
      const isEdit = showEditModal && selectedRole;
      const url = isEdit ? `/api/hq/roles/${selectedRole!.id}` : '/api/hq/roles';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          description: form.description,
          level: form.level,
          dataScope: form.dataScope,
          isActive: form.isActive,
          permissions: form.permissions
        })
      });
      if (res.ok) {
        await fetchRoles();
        setShowCreateModal(false);
        setShowEditModal(false);
        resetForm();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Gagal menyimpan role');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRole || selectedRole.isSystem) return;
    const res = await fetch(`/api/hq/roles/${selectedRole.id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchRoles();
      setShowDeleteConfirm(false);
      setSelectedRole(null);
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Gagal menghapus role');
    }
  };

  const applyPreset = (presetCode: string) => {
    const preset = ROLE_PRESETS.find(p => p.code === presetCode);
    if (!preset) return;
    const expand = expandPermissions(preset.permissions);
    const permMap: Record<string, boolean> = {};
    expand.forEach(k => { permMap[k] = true; });
    setForm(prev => ({
      ...prev,
      code: prev.code || preset.code,
      name: prev.name || preset.name,
      description: prev.description || preset.description,
      level: preset.level,
      dataScope: preset.dataScope,
      permissions: permMap
    }));
  };

  const copyFromRole = (roleId: string) => {
    const src = roles.find(r => r.id === roleId);
    if (!src) return;
    setForm(prev => ({ ...prev, permissions: { ...src.permissions } }));
  };

  const togglePerm = (key: string) =>
    setForm(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] }
    }));

  const toggleModulePerms = (operations: PermissionOperation[], allOn: boolean) => {
    setForm(prev => {
      const next = { ...prev.permissions };
      operations.forEach(o => { next[o.key] = !allOn; });
      return { ...prev, permissions: next };
    });
  };

  const toggleCategoryPerms = (catId: string, allOn: boolean) => {
    const cat = PERMISSION_CATALOG.find(c => c.id === catId);
    if (!cat) return;
    setForm(prev => {
      const next = { ...prev.permissions };
      cat.modules.forEach(m => m.operations.forEach(o => { next[o.key] = !allOn; }));
      return { ...prev, permissions: next };
    });
  };

  const clearAllPerms = () => setForm(prev => ({ ...prev, permissions: {} }));
  const selectAllPerms = () => {
    const next: Record<string, boolean> = {};
    PERMISSION_CATALOG.forEach(c =>
      c.modules.forEach(m => m.operations.forEach(o => { next[o.key] = true; }))
    );
    setForm(prev => ({ ...prev, permissions: next }));
  };

  const filteredRoles = useMemo(() => {
    return roles.filter(r => {
      const s = searchTerm.toLowerCase();
      const matchSearch = !s || r.name.toLowerCase().includes(s) || r.code.toLowerCase().includes(s);
      const matchLevel = filterLevel === 'all' || r.level === filterLevel;
      const matchType = filterType === 'all' || (filterType === 'system' ? r.isSystem : !r.isSystem);
      return matchSearch && matchLevel && matchType;
    });
  }, [roles, searchTerm, filterLevel, filterType]);

  const stats = useMemo(() => {
    return {
      total: roles.length,
      system: roles.filter(r => r.isSystem).length,
      custom: roles.filter(r => !r.isSystem).length,
      totalUsers: roles.reduce((s, r) => s + r.userCount, 0),
      totalPermissions: PERMISSION_CATALOG.reduce(
        (s, c) => s + c.modules.reduce((ss, m) => ss + m.operations.length, 0), 0
      )
    };
  }, [roles]);

  const getLevelBadge = (level: number) => {
    const info = ROLE_LEVELS.find(l => l.level === level) || ROLE_LEVELS[4];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${info.color}`}>
        L{info.level} · {info.label}
      </span>
    );
  };

  const getScopeBadge = (scope: DataScope) => {
    const info = DATA_SCOPES.find(s => s.value === scope) || DATA_SCOPES[3];
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${info.color}`}>
        {info.label}
      </span>
    );
  };

  const permMatches = (op: PermissionOperation) => {
    if (!permSearch) return true;
    const q = permSearch.toLowerCase();
    return op.key.toLowerCase().includes(q) || op.label.toLowerCase().includes(q);
  };

  // =======================================
  // RENDER
  // =======================================
  return (
    <HQLayout title="Manajemen Role & Privilege" subtitle="Kelola hak akses modul, aksi, dan cakupan data pengguna">
      <div className="space-y-6">
        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={Shield} color="blue" value={stats.total} label="Total Role" />
          <StatCard icon={Lock} color="purple" value={stats.system} label="Role Sistem" />
          <StatCard icon={Settings} color="green" value={stats.custom} label="Role Custom" />
          <StatCard icon={Users} color="orange" value={stats.totalUsers} label="Total User" />
          <StatCard icon={Key} color="rose" value={stats.totalPermissions} label="Total Permission" />
        </div>

        {/* TABS */}
        <div className="flex items-center gap-1 border-b border-gray-200">
          {[
            { key: 'list' as TabKey, label: 'Daftar Role', icon: Shield },
            { key: 'matrix' as TabKey, label: 'Access Matrix', icon: Layers },
            { key: 'templates' as TabKey, label: 'Template Role', icon: Sparkles },
            { key: 'users' as TabKey, label: 'Users per Role', icon: Users },
            { key: 'audit' as TabKey, label: 'Audit Trail', icon: History }
          ].map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  if (t.key === 'audit') fetchAudit(auditFilter);
                  if (t.key === 'users') { fetchRoleGroups(); setSelectedGroupRoleId(null); setGroupUsers([]); }
                }}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-medium transition ${
                  active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* =================== TAB: LIST =================== */}
        {tab === 'list' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari role..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={filterLevel}
                  onChange={e => setFilterLevel(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">Semua Level</option>
                  {ROLE_LEVELS.map(l => (
                    <option key={l.level} value={l.level}>Level {l.level} · {l.label}</option>
                  ))}
                </select>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">Semua Tipe</option>
                  <option value="system">Sistem</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchRoles}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={openCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Role
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : filteredRoles.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>Tidak ada role yang sesuai filter</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-sm">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Role</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Level</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Scope Data</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Permission</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">User</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Tipe</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500">Status</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoles.map(role => {
                      const permCount = countPermissions(role.permissions);
                      return (
                        <tr key={role.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Shield className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{role.name}</p>
                                <p className="text-xs text-gray-500 font-mono">{role.code}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">{getLevelBadge(role.level)}</td>
                          <td className="py-3 px-4 text-center">{getScopeBadge(role.dataScope)}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-2 px-2 py-1 bg-gray-100 rounded text-xs">
                              <Key className="w-3 h-3" />
                              {permCount} / {stats.totalPermissions}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-medium">{role.userCount}</td>
                          <td className="py-3 px-4 text-center">
                            {role.isSystem ? (
                              <span className="inline-flex items-center gap-1 text-purple-600 text-xs">
                                <Lock className="w-3 h-3" /> Sistem
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                                <Unlock className="w-3 h-3" /> Custom
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <StatusBadge status={role.isActive ? 'active' : 'inactive'} />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <IconBtn title="Detail" onClick={() => { setSelectedRole(role); setShowViewModal(true); }} color="blue">
                                <Eye className="w-4 h-4" />
                              </IconBtn>
                              <IconBtn title="Edit" onClick={() => openEdit(role)} color="blue" disabled={role.isSystem && role.code === 'SUPERHERO'}>
                                <Edit className="w-4 h-4" />
                              </IconBtn>
                              <IconBtn title="Hapus" onClick={() => { setSelectedRole(role); setShowDeleteConfirm(true); }} color="red" disabled={role.isSystem || role.userCount > 0}>
                                <Trash2 className="w-4 h-4" />
                              </IconBtn>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* =================== TAB: MATRIX =================== */}
        {tab === 'matrix' && (
          <AccessMatrix roles={roles} />
        )}

        {/* =================== TAB: TEMPLATES =================== */}
        {tab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLE_PRESETS.map(preset => {
              const expand = expandPermissions(preset.permissions);
              return (
                <div key={preset.code} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg ${cbg100(preset.color)}`}>
                      <ShieldCheck className={`w-5 h-5 ${ctext600(preset.color)}`} />
                    </div>
                    {getLevelBadge(preset.level)}
                  </div>
                  <h4 className="font-semibold text-gray-900">{preset.name}</h4>
                  <p className="text-xs font-mono text-gray-500 mb-2">{preset.code}</p>
                  <p className="text-sm text-gray-600 min-h-[3rem]">{preset.description}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                    <Key className="w-3 h-3" />
                    <span>{expand.length} permission</span>
                    <span className="mx-1">·</span>
                    {getScopeBadge(preset.dataScope)}
                  </div>
                  <button
                    onClick={() => {
                      openCreate();
                      setTimeout(() => applyPreset(preset.code), 0);
                    }}
                    className="mt-4 w-full px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Gunakan Template
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* =================== TAB: USERS PER ROLE =================== */}
        {tab === 'users' && (
          <div className="grid grid-cols-12 gap-4">
            {/* Sidebar: groups */}
            <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" /> Role Groups
                </h4>
                <button onClick={fetchRoleGroups} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Refresh">
                  <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${groupLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {groupLoading && roleGroups.length === 0 ? (
                  <div className="flex items-center justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-indigo-600" /></div>
                ) : (
                  <>
                    {roleGroups.map(g => {
                      const active = selectedGroupRoleId === g.role_id;
                      return (
                        <button
                          key={g.role_id}
                          onClick={() => { setSelectedGroupRoleId(g.role_id); fetchUsersByRole(g.role_id); }}
                          className={`w-full flex items-center justify-between p-3 text-left text-sm hover:bg-indigo-50 transition ${active ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">{g.role_name}</p>
                            <p className="text-[10px] text-gray-500 font-mono">{g.role_code} · L{g.level}</p>
                          </div>
                          <span className={`flex-shrink-0 ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${g.user_count > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                            {g.user_count}
                          </span>
                        </button>
                      );
                    })}
                    <button
                      onClick={() => { setSelectedGroupRoleId('unassigned'); fetchUsersByRole('unassigned'); }}
                      className={`w-full flex items-center justify-between p-3 text-left text-sm hover:bg-amber-50 transition ${selectedGroupRoleId === 'unassigned' ? 'bg-amber-50 border-l-4 border-amber-500' : 'border-l-4 border-transparent'}`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-amber-800 truncate flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Tanpa Role
                        </p>
                        <p className="text-[10px] text-amber-600">User belum di-assign</p>
                      </div>
                      <span className={`flex-shrink-0 ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${unassignedCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                        {unassignedCount}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Detail: user list + bulk action */}
            <div className="col-span-12 md:col-span-8 lg:col-span-9 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {!selectedGroupRoleId ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Users className="w-14 h-14 text-gray-200 mb-3" />
                  <p className="text-sm">Pilih role di kiri untuk melihat user</p>
                </div>
              ) : (
                <>
                  <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Users className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {selectedGroupRoleId === 'unassigned'
                            ? 'User Tanpa Role'
                            : roleGroups.find(r => r.role_id === selectedGroupRoleId)?.role_name || 'Role'}
                        </h3>
                        <p className="text-xs text-gray-500">{groupUsers.length} user · {selectedUserIds.size} terpilih</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={groupUsers.length > 0 && selectedUserIds.size === groupUsers.length}
                          onChange={e => selectAllUsers(e.target.checked)}
                          className="rounded"
                        />
                        Pilih semua
                      </label>
                    </div>
                  </div>

                  {/* Bulk action bar */}
                  {selectedUserIds.size > 0 && (
                    <div className="p-3 bg-indigo-50 border-b border-indigo-100 flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-indigo-900">
                        {selectedUserIds.size} user terpilih:
                      </span>
                      <select
                        value={bulkTargetRoleId}
                        onChange={e => setBulkTargetRoleId(e.target.value)}
                        className="px-3 py-1.5 border border-indigo-200 rounded-lg text-sm bg-white"
                      >
                        <option value="">Pilih role tujuan...</option>
                        {roles.filter(r => r.id !== selectedGroupRoleId).map(r => (
                          <option key={r.id} value={r.id}>{r.name} (L{r.level})</option>
                        ))}
                      </select>
                      <button
                        onClick={() => runBulkAction('assign')}
                        disabled={bulkLoading || !bulkTargetRoleId}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <UserCog className="w-3.5 h-3.5" />
                        {bulkLoading ? 'Menerapkan...' : 'Assign ke Role'}
                      </button>
                      {selectedGroupRoleId !== 'unassigned' && (
                        <button
                          onClick={() => runBulkAction('revoke')}
                          disabled={bulkLoading}
                          className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-sm hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Revoke
                        </button>
                      )}
                      {bulkMsg && (
                        <span className={`text-xs font-medium ${bulkMsg.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                          {bulkMsg.text}
                        </span>
                      )}
                    </div>
                  )}

                  {/* User list */}
                  <div className="max-h-[540px] overflow-y-auto">
                    {groupLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                      </div>
                    ) : groupUsers.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <Users className="w-10 h-10 mx-auto text-gray-200 mb-2" />
                        <p className="text-sm">Belum ada user di role ini</p>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr className="border-b border-gray-200">
                            <th className="px-3 py-2 w-10"></th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">User</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Email</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Role Saat Ini</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-600">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {groupUsers.map(u => {
                            const checked = selectedUserIds.has(u.id);
                            return (
                              <tr key={u.id} className={`hover:bg-gray-50 ${checked ? 'bg-indigo-50/50' : ''}`}>
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleUserSelection(u.id)}
                                    className="rounded"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                      {u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                                    </div>
                                    <span className="font-medium text-gray-800">{u.name}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-gray-600 text-xs">{u.email}</td>
                                <td className="px-3 py-2">
                                  {u.role_name ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-100">
                                      <Shield className="w-3 h-3" />
                                      {u.role_name}
                                    </span>
                                  ) : u.legacy_role ? (
                                    <span className="text-xs text-gray-500 italic">legacy: {u.legacy_role}</span>
                                  ) : (
                                    <span className="text-xs text-amber-600">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <StatusBadge status={u.is_active ? 'active' : 'inactive'} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* =================== TAB: AUDIT TRAIL =================== */}
        {tab === 'audit' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <History className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Audit Trail Role & Privilege</h3>
                  <p className="text-xs text-gray-500">Riwayat perubahan role, assign, dan revoke.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={auditFilter}
                  onChange={e => { setAuditFilter(e.target.value); fetchAudit(e.target.value); }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="all">Semua Aksi</option>
                  <option value="role.create">Role Dibuat</option>
                  <option value="role.update">Role Diperbarui</option>
                  <option value="role.delete">Role Dihapus</option>
                  <option value="role.assign">Role Di-assign ke User</option>
                  <option value="role.revoke">Role Dicabut</option>
                </select>
                <button
                  onClick={() => fetchAudit(auditFilter)}
                  disabled={auditLoading}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  <RefreshCw className={`w-4 h-4 ${auditLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {auditLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <History className="w-10 h-10 mx-auto text-gray-200 mb-2" />
                  <p className="text-sm">Belum ada aktivitas yang tercatat</p>
                </div>
              ) : auditLogs.map(log => {
                const meta = ACTION_STYLE[log.action] || { label: log.action, color: 'gray', icon: Activity };
                const Icon = meta.icon;
                return (
                  <div key={log.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${cbg100(meta.color)} flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${ctext600(meta.color)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cbg50(meta.color)} ${ctext700(meta.color)}`}>
                            {meta.label}
                          </span>
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {log.targetLabel || log.targetId || '-'}
                          </span>
                          {log.targetType && (
                            <span className="text-[10px] text-gray-400 uppercase">{log.targetType}</span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-600 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1">
                            <UserCog className="w-3 h-3" />
                            {log.actorName || log.actorId || 'system'}
                          </span>
                          {log.actorRole && (
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] uppercase">{log.actorRole}</span>
                          )}
                          <span className="inline-flex items-center gap-1 text-gray-400">
                            <Clock className="w-3 h-3" />
                            {new Date(log.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                          {log.ipAddress && <span className="text-[10px] text-gray-400 font-mono">{log.ipAddress}</span>}
                        </div>
                        {(log.oldValues || log.newValues) && (
                          <details className="mt-2 text-xs">
                            <summary className="cursor-pointer text-indigo-600 hover:text-indigo-800">
                              Detail perubahan
                            </summary>
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                              {log.oldValues && (
                                <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg">
                                  <p className="text-[10px] font-semibold text-rose-700 mb-1">SEBELUM</p>
                                  <pre className="text-[11px] text-rose-900 whitespace-pre-wrap break-words">
                                    {JSON.stringify(log.oldValues, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.newValues && (
                                <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                                  <p className="text-[10px] font-semibold text-emerald-700 mb-1">SESUDAH</p>
                                  <pre className="text-[11px] text-emerald-900 whitespace-pre-wrap break-words">
                                    {JSON.stringify(log.newValues, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =================== MODALS =================== */}
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title={selectedRole?.name || 'Detail Role'}
          subtitle={selectedRole?.code}
          size="xl"
        >
          {selectedRole && <RoleDetail role={selectedRole} />}
        </Modal>

        <Modal
          isOpen={showCreateModal || showEditModal}
          onClose={() => { setShowCreateModal(false); setShowEditModal(false); }}
          title={showCreateModal ? 'Tambah Role Baru' : `Edit Role: ${selectedRole?.name || ''}`}
          size="full"
        >
          <RoleForm
            form={form}
            setForm={setForm}
            isEdit={showEditModal}
            roles={roles}
            permSearch={permSearch}
            setPermSearch={setPermSearch}
            expanded={expanded}
            setExpanded={setExpanded}
            saving={saving}
            onCancel={() => { setShowCreateModal(false); setShowEditModal(false); }}
            onSave={handleSave}
            onApplyPreset={applyPreset}
            onCopyFrom={copyFromRole}
            onToggle={togglePerm}
            onToggleModule={toggleModulePerms}
            onToggleCategory={toggleCategoryPerms}
            onClearAll={clearAllPerms}
            onSelectAll={selectAllPerms}
            permMatches={permMatches}
          />
        </Modal>

        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Hapus Role"
          message={`Apakah Anda yakin ingin menghapus role "${selectedRole?.name}"? Aksi ini tidak dapat dibatalkan.`}
          confirmText="Hapus"
          variant="danger"
        />
      </div>
    </HQLayout>
  );
}

// ========================================================================
// Sub-components
// ========================================================================

function StatCard({ icon: Icon, color, value, label }: { icon: any; color: string; value: number; label: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    rose: 'bg-rose-100 text-rose-600'
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorMap[color] || colorMap.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  title, onClick, color, disabled, children
}: { title: string; onClick: () => void; color: 'blue' | 'red'; disabled?: boolean; children: React.ReactNode }) {
  const hoverMap = {
    blue: 'hover:text-blue-600 hover:bg-blue-50',
    red: 'hover:text-red-600 hover:bg-red-50'
  };
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-2 text-gray-500 rounded-lg ${hoverMap[color]} disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function RoleDetail({ role }: { role: Role }) {
  const scopeInfo = DATA_SCOPES.find(s => s.value === role.dataScope);
  const levelInfo = ROLE_LEVELS.find(l => l.level === role.level);

  const permsByModule = useMemo(() => {
    const map: { module: string; moduleName: string; catName: string; color: string; ops: PermissionOperation[] }[] = [];
    PERMISSION_CATALOG.forEach(cat =>
      cat.modules.forEach(m => {
        const ops = m.operations.filter(o => role.permissions[o.key]);
        if (ops.length) map.push({ module: m.code, moduleName: m.name, catName: cat.name, color: cat.color, ops });
      })
    );
    return map;
  }, [role]);

  const total = countPermissions(role.permissions);
  const allTotal = PERMISSION_CATALOG.reduce((s, c) => s + c.modules.reduce((ss, m) => ss + m.operations.length, 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {levelInfo && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${levelInfo.color}`}>
            L{levelInfo.level} · {levelInfo.label}
          </span>
        )}
        {scopeInfo && (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${scopeInfo.color}`}>
            Scope: {scopeInfo.label}
          </span>
        )}
        {role.isSystem && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
            <Lock className="w-3 h-3" /> Role Sistem
          </span>
        )}
        <StatusBadge status={role.isActive ? 'active' : 'inactive'} />
      </div>

      <p className="text-gray-600">{role.description}</p>

      <div className="grid grid-cols-3 gap-3">
        <InfoBox icon={Key} label="Permission" value={`${total} / ${allTotal}`} />
        <InfoBox icon={Users} label="User aktif" value={String(role.userCount)} />
        <InfoBox icon={Gauge} label="Cakupan" value={scopeInfo?.label || '-'} />
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <FileKey className="w-4 h-4" /> Daftar Permission per Modul
        </h4>
        {permsByModule.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Role ini belum memiliki permission.</p>
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {permsByModule.map(group => (
              <div key={group.module} className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${cbg100(group.color)} ${ctext700(group.color)}`}>
                      {group.catName}
                    </span>
                    <span className="font-medium text-sm text-gray-900">{group.moduleName}</span>
                  </div>
                  <span className="text-xs text-gray-500">{group.ops.length} aksi</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.ops.map(o => {
                    const meta = ACTION_META[o.action];
                    const Icon = ACTION_ICONS[o.action];
                    return (
                      <span
                        key={o.key}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs ${meta.color}`}
                        title={o.description || o.key}
                      >
                        <Icon className="w-3 h-3" />
                        {o.label}
                        {o.sensitive && <AlertTriangle className="w-3 h-3 text-orange-500" />}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span>Kode: <code className="px-1 bg-gray-100 rounded">{role.code}</code></span>
        <span>Dibuat: {new Date(role.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>
    </div>
  );
}

function InfoBox({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <p className="mt-1 font-semibold text-gray-900">{value}</p>
    </div>
  );
}

// --- Form ---------------------------------------------------------------
interface RoleFormProps {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  isEdit: boolean;
  roles: Role[];
  permSearch: string;
  setPermSearch: (v: string) => void;
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
  onApplyPreset: (code: string) => void;
  onCopyFrom: (id: string) => void;
  onToggle: (key: string) => void;
  onToggleModule: (ops: PermissionOperation[], allOn: boolean) => void;
  onToggleCategory: (catId: string, allOn: boolean) => void;
  onClearAll: () => void;
  onSelectAll: () => void;
  permMatches: (op: PermissionOperation) => boolean;
}

function RoleForm(p: RoleFormProps) {
  const selectedCount = Object.values(p.form.permissions).filter(Boolean).length;
  const total = PERMISSION_CATALOG.reduce((s, c) => s + c.modules.reduce((ss, m) => ss + m.operations.length, 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 max-h-[72vh]">
      {/* LEFT — info */}
      <div className="lg:col-span-4 space-y-3 overflow-y-auto pr-1">
        <SectionHeader icon={Shield} title="Informasi Role" />
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Kode Role *</label>
          <input
            type="text"
            value={p.form.code}
            onChange={e => p.setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
            placeholder="ROLE_CODE"
            disabled={p.isEdit}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nama Role *</label>
          <input
            type="text"
            value={p.form.name}
            onChange={e => p.setForm(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            placeholder="Nama Role"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi</label>
          <textarea
            value={p.form.description}
            onChange={e => p.setForm(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Level Akses</label>
          <select
            value={p.form.level}
            onChange={e => p.setForm(prev => ({ ...prev, level: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {ROLE_LEVELS.map(l => (
              <option key={l.level} value={l.level}>L{l.level} · {l.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {ROLE_LEVELS.find(l => l.level === p.form.level)?.description}
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Scope Data</label>
          <select
            value={p.form.dataScope}
            onChange={e => p.setForm(prev => ({ ...prev, dataScope: e.target.value as DataScope }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {DATA_SCOPES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {DATA_SCOPES.find(s => s.value === p.form.dataScope)?.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="isActive"
            type="checkbox"
            checked={p.form.isActive}
            onChange={e => p.setForm(prev => ({ ...prev, isActive: e.target.checked }))}
            className="w-4 h-4 rounded"
          />
          <label htmlFor="isActive" className="text-sm text-gray-700">Role Aktif</label>
        </div>

        <SectionHeader icon={Sparkles} title="Terapkan Template" />
        <div className="space-y-2">
          <select
            onChange={e => { if (e.target.value) p.onApplyPreset(e.target.value); e.target.value = ''; }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            defaultValue=""
          >
            <option value="" disabled>Pilih preset...</option>
            {ROLE_PRESETS.map(preset => (
              <option key={preset.code} value={preset.code}>{preset.name}</option>
            ))}
          </select>
          <select
            onChange={e => { if (e.target.value) p.onCopyFrom(e.target.value); e.target.value = ''; }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            defaultValue=""
          >
            <option value="" disabled>Salin permission dari role...</option>
            {p.roles.map(r => (
              <option key={r.id} value={r.id}>{r.name} ({countPermissions(r.permissions)} perm)</option>
            ))}
          </select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <div className="flex items-center gap-2 text-sm">
            <Gauge className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900">Ringkasan</span>
          </div>
          <p className="text-xs text-blue-800 mt-1">
            {selectedCount} dari {total} permission terpilih
            <span className="mx-1">·</span>
            {Math.round((selectedCount / total) * 100)}% akses
          </p>
          <div className="mt-2 h-1.5 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${Math.round((selectedCount / total) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* RIGHT — permission matrix */}
      <div className="lg:col-span-8 flex flex-col border border-gray-200 rounded-lg bg-gray-50">
        <div className="p-3 border-b border-gray-200 bg-white rounded-t-lg flex flex-wrap items-center justify-between gap-2">
          <SectionHeader icon={Key} title="Permission Matrix" className="mb-0" />
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={p.permSearch}
                onChange={e => p.setPermSearch(e.target.value)}
                placeholder="Cari permission..."
                className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-xs w-52"
              />
            </div>
            <button onClick={p.onSelectAll} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">
              Pilih Semua
            </button>
            <button onClick={p.onClearAll} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">
              Hapus Semua
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {PERMISSION_CATALOG.map(cat => {
            const visibleModules = cat.modules.filter(m => m.operations.some(p.permMatches));
            if (visibleModules.length === 0) return null;

            const catOps = cat.modules.flatMap(m => m.operations);
            const catSelected = catOps.filter(o => p.form.permissions[o.key]).length;
            const catAllOn = catSelected === catOps.length;

            return (
              <div key={cat.id} className="bg-white rounded-lg border border-gray-200">
                <div className={`px-3 py-2 flex items-center justify-between border-b border-gray-100 rounded-t-lg ${cbg50(cat.color)}`}>
                  <div className="flex items-center gap-2">
                    <Layers className={`w-4 h-4 ${ctext600(cat.color)}`} />
                    <span className="font-medium text-sm text-gray-900">{cat.name}</span>
                    <span className="text-xs text-gray-500">({catSelected}/{catOps.length})</span>
                  </div>
                  <button
                    onClick={() => p.onToggleCategory(cat.id, catAllOn)}
                    className="text-xs px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    {catAllOn ? 'Unselect all' : 'Select all'}
                  </button>
                </div>

                <div className="divide-y divide-gray-100">
                  {visibleModules.map(m => {
                    const moduleSelected = m.operations.filter(o => p.form.permissions[o.key]).length;
                    const moduleAllOn = moduleSelected === m.operations.length;
                    const isExpanded = p.expanded[m.code] ?? true;

                    return (
                      <div key={m.code} className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <button
                            onClick={() =>
                              p.setExpanded(prev => ({ ...prev, [m.code]: !(prev[m.code] ?? true) }))
                            }
                            className="flex items-center gap-2 text-sm font-medium text-gray-800 hover:text-gray-900"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            {m.name}
                            <span className="text-xs text-gray-500 font-normal">
                              ({moduleSelected}/{m.operations.length})
                            </span>
                          </button>
                          <button
                            onClick={() => p.onToggleModule(m.operations, moduleAllOn)}
                            className="text-xs px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            {moduleAllOn ? 'Clear' : 'All'}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {m.operations.filter(p.permMatches).map(o => {
                              const selected = !!p.form.permissions[o.key];
                              const meta = ACTION_META[o.action];
                              const Icon = ACTION_ICONS[o.action];
                              return (
                                <button
                                  key={o.key}
                                  type="button"
                                  onClick={() => p.onToggle(o.key)}
                                  className={`text-left px-2.5 py-1.5 rounded-md border text-xs transition flex items-start gap-2 ${
                                    selected
                                      ? `${meta.color} ring-1 ring-current/30`
                                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                  }`}
                                  title={o.description || o.key}
                                >
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    selected ? 'bg-current/10 border-current' : 'border-gray-300'
                                  }`}>
                                    {selected && <CheckCircle className="w-3 h-3" />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <Icon className="w-3 h-3" />
                                      <span className="font-medium truncate">{o.label}</span>
                                      {o.sensitive && (
                                        <AlertTriangle className="w-3 h-3 text-orange-500" />
                                      )}
                                    </div>
                                    <div className="text-[10px] opacity-70 font-mono truncate">{o.key}</div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-gray-200 p-3 bg-white rounded-b-lg flex justify-end gap-2">
          <button
            onClick={p.onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            onClick={p.onSave}
            disabled={p.saving || !p.form.code || !p.form.name}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {p.saving ? 'Menyimpan...' : 'Simpan Role'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, className = '' }: { icon: any; title: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm font-semibold text-gray-700 ${className}`}>
      <Icon className="w-4 h-4" />
      {title}
    </div>
  );
}

// --- Access Matrix tab ---------------------------------------------------
function AccessMatrix({ roles }: { roles: Role[] }) {
  const [selectedModule, setSelectedModule] = useState<string>(PERMISSION_CATALOG[0]?.modules[0]?.code || '');

  const module = useMemo(() => {
    for (const cat of PERMISSION_CATALOG) {
      const m = cat.modules.find(x => x.code === selectedModule);
      if (m) return m;
    }
    return null;
  }, [selectedModule]);

  const activeRoles = roles.filter(r => r.isActive);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Layers className="w-4 h-4" /> Matriks Akses per Modul
          </h3>
          <p className="text-xs text-gray-500">Lihat role mana memiliki akses aksi apa pada modul tertentu</p>
        </div>
        <select
          value={selectedModule}
          onChange={e => setSelectedModule(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          {PERMISSION_CATALOG.map(cat => (
            <optgroup key={cat.id} label={cat.name}>
              {cat.modules.map(m => (
                <option key={m.code} value={m.code}>{m.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {module && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-2 px-3 font-medium text-gray-500 sticky left-0 bg-gray-50 z-10 min-w-[200px]">Aksi</th>
                {activeRoles.map(r => (
                  <th key={r.id} className="text-center py-2 px-2 font-medium text-gray-600 text-xs min-w-[110px]">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="truncate max-w-[100px]">{r.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">L{r.level}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {module.operations.map(op => {
                const meta = ACTION_META[op.action];
                const Icon = ACTION_ICONS[op.action];
                return (
                  <tr key={op.key} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${meta.color}`}>
                          <Icon className="w-3 h-3" />
                          {meta.label}
                        </span>
                        <span className="text-sm text-gray-800">{op.label}</span>
                        {op.sensitive && <AlertTriangle className="w-3 h-3 text-orange-500" />}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono ml-1">{op.key}</div>
                    </td>
                    {activeRoles.map(r => {
                      const has = r.permissions[op.key];
                      return (
                        <td key={r.id} className="text-center py-2 px-2">
                          {has ? (
                            <CheckCircle className="w-4 h-4 text-green-600 inline" />
                          ) : (
                            <span className="w-4 h-4 inline-block rounded-full border border-gray-200" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
