import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Save, User, Mail, Phone, Calendar,
  Briefcase, Target, Star, Clock, Building2,
  UserCheck, AlertCircle, Tag, DollarSign,
  MapPin, Navigation,
} from 'lucide-react';
import Link from 'next/link';
import EmployeePicker, { type PickedEmployee } from '@/components/humanify/EmployeePicker';
import {
  HRIS_DEPARTMENTS,
  getDepartmentLabel,
} from '@/lib/hris/master-data';
import {
  HRIS_TEAM_WORK_AREAS,
  departmentCodeForTeamRole,
  getWorkAreaLabel,
} from '@/lib/hris/team-member-sync';

type MemberRole = 'sales' | 'marketing' | 'ops' | 'finance' | 'admin' | 'manager' | 'executive';
type MemberStatus = 'active' | 'inactive' | 'resigned';

interface MemberForm {
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: MemberRole;
  department: string;
  joinDate: string;
  location: string;
  workArea: string;
  status: MemberStatus;
  linkedFromMaster: boolean;
}

const ROLE_OPTIONS: { value: MemberRole; label: string; icon: any }[] = [
  { value: 'sales', label: 'Sales', icon: Target },
  { value: 'marketing', label: 'Marketing', icon: Star },
  { value: 'ops', label: 'Operations', icon: Clock },
  { value: 'finance', label: 'Finance', icon: DollarSign },
  { value: 'admin', label: 'Admin', icon: User },
  { value: 'manager', label: 'Manager', icon: UserCheck },
  { value: 'executive', label: 'Executive', icon: Briefcase },
];

