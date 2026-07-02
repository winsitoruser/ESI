import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import {
  CalendarDays, Clock, CheckCircle, XCircle, AlertTriangle, Users,
  Search, Filter, Download, Plus, Eye, ChevronDown, Building2,
  Coffee, Heart, Baby, UserX, Calendar, Settings, Shield, ArrowRight,
  ChevronRight, Layers, X, Save, Trash2, Edit, AlertCircle, RefreshCw,
  Copy, FileText, Info, Database, Palette, ToggleLeft, ToggleRight
} from 'lucide-react';

interface LeaveRequest {
  id: string;
  employee_name?: string; employeeName?: string;
  position: string;
  department: string;
  leave_type?: string; leaveType?: string;
  start_date?: string; startDate?: string;
  end_date?: string; endDate?: string;
  total_days?: number; totalDays?: number;
  reason: string;
  status: string;
  approved_at?: string; approvedAt?: string;
  rejection_reason?: string; rejectionReason?: string;
  current_approval_step?: number;
  total_approval_steps?: number;
  approvalSteps?: any[];
}

interface LeaveTypeItem {
  id: string; code: string; name: string; category: string;
  max_days_per_year: number; min_days_per_request?: number; max_days_per_request?: number;
  is_paid: boolean; color: string; icon: string;
  carry_forward?: boolean; max_carry_forward_days?: number;
  requires_attachment?: boolean; requires_medical_cert?: boolean;
  salary_deduction_percent?: number; applicable_gender?: string;
  min_service_months?: number; applicable_departments?: string[];
  applicable_positions?: string[]; is_active?: boolean;
  sort_order?: number; description?: string;
}

interface ApprovalLevel {
  level: number; role: string; title: string; required: boolean; can_delegate?: boolean;
}

interface ApprovalConfig {
  id: string; name: string; description: string;
  department: string | null; division?: string | null;
  approval_levels: ApprovalLevel[];
  min_days_trigger: number; max_auto_approve_days?: number;
  escalation_hours: number; is_active: boolean;
}

const leaveTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  annual: { label: 'Cuti Tahunan', icon: CalendarDays, color: 'bg-blue-100 text-blue-700' },
  sick: { label: 'Sakit', icon: Heart, color: 'bg-red-100 text-red-700' },
  maternity: { label: 'Melahirkan', icon: Baby, color: 'bg-pink-100 text-pink-700' },
  paternity: { label: 'Cuti Ayah', icon: Baby, color: 'bg-indigo-100 text-indigo-700' },
  unpaid: { label: 'Tanpa Gaji', icon: UserX, color: 'bg-gray-100 text-gray-700' },
  personal: { label: 'Keperluan Pribadi', icon: Coffee, color: 'bg-amber-100 text-amber-700' },
  bereavement: { label: 'Duka Cita', icon: Heart, color: 'bg-purple-100 text-purple-700' },
  marriage: { label: 'Pernikahan', icon: Heart, color: 'bg-rose-100 text-rose-700' },
  religious: { label: 'Keagamaan', icon: Calendar, color: 'bg-emerald-100 text-emerald-700' },
  comp_off: { label: 'Pengganti Libur', icon: RefreshCw, color: 'bg-cyan-100 text-cyan-700' },
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Disetujui', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelled: { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-600', icon: XCircle },
};

const CATEGORIES = ['regular', 'medical', 'special', 'unpaid', 'religious', 'compensatory'];
const DEPARTMENTS = ['MANAGEMENT','OPERATIONS','SALES','FINANCE','ADMINISTRATION','WAREHOUSE','KITCHEN','CUSTOMER_SERVICE','IT','HR'];
const COLOR_PRESETS = ['#3B82F6','#EF4444','#EC4899','#8B5CF6','#F59E0B','#10B981','#06B6D4','#F43F5E','#6B7280','#14B8A6','#D946EF','#FB923C'];

const defaultTypeForm = {
  code: '', name: '', description: '', category: 'regular',
  max_days_per_year: 12, min_days_per_request: 1, max_days_per_request: 14,
  is_paid: true, salary_deduction_percent: 0,
  carry_forward: false, max_carry_forward_days: 0,
  requires_attachment: false, requires_medical_cert: false,
  applicable_gender: '', min_service_months: 0,
  applicable_departments: [] as string[], applicable_positions: [] as string[],
  color: '#3B82F6', icon: 'calendar', is_active: true, sort_order: 0,
};

const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [
  { id: 'lr1', employee_name: 'Siti Rahayu', position: 'Branch Manager', department: 'OPERATIONS', leave_type: 'annual', start_date: '2026-03-15', end_date: '2026-03-18', total_days: 3, reason: 'Liburan keluarga', status: 'pending', current_approval_step: 1, total_approval_steps: 2 },
  { id: 'lr2', employee_name: 'Budi Santoso', position: 'Branch Manager', department: 'OPERATIONS', leave_type: 'sick', start_date: '2026-03-12', end_date: '2026-03-13', total_days: 2, reason: 'Sakit demam', status: 'pending', current_approval_step: 1, total_approval_steps: 1 },
  { id: 'lr3', employee_name: 'Lisa Permata', position: 'Finance Manager', department: 'FINANCE', leave_type: 'personal', start_date: '2026-03-20', end_date: '2026-03-20', total_days: 1, reason: 'Keperluan pribadi', status: 'pending', current_approval_step: 1, total_approval_steps: 2 },
  { id: 'lr4', employee_name: 'Rina Anggraini', position: 'Head Chef', department: 'KITCHEN', leave_type: 'annual', start_date: '2026-03-10', end_date: '2026-03-14', total_days: 5, reason: 'Pulang kampung', status: 'approved', approved_at: '2026-03-08' },
  { id: 'lr5', employee_name: 'Fajar Setiawan', position: 'Sales Supervisor', department: 'SALES', leave_type: 'sick', start_date: '2026-03-05', end_date: '2026-03-05', total_days: 1, reason: 'Sakit perut', status: 'approved', approved_at: '2026-03-05' },
  { id: 'lr6', employee_name: 'Hendra Gunawan', position: 'Warehouse Staff', department: 'WAREHOUSE', leave_type: 'unpaid', start_date: '2026-02-28', end_date: '2026-03-01', total_days: 2, reason: 'Urusan keluarga mendesak', status: 'rejected', rejection_reason: 'Staf tidak mencukupi' },
];

