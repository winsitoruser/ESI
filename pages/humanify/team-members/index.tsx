import React, { useState, useEffect, useCallback } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { toast } from 'react-hot-toast';
import {
  Users, Search, Plus, Filter, ChevronDown,
  Edit, Trash2, Eye, RefreshCw, Phone, Mail,
  Calendar, UserCheck, UserX, Target, Building2,
  ChevronLeft, ChevronRight, Briefcase, Clock, Star,
  User, UserPlus, AlertCircle, CheckCircle,
  MapPin, Navigation,
} from 'lucide-react';
import Link from 'next/link';
import { getDepartmentLabel } from '@/lib/hris/master-data';
import { getWorkAreaLabel } from '@/lib/hris/team-member-sync';

type MemberRole = 'sales' | 'marketing' | 'ops' | 'finance' | 'admin' | 'manager' | 'executive';
type MemberStatus = 'active' | 'inactive' | 'resigned';

interface TeamMember {
  id: string;
  code: string;
  employeeUid?: string;
  employeeId?: string;
  name: string;
  email: string;
  phone: string;
  role: MemberRole;
  department: string;
  location: string;
  workArea: string;
  status: MemberStatus;
  joinDate: string;
  createdAt: string;
}

const ROLE_CONFIG: Record<MemberRole, { label: string; color: string; icon: any }> = {
  sales: { label: 'Sales', color: 'text-emerald-600 bg-emerald-50', icon: Target },
  marketing: { label: 'Marketing', color: 'text-purple-600 bg-purple-50', icon: Star },
  ops: { label: 'Operations', color: 'text-blue-600 bg-blue-50', icon: Clock },
  finance: { label: 'Finance', color: 'text-amber-600 bg-amber-50', icon: Briefcase },
  admin: { label: 'Admin', color: 'text-gray-600 bg-gray-50', icon: User },
  manager: { label: 'Manager', color: 'text-indigo-600 bg-indigo-50', icon: UserCheck },
  executive: { label: 'Executive', color: 'text-rose-600 bg-rose-50', icon: Star },
};

const STATUS_STYLES: Record<MemberStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-600' },
  resigned: { label: 'Resigned', color: 'bg-red-100 text-red-700' },
};

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TeamMembersPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<{ total: number; active: number; roleCounts: Record<string, number> } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const limit = 20;

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/humanify/team-members?${params}`);
      const json = await res.json();

      if (json.success) {
        setMembers(json.data);
        if (json.summary) setSummary(json.summary);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages);
          setTotal(json.pagination.total);
        }
      } else {
        toast.error(json.error || 'Failed to load team members');
      }
    } catch {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Nonaktifkan anggota tim "${name}"?`)) return;
    try {
      const res = await fetch(`/api/humanify/team-members?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success('Anggota tim dinonaktifkan');
        fetchMembers();
      } else {
        toast.error(json.error || 'Gagal menonaktifkan');
      }
    } catch {
      toast.error('Gagal menonaktifkan anggota tim');
    }
  };

  const RoleBadge = ({ role }: { role: MemberRole }) => {
    const config = ROLE_CONFIG[role];
    if (!config) return <span className="text-xs">{role}</span>;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Stats
  const activeCount = summary?.active ?? members.filter(m => m.status === 'active').length;
  const roleCounts = summary?.roleCounts ?? Object.keys(ROLE_CONFIG).reduce((acc, key) => {
    acc[key] = members.filter(m => m.role === key).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <HumanifyLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Anggota Tim</h1>
            <p className="text-sm text-gray-500 mt-1">
              Kelola tim sales, marketing & operasional perusahaan
              {summary ? ` · ${summary.total} anggota` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchMembers()}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/humanify/team-members/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tambah Anggota
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Active</p>
                <p className="text-lg font-semibold text-gray-900">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Sales</p>
                <p className="text-lg font-semibold text-gray-900">{roleCounts['sales'] || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Marketing</p>
                <p className="text-lg font-semibold text-gray-900">{roleCounts['marketing'] || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Ops & Finance</p>
                <p className="text-lg font-semibold text-gray-900">{(roleCounts['ops'] || 0) + (roleCounts['finance'] || 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, code..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors ${
                showFilters || roleFilter || statusFilter
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {(roleFilter || statusFilter) && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
            </button>
          </div>

          {showFilters && (
            <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Role:</label>
                <select
                  value={roleFilter}
                  onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Roles</option>
                  {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Status:</label>
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="resigned">Resigned</option>
                </select>
              </div>
              {(roleFilter || statusFilter) && (
                <button onClick={() => { setRoleFilter(''); setStatusFilter(''); setPage(1); }}
                  className="text-sm text-red-600 hover:text-red-700">Clear filters</button>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Work Area</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <RefreshCw className="w-5 h-5 animate-spin" /> Loading members...
                    </div>
                  </td></tr>
                ) : members.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Users className="w-12 h-12" />
                      <p className="text-sm">No team members found</p>
                      <Link href="/humanify/team-members/new" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                        Add your first member
                      </Link>
                    </div>
                  </td></tr>
                ) : members.map(member => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-xs font-semibold text-indigo-600">
                            {member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <Link href={`/humanify/team-members/${member.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-indigo-600">{member.name}</Link>
                          <p className="text-xs text-gray-400">{member.code}{member.employeeUid ? ` • ${member.employeeUid}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={member.role} /></td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {member.email && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Mail className="w-3.5 h-3.5 text-gray-400" /> {member.email}
                          </div>
                        )}
                        {member.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Phone className="w-3.5 h-3.5 text-gray-400" /> {member.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{getDepartmentLabel(member.department) || (member as any).departmentLabel || member.department || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" /> {member.location || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {member.workArea ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                          <Navigation className="w-3 h-3" /> {getWorkAreaLabel(member.workArea) || (member as any).workAreaLabel || member.workArea}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-gray-600">{formatDate(member.joinDate)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[member.status]?.color}`}>
                        {STATUS_STYLES[member.status]?.label || member.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/humanify/team-members/${member.id}`}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link href={`/humanify/team-members/${member.id}?edit=true`}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit">
                          <Edit className="w-4 h-4" />
                        </Link>
                        {member.status === 'active' && (
                          <button onClick={() => handleDeactivate(member.id, member.name)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Nonaktifkan">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total} members
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </HumanifyLayout>
  );
}