const INITIAL_FORM: MemberForm = {
  employeeId: '',
  name: '',
  email: '',
  phone: '',
  role: 'sales',
  department: departmentCodeForTeamRole('sales'),
  joinDate: new Date().toISOString().split('T')[0],
  location: '',
  workArea: 'OFFICE',
  status: 'active',
  linkedFromMaster: false,
};

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TeamMemberDetailPage() {
  const router = useRouter();
  const { id, edit } = router.query;
  const isNew = id === 'new';
  const isEdit = isNew || edit === 'true';

  const [form, setForm] = useState<MemberForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [member, setMember] = useState<any>(null);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isNew && id && typeof id === 'string') fetchMember(id);
  }, [id, isNew, edit]);

  const isValidUUID = (str: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  };

  const fetchMember = async (memberId: string) => {
    setLoading(true);
    setError(null);

    if (!isValidUUID(memberId)) {
      setError(`Invalid ID format: "${memberId}". ID harus berupa UUID yang valid.`);
      setLoading(false);
      toast.error('ID tidak valid — pastikan URL menggunakan UUID yang benar');
      return;
    }

    try {
      const res = await fetch(`/api/humanify/team-members?id=${memberId}`);
      const json = await res.json();
      if (json.success && json.data) {
        const found = json.data;
        setMember(found);
        setDataSource('live');
        if (isNew || edit === 'true') {
          setForm({
            employeeId: found.employeeId || '',
            name: found.name || '',
            email: found.email || '',
            phone: found.phone || '',
            role: found.role || 'sales',
            department: found.department || '',
            joinDate: found.joinDate || new Date().toISOString().split('T')[0],
            location: found.location || '',
            workArea: found.workArea || 'OFFICE',
            status: found.status || 'active',
            linkedFromMaster: Boolean(found.employeeId),
          });
        }
      } else {
        setError(json.error || 'Anggota tidak ditemukan');
        setDataSource('empty');
        toast.error(json.error || 'Anggota tidak ditemukan');
      }
    } catch {
      setError('Gagal memuat data anggota');
      toast.error('Gagal memuat data anggota');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = isNew ? '/api/humanify/team-members' : `/api/humanify/team-members?id=${id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          employeeId: form.employeeId || undefined,
        }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(isNew ? 'Member created' : 'Member updated');
        router.push(isNew ? `/humanify/team-members/${json.data.id}` : `/humanify/team-members/${id}`);
      } else {
        toast.error(json.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save member');
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof MemberForm>(field: K, value: MemberForm[K]) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'role') {
        next.department = departmentCodeForTeamRole(String(value), prev.department);
      }
      return next;
    });
  };

  const handleEmployeePick = (emp: PickedEmployee | null) => {
    if (!emp) {
      setForm(prev => ({
        ...INITIAL_FORM,
        role: prev.role,
        department: departmentCodeForTeamRole(prev.role),
      }));
      return;
    }
    setForm(prev => ({
      ...prev,
      employeeId: emp.id,
      name: emp.name,
      email: emp.email || '',
      phone: '',
      department: emp.department || departmentCodeForTeamRole(prev.role),
      location: emp.branch_name || '',
      workArea: emp.work_location === 'FIELD' ? 'FIELD' : emp.work_location === 'REMOTE' ? 'HYBRID' : 'OFFICE',
      joinDate: emp.join_date || prev.joinDate,
      linkedFromMaster: true,
    }));
  };

  if (loading) {
    return (
      <HumanifyLayout>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-5 h-5 border-2 border-[var(--hf-brand-100)] border-t-transparent rounded-full animate-spin" />
            Loading member...
          </div>
        </div>
      </HumanifyLayout>
    );
  }

  if (error && !member) {
    return (
      <HumanifyLayout>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <Link href="/humanify/team-members" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Back to Team Members
          </Link>
          <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-red-700 mb-1">Error Loading Member</h2>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <Link href="/humanify/team-members"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--hf-brand-600)] text-white rounded-lg hover:bg-[var(--hf-brand)]">
              <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Anggota
            </Link>
          </div>
        </div>
      </HumanifyLayout>
    );
  }

  // View mode
  if (!isEdit && member) {
    return (
      <HumanifyLayout>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Link href="/humanify/team-members" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" /> Back to Team Members
            </Link>
            <div className="flex items-center gap-2">
              <DataSourceBadge source={dataSource} />
              <Link href={`/humanify/team-members/${member.id}?edit=true`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--hf-brand-600)] text-white rounded-lg hover:bg-[var(--hf-brand)]">
                Edit Member
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-[var(--hf-brand-100)] flex items-center justify-center">
                <span className="text-xl font-bold text-[color:var(--hf-brand-600)]">
                  {member.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{member.name}</h1>
                <p className="text-sm text-gray-500">{member.code}{member.employeeUid ? ` · UID: ${member.employeeUid}` : ''} · {member.role}</p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                member.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                member.status === 'inactive' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'
              }`}>
                {member.status?.charAt(0).toUpperCase() + member.status?.slice(1)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Contact</h3>
              {member.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" /> <div>{member.email}</div>
                </div>
              )}
              {member.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" /> <div>{member.phone}</div>
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Details</h3>
              <div className="flex items-center gap-3 text-sm">
                <Briefcase className="w-4 h-4 text-gray-400" />
                <div><span className="text-gray-500">Role:</span> {member.role}</div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Tag className="w-4 h-4 text-gray-400" />
                <div><span className="text-gray-500">Code:</span> {member.code}{member.employeeUid ? ` • UID: ${member.employeeUid}` : ''}</div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="w-4 h-4 text-gray-400" />
                <div><span className="text-gray-500">Dept:</span> {getDepartmentLabel(member.department) || member.departmentLabel || member.department || '-'}</div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div><span className="text-gray-500">Joined:</span> {formatDate(member.joinDate)}</div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                <div><span className="text-gray-500">Location:</span> {member.location || '-'}</div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Navigation className="w-4 h-4 text-gray-400" />
                <div><span className="text-gray-500">Work Area:</span> {getWorkAreaLabel(member.workArea) || member.workAreaLabel || '-'}</div>
              </div>
            </div>
          </div>
        </div>
      </HumanifyLayout>
    );
  }

  // Edit/Create form
  return (
    <HumanifyLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <Link href={isNew ? '/humanify/team-members' : `/humanify/team-members/${id}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> {isNew ? 'Back to Team Members' : 'Back to details'}
        </Link>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">{isNew ? 'Add Team Member' : 'Edit Member'}</h1>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {isNew && (
              <EmployeePicker
                label="Karyawan (Master Data HRIS)"
                value={form.employeeId}
                onChange={handleEmployeePick}
                placeholder="Pilih karyawan untuk auto-fill data..."
              />
            )}

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
              <div className="grid grid-cols-4 gap-3">
                {ROLE_OPTIONS.map(r => {
                  const Icon = r.icon;
                  const selected = form.role === r.value;
                  return (
                    <button key={r.value} type="button" onClick={() => updateField('role', r.value)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        selected ? 'border-[var(--hf-brand-100)] bg-[var(--hf-brand-50)] text-[color:var(--hf-brand)]' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}>
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
                <input type="text" value={form.name} onChange={e => updateField('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--hf-brand-500)] disabled:bg-gray-50"
                  placeholder="e.g., Andi Pratama" required readOnly={form.linkedFromMaster} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--hf-brand-500)] disabled:bg-gray-50"
                  placeholder="email@simesi.co.id" readOnly={form.linkedFromMaster} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="text" value={form.phone} onChange={e => updateField('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--hf-brand-500)]"
                  placeholder="0812xxxxxxx" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Departemen</label>
                <select value={form.department} onChange={e => updateField('department', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--hf-brand-500)]">
                  <option value="">Pilih departemen</option>
                  {HRIS_DEPARTMENTS.map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Bergabung</label>
                <input type="date" value={form.joinDate} onChange={e => updateField('joinDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--hf-brand-500)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi / Cabang</label>
                <input type="text" value={form.location} onChange={e => updateField('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--hf-brand-500)]"
                  placeholder="e.g., Jakarta, Kantor Pusat" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area Kerja</label>
                <select value={form.workArea} onChange={e => updateField('workArea', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--hf-brand-500)]">
                  {HRIS_TEAM_WORK_AREAS.map(w => (
                    <option key={w.code} value={w.code}>{w.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status (for edit mode) */}
            {!isNew && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={e => updateField('status', e.target.value as MemberStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--hf-brand-500)]">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="resigned">Resigned</option>
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <Link href={isNew ? '/humanify/team-members' : `/humanify/team-members/${id}`}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">Cancel</Link>
              <button type="submit" disabled={saving || !form.name}
                className="inline-flex items-center gap-2 px-6 py-2 bg-[var(--hf-brand-600)] text-white rounded-lg hover:bg-[var(--hf-brand)] disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4" /> {isNew ? 'Add Member' : 'Save Changes'}</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </HumanifyLayout>
  );
}