const MOCK_LEAVE_TYPES: LeaveTypeItem[] = [
  { id: 'lt1', code: 'ANNUAL', name: 'Cuti Tahunan', category: 'regular', max_days_per_year: 12, is_paid: true, color: '#3B82F6', icon: 'calendar', carry_forward: true, max_carry_forward_days: 6, is_active: true, sort_order: 1 },
  { id: 'lt2', code: 'SICK', name: 'Cuti Sakit', category: 'medical', max_days_per_year: 14, is_paid: true, color: '#EF4444', icon: 'heart', requires_medical_cert: true, is_active: true, sort_order: 2 },
  { id: 'lt3', code: 'PERSONAL', name: 'Cuti Pribadi', category: 'regular', max_days_per_year: 3, is_paid: true, color: '#F59E0B', icon: 'coffee', is_active: true, sort_order: 3 },
  { id: 'lt4', code: 'MATERNITY', name: 'Cuti Melahirkan', category: 'special', max_days_per_year: 90, is_paid: true, color: '#EC4899', icon: 'baby', applicable_gender: 'female', is_active: true, sort_order: 4 },
  { id: 'lt5', code: 'UNPAID', name: 'Cuti Tanpa Gaji', category: 'unpaid', max_days_per_year: 30, is_paid: false, color: '#6B7280', icon: 'user-x', salary_deduction_percent: 100, is_active: true, sort_order: 5 },
  { id: 'lt6', code: 'MARRIAGE', name: 'Cuti Pernikahan', category: 'special', max_days_per_year: 3, is_paid: true, color: '#F43F5E', icon: 'heart', is_active: true, sort_order: 6 },
];

const MOCK_LEAVE_SUMMARY = {
  totalRequests: 42, pending: 3, approved: 35, rejected: 4,
  totalDaysUsed: 128, avgDaysPerEmployee: 3.2,
  byType: { annual: 58, sick: 32, personal: 18, unpaid: 8, maternity: 12 },
};

const MOCK_LEAVE_BALANCES = [
  { employee_name: 'Ahmad Wijaya', department: 'MANAGEMENT', annual: { total: 12, used: 3, remaining: 9 }, sick: { total: 14, used: 0, remaining: 14 } },
  { employee_name: 'Siti Rahayu', department: 'OPERATIONS', annual: { total: 12, used: 5, remaining: 7 }, sick: { total: 14, used: 2, remaining: 12 } },
  { employee_name: 'Budi Santoso', department: 'OPERATIONS', annual: { total: 12, used: 2, remaining: 10 }, sick: { total: 14, used: 3, remaining: 11 } },
  { employee_name: 'Lisa Permata', department: 'FINANCE', annual: { total: 12, used: 4, remaining: 8 }, sick: { total: 14, used: 1, remaining: 13 } },
  { employee_name: 'Rina Anggraini', department: 'KITCHEN', annual: { total: 12, used: 8, remaining: 4 }, sick: { total: 14, used: 0, remaining: 14 } },
];

