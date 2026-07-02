import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '../../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Save, User, Mail, Phone, Calendar,
  Briefcase, Target, Star, Clock, Building2,
  UserCheck, AlertCircle, Tag, DollarSign,
} from 'lucide-react';
import Link from 'next/link';

type MemberRole = 'sales' | 'marketing' | 'ops' | 'finance' | 'admin' | 'manager' | 'executive';
type MemberStatus = 'active' | 'inactive' | 'resigned';

interface MemberForm {
  name: string;
  email: string;
  phone: string;
  role: MemberRole;
  department: string;
  joinDate: string;
  status: MemberStatus;
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
  name: '',
  email: '',
  phone: '',
  role: 'sales',
  department: '',
  joinDate: new Date().toISOString().split('T')[0],
  status: 'active',
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

  useEffect(() => {
    if (!isNew && id && typeof id === 'string') fetchMember(id);
  }, [id, isNew]);

  const fetchMember = async (memberId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hq/hris/team-members?search=${memberId}&limit=1`);
      const json = await res.json();
      if (json.success) {
        // For mock data, find by id
        const found = json.data.find((m: any) => m.id === memberId) || json.data[0];
        if (found) {
          setMember(found);
          if (isEdit) {
            setForm({
              name: found.name || '',
              email: found.email || '',
              phone: found.phone || '',
              role: found.role || 'sales',
              department: found.department || '',
              joinDate: found.joinDate || new Date().toISOString().split('T')[0],
              status: found.status || 'active',
            });
          }
        } else {
          toast.error('Member not found');
        }
      } else {
        toast.error(json.error || 'Member not found');
      }
    } catch {
      toast.error('Failed to load member');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = isNew ? '/api/hq/hris/team-members' : `/api/hq/hris/team-members?search=${id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(isNew ? 'Member created' : 'Member updated');
        router.push(isNew ? `/hq/hris/team-members/${json.data.id}` : `/hq/hris/team-members/${id}`);
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
    setForm(prev => ({ ...prev, [field]: value }));
    // Auto-set department based on role
    if (field === 'role') {
      const deptMap: Record<string, string> = {
        sales: 'Sales & Marketing',
        marketing: 'Sales & Marketing',
        ops: 'Operations',
        finance: 'Finance',
        admin: 'Administration',
        manager: 'Management',
        executive: 'Executive',
      };
      setForm(prev => ({ ...prev, [field]: value, department: deptMap[value] || prev.department }));
    }
  };

  if (loading) {
    return (
      <HQLayout>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            Loading member...
          </div>
        </div>
      </HQLayout>
    );
  }

  // View mode
  if (!isEdit && member) {
    return (
      <HQLayout>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Link href="/hq/hris/team-members" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" /> Back to Team Members
            </Link>
            <Link href={`/hq/hris/team-members/${member.id}?edit=true`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Edit Member
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-xl font-bold text-indigo-600">
                  {member.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{member.name}</h1>
                <p className="text-sm text-gray-500">{member.code} · {member.role}</p>
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
                <Building2 className="w-4 h-4 text-gray-400" />
                <div><span className="text-gray-500">Dept:</span> {member.department || '-'}</div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div><span className="text-gray-500">Joined:</span> {formatDate(member.joinDate)}</div>
              </div>
            </div>
          </div>
        </div>
      </HQLayout>
    );
  }

  // Edit/Create form
  return (
    <HQLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <Link href={isNew ? '/hq/hris/team-members' : `/hq/hris/team-members/${id}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> {isNew ? 'Back to Team Members' : 'Back to details'}
        </Link>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">{isNew ? 'Add Team Member' : 'Edit Member'}</h1>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                        selected ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input type="text" value={form.name} onChange={e => updateField('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Andi Pratama" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="email@simesi.co.id" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="text" value={form.phone} onChange={e => updateField('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="0812xxxxxxx" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input type="text" value={form.department} onChange={e => updateField('department', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Auto-filled from role" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
                <input type="date" value={form.joinDate} onChange={e => updateField('joinDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            {/* Status (for edit mode) */}
            {!isNew && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={e => updateField('status', e.target.value as MemberStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="resigned">Resigned</option>
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <Link href={isNew ? '/hq/hris/team-members' : `/hq/hris/team-members/${id}`}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">Cancel</Link>
              <button type="submit" disabled={saving || !form.name}
                className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
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
    </HQLayout>
  );
}