export default function LeaveManagementPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'approval-config' | 'leave-types' | 'balances'>('requests');

  // Data
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeItem[]>([]);
  const [approvalConfigs, setApprovalConfigs] = useState<ApprovalConfig[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ApprovalConfig | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<LeaveTypeItem | null>(null);
  const [typeForm, setTypeForm] = useState({ ...defaultTypeForm });

  // Config form
  const [configForm, setConfigForm] = useState<{
    name: string; description: string; department: string; division: string;
    minDaysTrigger: number; maxAutoApproveDays: number; escalationHours: number;
    levels: ApprovalLevel[];
  }>({
    name: '', description: '', department: '', division: '',
    minDaysTrigger: 1, maxAutoApproveDays: 0, escalationHours: 48,
    levels: [{ level: 1, role: 'SUPERVISOR', title: 'Supervisor', required: true, can_delegate: true }]
  });

  // Toast
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hq/hris/leave-management');
      if (!res.ok) { console.error('Fetch leave data failed:', res.status); setLoading(false); return; }
      const json = await res.json();
      if (json.success) {
        setRequests(json.requests || []);
        setLeaveTypes(json.leaveTypes || []);
        setApprovalConfigs(json.approvalConfigs || []);
        setBalances(json.balances || []);
        setSummary(json.summary || {});
      }
    } catch {
      setRequests(MOCK_LEAVE_REQUESTS);
      setLeaveTypes(MOCK_LEAVE_TYPES);
      setSummary(MOCK_LEAVE_SUMMARY);
      setBalances(MOCK_LEAVE_BALANCES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setMounted(true); fetchData(); }, []);

  const filtered = useMemo(() => {
    let list = requests;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(l => {
        const name = (l.employee_name || l.employeeName || '').toLowerCase();
        const dept = (l.department || '').toLowerCase();
        return name.includes(q) || dept.includes(q);
      });
    }
    if (statusFilter !== 'all') list = list.filter(l => l.status === statusFilter);
    if (typeFilter !== 'all') list = list.filter(l => (l.leave_type || l.leaveType) === typeFilter);
    return list;
  }, [requests, searchQuery, statusFilter, typeFilter]);

  const handleApproveStep = async (requestId: string) => {
    try {
      const res = await fetch('/api/hq/hris/leave-management?action=approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveRequestId: requestId, comments: 'Disetujui' })
      });
      const json = await res.json();
      if (json.success) { showToast('success', json.message || 'Berhasil disetujui'); fetchData(); setShowDetailModal(false); }
      else showToast('error', json.error || 'Gagal');
    } catch { showToast('error', 'Gagal menyetujui'); }
  };

  const handleReject = async (requestId: string) => {
    if (!actionReason) { showToast('error', 'Alasan penolakan wajib diisi'); return; }
    try {
      const res = await fetch('/api/hq/hris/leave-management?action=reject', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveRequestId: requestId, reason: actionReason })
      });
      const json = await res.json();
      if (json.success) { showToast('success', 'Cuti ditolak'); fetchData(); setShowDetailModal(false); setActionReason(''); }
      else showToast('error', json.error || 'Gagal');
    } catch { showToast('error', 'Gagal menolak'); }
  };

  const handleSaveConfig = async () => {
    if (!configForm.name || configForm.levels.length === 0) {
      showToast('error', 'Nama dan minimal 1 level persetujuan diperlukan'); return;
    }
    try {
      const isEdit = !!editingConfig;
      const res = await fetch(`/api/hq/hris/leave-management?action=approval-config`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? { id: editingConfig!.id } : {}),
          name: configForm.name, description: configForm.description,
          department: configForm.department || null, division: configForm.division || null,
          minDaysTrigger: configForm.minDaysTrigger, maxAutoApproveDays: configForm.maxAutoApproveDays,
          approvalLevels: configForm.levels, escalationHours: configForm.escalationHours
        })
      });
      const json = await res.json();
      if (json.success) { showToast('success', isEdit ? 'Konfigurasi diperbarui' : 'Konfigurasi dibuat'); fetchData(); setShowConfigModal(false); }
      else showToast('error', json.error || 'Gagal');
    } catch { showToast('error', 'Gagal menyimpan konfigurasi'); }
  };

  const openEditConfig = (cfg: ApprovalConfig) => {
    setEditingConfig(cfg);
    setConfigForm({
      name: cfg.name, description: cfg.description || '',
      department: cfg.department || '', division: cfg.division || '',
      minDaysTrigger: cfg.min_days_trigger, maxAutoApproveDays: cfg.max_auto_approve_days || 0,
      escalationHours: cfg.escalation_hours,
      levels: cfg.approval_levels || []
    });
    setShowConfigModal(true);
  };

  const openNewConfig = () => {
    setEditingConfig(null);
    setConfigForm({
      name: '', description: '', department: '', division: '',
      minDaysTrigger: 1, maxAutoApproveDays: 0, escalationHours: 48,
      levels: [{ level: 1, role: 'SUPERVISOR', title: 'Supervisor', required: true, can_delegate: true }]
    });
    setShowConfigModal(true);
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm('Hapus konfigurasi ini?')) return;
    try {
      const res = await fetch(`/api/hq/hris/leave-management?action=approval-config&id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { showToast('success', 'Dihapus'); fetchData(); }
      else showToast('error', json.error || 'Gagal');
    } catch { showToast('error', 'Gagal menghapus'); }
  };

  // ===== Leave Type handlers =====
  const openNewType = () => {
    setEditingType(null);
    setTypeForm({ ...defaultTypeForm, sort_order: leaveTypes.length + 1 });
    setShowTypeModal(true);
  };

  const openEditType = (lt: LeaveTypeItem) => {
    setEditingType(lt);
    setTypeForm({
      code: lt.code, name: lt.name, description: lt.description || '',
      category: lt.category || 'regular',
      max_days_per_year: lt.max_days_per_year,
      min_days_per_request: lt.min_days_per_request || 1,
      max_days_per_request: lt.max_days_per_request || 14,
      is_paid: lt.is_paid !== false,
      salary_deduction_percent: lt.salary_deduction_percent || 0,
      carry_forward: lt.carry_forward || false,
      max_carry_forward_days: lt.max_carry_forward_days || 0,
      requires_attachment: lt.requires_attachment || false,
      requires_medical_cert: lt.requires_medical_cert || false,
      applicable_gender: lt.applicable_gender || '',
      min_service_months: lt.min_service_months || 0,
      applicable_departments: lt.applicable_departments || [],
      applicable_positions: lt.applicable_positions || [],
      color: lt.color || '#3B82F6', icon: lt.icon || 'calendar',
      is_active: lt.is_active !== false,
      sort_order: lt.sort_order || 0,
    });
    setShowTypeModal(true);
  };

  const handleSaveType = async () => {
    if (!typeForm.code || !typeForm.name) {
      showToast('error', 'Kode dan Nama wajib diisi'); return;
    }
    try {
      const isEdit = !!editingType;
      const payload: any = {
        code: typeForm.code, name: typeForm.name, description: typeForm.description,
        category: typeForm.category, color: typeForm.color, icon: typeForm.icon,
        maxDaysPerYear: typeForm.max_days_per_year,
        minDaysPerRequest: typeForm.min_days_per_request,
        maxDaysPerRequest: typeForm.max_days_per_request,
        isPaid: typeForm.is_paid,
        salaryDeductionPercent: typeForm.salary_deduction_percent,
        carryForward: typeForm.carry_forward,
        maxCarryForwardDays: typeForm.max_carry_forward_days,
        requiresAttachment: typeForm.requires_attachment,
        requiresMedicalCert: typeForm.requires_medical_cert,
        applicableGender: typeForm.applicable_gender || null,
        minServiceMonths: typeForm.min_service_months,
        applicableDepartments: typeForm.applicable_departments,
        applicablePositions: typeForm.applicable_positions,
        isActive: typeForm.is_active,
        sortOrder: typeForm.sort_order,
      };
      if (isEdit) payload.id = editingType!.id;
      const res = await fetch('/api/hq/hris/leave-management?action=type', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) { showToast('success', isEdit ? 'Tipe cuti diperbarui' : 'Tipe cuti dibuat'); fetchData(); setShowTypeModal(false); }
      else showToast('error', json.error || 'Gagal menyimpan');
    } catch { showToast('error', 'Gagal menyimpan tipe cuti'); }
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm('Hapus tipe cuti ini? Data saldo dan pengajuan terkait bisa terpengaruh.')) return;
    try {
      const res = await fetch(`/api/hq/hris/leave-management?action=type&id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { showToast('success', 'Tipe cuti dihapus'); fetchData(); }
      else showToast('error', json.error || 'Gagal');
    } catch { showToast('error', 'Gagal menghapus'); }
  };

  const handleDuplicateType = (lt: LeaveTypeItem) => {
    setEditingType(null);
    setTypeForm({
      code: lt.code + '_copy', name: lt.name + ' (Salinan)', description: lt.description || '',
      category: lt.category || 'regular',
      max_days_per_year: lt.max_days_per_year,
      min_days_per_request: lt.min_days_per_request || 1,
      max_days_per_request: lt.max_days_per_request || 14,
      is_paid: lt.is_paid !== false,
      salary_deduction_percent: lt.salary_deduction_percent || 0,
      carry_forward: lt.carry_forward || false,
      max_carry_forward_days: lt.max_carry_forward_days || 0,
      requires_attachment: lt.requires_attachment || false,
      requires_medical_cert: lt.requires_medical_cert || false,
      applicable_gender: lt.applicable_gender || '',
      min_service_months: lt.min_service_months || 0,
      applicable_departments: lt.applicable_departments || [],
      applicable_positions: lt.applicable_positions || [],
      color: lt.color || '#3B82F6', icon: lt.icon || 'calendar',
      is_active: true, sort_order: leaveTypes.length + 1,
    });
    setShowTypeModal(true);
  };

  const handleInitBalances = async () => {
    try {
      const res = await fetch('/api/hq/hris/leave-management?action=balance-init', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: new Date().getFullYear() })
      });
      const json = await res.json();
      if (json.success) { showToast('success', json.message || 'Saldo cuti diinisialisasi'); fetchData(); }
      else showToast('error', json.error || 'Gagal');
    } catch { showToast('error', 'Gagal inisialisasi saldo'); }
  };

  if (!mounted) return null;

  const getLeaveField = (r: LeaveRequest, field: string) => {
    const map: Record<string, any> = {
      name: r.employee_name || r.employeeName || '-',
      type: r.leave_type || r.leaveType || '-',
      start: r.start_date || r.startDate || '-',
      end: r.end_date || r.endDate || '-',
      days: r.total_days || r.totalDays || 0,
    };
    return map[field];
  };

  return (
    <HQLayout title={t('hris.leaveTitle')} subtitle={t('hris.leaveSubtitle')}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total', value: summary.total || 0, icon: CalendarDays, bg: 'bg-blue-100', color: 'text-blue-600' },
            { label: 'Menunggu Persetujuan', value: summary.pending || 0, icon: Clock, bg: 'bg-yellow-100', color: 'text-yellow-600' },
            { label: 'Disetujui', value: summary.approved || 0, icon: CheckCircle, bg: 'bg-green-100', color: 'text-green-600' },
            { label: 'Ditolak', value: summary.rejected || 0, icon: XCircle, bg: 'bg-red-100', color: 'text-red-600' },
            { label: 'Hari Terpakai', value: summary.totalDaysUsed || 0, icon: Calendar, bg: 'bg-purple-100', color: 'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center gap-3">
                <div className={`p-2 ${s.bg} rounded-lg`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                <div>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="flex border-b overflow-x-auto">
            {[
              { key: 'requests', label: 'Pengajuan Cuti', icon: CalendarDays },
              { key: 'leave-types', label: 'Tipe Cuti', icon: Layers },
              { key: 'approval-config', label: 'Konfigurasi Persetujuan', icon: Shield },
              { key: 'balances', label: 'Saldo Cuti', icon: Database },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>

          {/* ==================== TAB: Requests ==================== */}
          {activeTab === 'requests' && (
            <div>
              <div className="p-4 flex flex-wrap gap-3 justify-between items-center border-b">
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Cari karyawan..." value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 border rounded-lg text-sm w-52" />
                  </div>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                    <option value="all">Semua Status</option>
                    <option value="pending">Menunggu</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                  </select>
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                    <option value="all">Semua Tipe</option>
                    {leaveTypes.map(lt => <option key={lt.code} value={lt.code}>{lt.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
                    <RefreshCw className="w-4 h-4" /> Segarkan
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipe Cuti</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Durasi</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Approval</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Memuat...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Tidak ada data cuti</td></tr>
                    ) : (
                      filtered.map((leave) => {
                        const lt = getLeaveField(leave, 'type');
                        const typeConf = leaveTypeConfig[lt] || leaveTypeConfig.personal;
                        const TypeIcon = typeConf.icon;
                        const statConf = statusConfig[leave.status] || statusConfig.pending;
                        const StatIcon = statConf.icon;
                        const curStep = leave.current_approval_step || 1;
                        const totalSteps = leave.total_approval_steps || 1;
                        return (
                          <tr key={leave.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">{getLeaveField(leave, 'name')}</p>
                              <p className="text-xs text-gray-500">{leave.position} · {leave.department}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${typeConf.color}`}>
                                <TypeIcon className="w-3 h-3" /> {typeConf.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-sm">
                              <p>{formatDate(getLeaveField(leave, 'start'))}</p>
                              <p className="text-xs text-gray-400">s/d {formatDate(getLeaveField(leave, 'end'))}</p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-semibold">{getLeaveField(leave, 'days')}</span>
                              <span className="text-xs text-gray-500"> hari</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {Array.from({ length: totalSteps }).map((_, i) => (
                                  <div key={i} className={`w-2.5 h-2.5 rounded-full ${
                                    i < curStep - (leave.status === 'pending' ? 1 : 0)
                                      ? 'bg-green-500' : i === curStep - 1 && leave.status === 'pending'
                                      ? 'bg-yellow-500 animate-pulse' : 'bg-gray-200'}`} />
                                ))}
                                <span className="text-xs text-gray-400 ml-1">{curStep}/{totalSteps}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statConf.color}`}>
                                <StatIcon className="w-3 h-3" /> {statConf.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {leave.status === 'pending' ? (
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => handleApproveStep(leave.id)}
                                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">Setujui</button>
                                  <button onClick={() => { setSelectedRequest(leave); setShowDetailModal(true); }}
                                    className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">Tolak</button>
                                </div>
                              ) : (
                                <button onClick={() => { setSelectedRequest(leave); setShowDetailModal(true); }}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== TAB: Approval Configs ==================== */}
          {activeTab === 'approval-config' && (
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">Konfigurasi Persetujuan Berjenjang</h3>
                  <p className="text-sm text-gray-500">Atur alur persetujuan cuti per departemen, divisi, atau tipe cuti</p>
                </div>
                <button onClick={openNewConfig}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Tambah Konfigurasi
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {approvalConfigs.map(cfg => (
                  <div key={cfg.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-600" /> {cfg.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">{cfg.description}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEditConfig(cfg)} className="p-1 text-gray-400 hover:text-blue-600 rounded">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteConfig(cfg.id)} className="p-1 text-gray-400 hover:text-red-600 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {cfg.department && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">Dept: {cfg.department}</span>
                      )}
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">Min {cfg.min_days_trigger} hari</span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">Eskalasi: {cfg.escalation_hours}jam</span>
                      {cfg.max_auto_approve_days && cfg.max_auto_approve_days > 0 && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Otomatis &le; {cfg.max_auto_approve_days} hari</span>
                      )}
                    </div>

                    {/* Approval Flow */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {(cfg.approval_levels || []).map((lvl, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <div className={`px-2.5 py-1 rounded-lg text-xs font-medium ${lvl.required ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                            <span className="font-bold">L{lvl.level}</span> {lvl.title}
                          </div>
                          {i < (cfg.approval_levels || []).length - 1 && <ArrowRight className="w-3 h-3 text-gray-400" />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {approvalConfigs.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-gray-500">
                    <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Belum ada konfigurasi persetujuan</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB: Leave Types (ENHANCED) ==================== */}
          {activeTab === 'leave-types' && (
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">Tipe Cuti</h3>
                  <p className="text-sm text-gray-500">{leaveTypes.length} tipe cuti terdaftar &mdash; hover kartu untuk aksi</p>
                </div>
                <button onClick={openNewType}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Tambah Tipe Cuti
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {leaveTypes.map(lt => {
                  const conf = leaveTypeConfig[lt.code];
                  const Icon = conf?.icon || Calendar;
                  const active = lt.is_active !== false;
                  return (
                    <div key={lt.id} className={`border rounded-xl p-4 hover:shadow-md transition-shadow group relative ${!active ? 'opacity-60' : ''}`}>
                      {/* Action buttons */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDuplicateType(lt)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Duplikat">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openEditType(lt)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Edit">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteType(lt.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Hapus">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: lt.color + '20' }}>
                          <Icon className="w-5 h-5" style={{ color: lt.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-semibold text-sm truncate">{lt.name}</h4>
                            {!active && <span className="px-1.5 py-0.5 bg-gray-200 text-gray-500 text-[9px] rounded">NONAKTIF</span>}
                          </div>
                          <p className="text-xs text-gray-500">{lt.code} &middot; {lt.category}</p>
                        </div>
                      </div>

                      {lt.description && <p className="text-xs text-gray-400 mt-2 line-clamp-2">{lt.description}</p>}

                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <span className="text-gray-500">Maks/thn</span>
                          <p className="font-bold">{lt.max_days_per_year} hr</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <span className="text-gray-500">Dibayar</span>
                          <p className="font-bold">{lt.is_paid ? 'Ya' : 'Tidak'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <span className="text-gray-500">Akumulasi</span>
                          <p className="font-bold">{lt.carry_forward ? `${lt.max_carry_forward_days || 0} hr` : 'Tidak'}</p>
                        </div>
                      </div>

                      {/* Policy tags */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {lt.requires_medical_cert && (
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[10px] rounded flex items-center gap-0.5">
                            <FileText className="w-2.5 h-2.5" /> Surat Dokter
                          </span>
                        )}
                        {lt.requires_attachment && (
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded flex items-center gap-0.5">
                            <FileText className="w-2.5 h-2.5" /> Lampiran
                          </span>
                        )}
                        {lt.applicable_gender && (
                          <span className="px-1.5 py-0.5 bg-pink-50 text-pink-600 text-[10px] rounded">
                            {lt.applicable_gender === 'female' ? 'Perempuan' : 'Laki-laki'}
                          </span>
                        )}
                        {(lt.min_service_months || 0) > 0 && (
                          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] rounded">
                            Min {lt.min_service_months} bln kerja
                          </span>
                        )}
                        {lt.salary_deduction_percent && lt.salary_deduction_percent > 0 && (
                          <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] rounded">
                            Pot. {lt.salary_deduction_percent}%
                          </span>
                        )}
                        {lt.min_days_per_request && lt.min_days_per_request > 1 && (
                          <span className="px-1.5 py-0.5 bg-gray-50 text-gray-500 text-[10px] rounded">
                            Min {lt.min_days_per_request} hr/pengajuan
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== TAB: Balances ==================== */}
          {activeTab === 'balances' && (
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">Saldo Cuti Karyawan</h3>
                  <p className="text-sm text-gray-500">Tahun {new Date().getFullYear()} &mdash; {balances.length} data</p>
                </div>
                <button onClick={handleInitBalances}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  <RefreshCw className="w-4 h-4" /> Inisialisasi Saldo
                </button>
              </div>

              {balances.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Belum ada data saldo cuti</p>
                  <p className="text-xs text-gray-400 mt-1">Klik &quot;Inisialisasi Saldo&quot; untuk membuat saldo cuti semua karyawan aktif</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase">Karyawan</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase">Tipe Cuti</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-500 text-xs uppercase">Hak</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-500 text-xs uppercase">Terpakai</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-500 text-xs uppercase">Menunggu</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-500 text-xs uppercase">Sisa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {balances.map((b: any, i: number) => {
                        const remaining = (b.entitled_days || 0) - (b.used_days || 0) - (b.pending_days || 0);
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium">{b.employee_name || `Emp #${b.employee_id}`}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color || '#3B82F6' }} />
                                <span>{b.leave_type_name || b.leave_type_code}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-center font-medium">{b.entitled_days || 0}</td>
                            <td className="px-4 py-2 text-center text-green-600 font-medium">{b.used_days || 0}</td>
                            <td className="px-4 py-2 text-center text-yellow-600 font-medium">{b.pending_days || 0}</td>
                            <td className="px-4 py-2 text-center">
                              <span className={`font-bold ${remaining <= 0 ? 'text-red-600' : remaining <= 3 ? 'text-orange-600' : 'text-blue-600'}`}>
                                {remaining}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==================== DETAIL / REJECT MODAL ==================== */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg m-4">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Detail Pengajuan Cuti</h3>
              <button onClick={() => { setShowDetailModal(false); setSelectedRequest(null); setActionReason(''); }}
                className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500 text-xs">Karyawan</span><p className="font-medium">{getLeaveField(selectedRequest, 'name')}</p></div>
                <div><span className="text-gray-500 text-xs">Tipe</span><p className="font-medium">{leaveTypeConfig[getLeaveField(selectedRequest, 'type')]?.label || getLeaveField(selectedRequest, 'type')}</p></div>
                <div><span className="text-gray-500 text-xs">Mulai</span><p className="font-medium">{formatDate(getLeaveField(selectedRequest, 'start'))}</p></div>
                <div><span className="text-gray-500 text-xs">Selesai</span><p className="font-medium">{formatDate(getLeaveField(selectedRequest, 'end'))}</p></div>
                <div><span className="text-gray-500 text-xs">Durasi</span><p className="font-medium">{getLeaveField(selectedRequest, 'days')} hari kerja</p></div>
                <div><span className="text-gray-500 text-xs">Status</span><p className="font-medium">{statusConfig[selectedRequest.status]?.label}</p></div>
              </div>

              {/* Approval Progress */}
              {(selectedRequest.total_approval_steps || 1) > 1 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">Alur Persetujuan ({selectedRequest.current_approval_step}/{selectedRequest.total_approval_steps})</p>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: selectedRequest.total_approval_steps || 1 }).map((_, i) => {
                      const step = selectedRequest.approvalSteps?.[i];
                      const done = i < (selectedRequest.current_approval_step || 1) - (selectedRequest.status === 'pending' ? 1 : 0);
                      const active = i === (selectedRequest.current_approval_step || 1) - 1 && selectedRequest.status === 'pending';
                      return (
                        <div key={i} className="flex items-center gap-1">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            done ? 'bg-green-500 text-white' : active ? 'bg-yellow-500 text-white animate-pulse' : 'bg-gray-200 text-gray-500'}`}>
                            {done ? '✓' : i + 1}
                          </div>
                          {i < (selectedRequest.total_approval_steps || 1) - 1 && (
                            <div className={`w-6 h-0.5 ${done ? 'bg-green-500' : 'bg-gray-200'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedRequest.reason && (
                <div className="text-sm"><span className="text-gray-500 text-xs">Alasan:</span><p className="mt-1 text-gray-700">{selectedRequest.reason}</p></div>
              )}
              {selectedRequest.status === 'pending' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alasan penolakan (wajib jika tolak)</label>
                  <textarea value={actionReason} onChange={(e) => setActionReason(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} placeholder="Tuliskan alasan..." />
                </div>
              )}
            </div>
            {selectedRequest.status === 'pending' && (
              <div className="px-6 py-4 border-t flex justify-end gap-3">
                <button onClick={() => handleReject(selectedRequest.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Tolak</button>
                <button onClick={() => handleApproveStep(selectedRequest.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Setujui Step</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== CONFIG MODAL ==================== */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">{editingConfig ? 'Edit' : 'Tambah'} Konfigurasi Approval</h3>
              <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Konfigurasi *</label>
                  <input type="text" value={configForm.name} onChange={e => setConfigForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Contoh: Default 2-Level Approval" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <input type="text" value={configForm.description} onChange={e => setConfigForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Deskripsi singkat" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departemen (opsional)</label>
                  <select value={configForm.department} onChange={e => setConfigForm(f => ({ ...f, department: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="">Semua Departemen</option>
                    {['MANAGEMENT','OPERATIONS','SALES','FINANCE','ADMINISTRATION','WAREHOUSE','KITCHEN','CUSTOMER_SERVICE','IT','HR'].map(d =>
                      <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Divisi (opsional)</label>
                  <input type="text" value={configForm.division} onChange={e => setConfigForm(f => ({ ...f, division: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Nama divisi" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Hari Trigger</label>
                  <input type="number" value={configForm.minDaysTrigger} onChange={e => setConfigForm(f => ({ ...f, minDaysTrigger: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" min={1} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Auto-Approve (maks hari)</label>
                  <input type="number" value={configForm.maxAutoApproveDays} onChange={e => setConfigForm(f => ({ ...f, maxAutoApproveDays: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" min={0} />
                  <p className="text-xs text-gray-400 mt-0.5">0 = tidak ada auto-approve</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Eskalasi (jam)</label>
                  <input type="number" value={configForm.escalationHours} onChange={e => setConfigForm(f => ({ ...f, escalationHours: parseInt(e.target.value) || 48 }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" min={1} />
                </div>
              </div>

              {/* Approval Levels */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Level Approval *</label>
                  <button onClick={() => setConfigForm(f => ({
                    ...f, levels: [...f.levels, { level: f.levels.length + 1, role: 'MANAGER', title: 'Manager', required: true, can_delegate: true }]
                  }))} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"><Plus className="w-3 h-3" /> Tambah Level</button>
                </div>
                <div className="space-y-2">
                  {configForm.levels.map((lvl, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{lvl.level}</span>
                      <select value={lvl.role} onChange={e => {
                        const levels = [...configForm.levels];
                        levels[i] = { ...levels[i], role: e.target.value };
                        setConfigForm(f => ({ ...f, levels }));
                      }} className="px-2 py-1.5 border rounded text-sm flex-1">
                        {['SUPERVISOR','MANAGER','HR_MANAGER','HR_DIRECTOR','AREA_MANAGER','DIRECTOR','OWNER'].map(r =>
                          <option key={r} value={r}>{r}</option>)}
                      </select>
                      <input type="text" value={lvl.title} onChange={e => {
                        const levels = [...configForm.levels];
                        levels[i] = { ...levels[i], title: e.target.value };
                        setConfigForm(f => ({ ...f, levels }));
                      }} className="px-2 py-1.5 border rounded text-sm flex-1" placeholder="Judul" />
                      <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                        <input type="checkbox" checked={lvl.required} onChange={e => {
                          const levels = [...configForm.levels];
                          levels[i] = { ...levels[i], required: e.target.checked };
                          setConfigForm(f => ({ ...f, levels }));
                        }} className="rounded" /> Wajib
                      </label>
                      {configForm.levels.length > 1 && (
                        <button onClick={() => {
                          const levels = configForm.levels.filter((_, j) => j !== i).map((l, j) => ({ ...l, level: j + 1 }));
                          setConfigForm(f => ({ ...f, levels }));
                        }} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700 mb-1">Preview Alur:</p>
                <div className="flex items-center gap-1 flex-wrap">
                  {configForm.levels.map((lvl, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="px-2 py-0.5 bg-white rounded text-xs font-medium text-blue-700">L{lvl.level}: {lvl.title}</span>
                      {i < configForm.levels.length - 1 && <ArrowRight className="w-3 h-3 text-blue-400" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowConfigModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Batal</button>
              <button onClick={handleSaveConfig} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
                <Save className="w-4 h-4" /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== LEAVE TYPE MODAL (COMPREHENSIVE) ==================== */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowTypeModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl m-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">{editingType ? 'Edit' : 'Tambah'} Tipe Cuti</h3>
              <button onClick={() => setShowTypeModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">

              {/* Section: Basic Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5"><Info className="w-4 h-4 text-blue-500" /> Informasi Dasar</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Kode *</label>
                    <input type="text" value={typeForm.code} onChange={e => setTypeForm(f => ({ ...f, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="annual" disabled={!!editingType} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nama *</label>
                    <input type="text" value={typeForm.name} onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Cuti Tahunan" />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Deskripsi</label>
                    <textarea value={typeForm.description} onChange={e => setTypeForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} placeholder="Penjelasan singkat tentang tipe cuti ini..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Kategori</label>
                    <select value={typeForm.category} onChange={e => setTypeForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Urutan</label>
                    <input type="number" value={typeForm.sort_order} onChange={e => setTypeForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm" min={0} />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50 w-full">
                      <input type="checkbox" checked={typeForm.is_active} onChange={e => setTypeForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                      {typeForm.is_active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                      <span className={typeForm.is_active ? 'text-green-700 font-medium' : 'text-gray-500'}>Aktif</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Section: Appearance */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5"><Palette className="w-4 h-4 text-purple-500" /> Tampilan</h4>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Warna</label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map(c => (
                      <button key={c} onClick={() => setTypeForm(f => ({ ...f, color: c }))}
                        className={`w-8 h-8 rounded-lg border-2 transition-transform ${typeForm.color === c ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                    <input type="color" value={typeForm.color} onChange={e => setTypeForm(f => ({ ...f, color: e.target.value }))}
                      className="w-8 h-8 rounded-lg cursor-pointer border" />
                  </div>
                </div>
              </div>

              {/* Section: Quota & Duration */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-blue-500" /> Kuota &amp; Durasi</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Maks Hari / Tahun *</label>
                    <input type="number" value={typeForm.max_days_per_year} onChange={e => setTypeForm(f => ({ ...f, max_days_per_year: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm" min={0} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Min Hari / Request</label>
                    <input type="number" value={typeForm.min_days_per_request} onChange={e => setTypeForm(f => ({ ...f, min_days_per_request: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm" min={1} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Maks Hari / Request</label>
                    <input type="number" value={typeForm.max_days_per_request} onChange={e => setTypeForm(f => ({ ...f, max_days_per_request: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm" min={1} />
                  </div>
                </div>
              </div>

              {/* Section: Carry Forward */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5"><ArrowRight className="w-4 h-4 text-green-500" /> Carry Forward</h4>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={typeForm.carry_forward} onChange={e => setTypeForm(f => ({ ...f, carry_forward: e.target.checked }))} className="rounded" />
                    <span>Sisa cuti bisa dibawa ke tahun berikutnya</span>
                  </label>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Maks Carry Forward (hari)</label>
                    <input type="number" value={typeForm.max_carry_forward_days} disabled={!typeForm.carry_forward}
                      onChange={e => setTypeForm(f => ({ ...f, max_carry_forward_days: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm disabled:opacity-50" min={0} />
                  </div>
                </div>
              </div>

              {/* Section: Salary & Payment */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-emerald-500" /> Gaji &amp; Pembayaran</h4>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={typeForm.is_paid} onChange={e => setTypeForm(f => ({ ...f, is_paid: e.target.checked, salary_deduction_percent: e.target.checked ? 0 : f.salary_deduction_percent }))} className="rounded" />
                    <span>Cuti Berbayar (Paid Leave)</span>
                  </label>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Potongan Gaji (%)</label>
                    <input type="number" value={typeForm.salary_deduction_percent} disabled={typeForm.is_paid}
                      onChange={e => setTypeForm(f => ({ ...f, salary_deduction_percent: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm disabled:opacity-50" min={0} max={100} step={0.5} />
                  </div>
                </div>
              </div>

              {/* Section: Requirements */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5"><FileText className="w-4 h-4 text-amber-500" /> Persyaratan</h4>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={typeForm.requires_medical_cert} onChange={e => setTypeForm(f => ({ ...f, requires_medical_cert: e.target.checked }))} className="rounded" />
                    <span>Wajib Surat Keterangan Dokter</span>
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={typeForm.requires_attachment} onChange={e => setTypeForm(f => ({ ...f, requires_attachment: e.target.checked }))} className="rounded" />
                    <span>Wajib Lampiran / Bukti</span>
                  </label>
                </div>
              </div>

              {/* Section: Eligibility */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5"><Users className="w-4 h-4 text-indigo-500" /> Kelayakan</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Gender</label>
                    <select value={typeForm.applicable_gender} onChange={e => setTypeForm(f => ({ ...f, applicable_gender: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm">
                      <option value="">Semua</option>
                      <option value="male">Laki-laki</option>
                      <option value="female">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Min Masa Kerja (bulan)</label>
                    <input type="number" value={typeForm.min_service_months} onChange={e => setTypeForm(f => ({ ...f, min_service_months: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm" min={0} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Departemen</label>
                    <select multiple value={typeForm.applicable_departments}
                      onChange={e => setTypeForm(f => ({ ...f, applicable_departments: Array.from(e.target.selectedOptions, o => o.value) }))}
                      className="w-full px-3 py-1.5 border rounded-lg text-xs h-20">
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <p className="text-[10px] text-gray-400 mt-0.5">Kosong = semua dept. Ctrl+klik multi.</p>
                  </div>
                </div>
              </div>

              {/* Preview Card */}
              <div className="border-2 border-dashed rounded-xl p-4">
                <p className="text-xs font-medium text-gray-400 mb-2">PREVIEW</p>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: typeForm.color + '20' }}>
                    <CalendarDays className="w-5 h-5" style={{ color: typeForm.color }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{typeForm.name || 'Nama Tipe Cuti'}</h4>
                    <p className="text-xs text-gray-500">{typeForm.code || 'kode'} &middot; {typeForm.category}</p>
                    <div className="flex gap-2 mt-1.5 text-[10px]">
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded">{typeForm.max_days_per_year} hr/thn</span>
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded">{typeForm.is_paid ? 'Berbayar' : 'Tidak Berbayar'}</span>
                      {typeForm.carry_forward && <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded">Carry {typeForm.max_carry_forward_days}hr</span>}
                      {typeForm.requires_medical_cert && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">Surat Dokter</span>}
                      {!typeForm.is_active && <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded">NONAKTIF</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-between sticky bottom-0 bg-white">
              <div>
                {editingType && (
                  <button onClick={() => { handleDeleteType(editingType.id); setShowTypeModal(false); }}
                    className="px-4 py-2 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-50 flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4" /> Hapus
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowTypeModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Batal</button>
                <button onClick={handleSaveType} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
                  <Save className="w-4 h-4" /> Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </HQLayout>
  );
}

function formatDate(d: string) {
  if (!d || d === '-') return '-';
  try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; }
}
