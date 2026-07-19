import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import { USE_MOCK_UI, type HrisDataSource } from '@/lib/hris/data-source';
import { useHrisMasterData } from '@/hooks/useHrisMasterData';
import { useTranslation } from '@/lib/i18n';
import { CanAccess, PageGuard, useFilteredColumns, type PermissionAwareColumn } from '@/components/permissions';
import {
  Users, Search, Plus, Eye, Edit, Trash2, X, Save, ChevronRight,
  Building2, Briefcase, GraduationCap, Award, FileText, Heart,
  Phone, Mail, MapPin, Calendar, User, Shield, AlertCircle,
  Filter, Download, RefreshCw, Clock, CheckCircle, XCircle, ChevronDown,
  UserCheck, UserX, ArrowRightLeft, TrendingUp, Star, Zap, BarChart3,
  Banknote, CalendarDays, Timer, Target, PrinterIcon, Camera,
  ClipboardList, History, ChevronUp, Minus, GitBranch, Network,
} from 'lucide-react';
import EmployeeGenealogyPanel from '@/components/humanify/EmployeeGenealogyPanel';
import EmployeeDocumentsPanel from '@/components/humanify/EmployeeDocumentsPanel';
import {
  HRIS_DEPARTMENTS,
  HRIS_WORK_LOCATIONS,
  getDepartmentLabel,
  getWorkLocationLabel,
} from '@/lib/hris/master-data';
import { EMPLOYMENT_CATEGORIES } from '@/lib/hris/workforce-types';

type TabType = 'list' | 'detail';
type ListView = 'table' | 'genealogy';
type DetailTab =
  | 'personal' | 'family' | 'education' | 'certification'
  | 'experience' | 'documents' | 'contracts' | 'genealogy'
  | 'skills' | 'payroll' | 'leave' | 'attendance' | 'overtime' | 'kpi' | 'mutations';


export default function EmployeeManagementPage() {
  const { t } = useTranslation();
  const { departments: masterDepartments } = useHrisMasterData();
  const deptOptions = masterDepartments.length ? masterDepartments : HRIS_DEPARTMENTS;
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [listView, setListView] = useState<ListView>('table');
  const [detailTab, setDetailTab] = useState<DetailTab>('personal');

  // List state
  const [employees, setEmployees] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>(USE_MOCK_UI ? 'demo' : 'empty');
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  // Detail state
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [personalForm, setPersonalForm] = useState<any>({});

  // Sub-data modals
  const [showSubModal, setShowSubModal] = useState(false);
  const [subModalType, setSubModalType] = useState<string>('');
  const [subForm, setSubForm] = useState<any>({});

  // ── Create Employee ────────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '', email: '', phone_number: '', department: '', position: '',
    branch_name: '', branch_id: '', work_location: 'ADMIN_OFFICE',
    contract_type: 'PKWTT', employment_category: 'permanent', join_date: '', gender: 'male', nik: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [jobGrades, setJobGrades] = useState<{ id: string; code: string; name: string }[]>([]);

  // ── Quick Actions ──────────────────────────────────────────────────────────
  const [showQuickAction, setShowQuickAction] = useState(false);
  const [quickActionType, setQuickActionType] = useState<'terminate' | 'mutasi' | 'promosi' | null>(null);
  const [quickActionForm, setQuickActionForm] = useState<any>({});
  const [quickActionLoading, setQuickActionLoading] = useState(false);

  // ── Extra tab data ─────────────────────────────────────────────────────────
  const [tabExtra, setTabExtra] = useState<any>({});
  const [tabExtraLoading, setTabExtraLoading] = useState(false);

  // ── Delete confirm ─────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  // ── Bulk edit ──────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPatch, setBulkPatch] = useState({ department: '', position: '', status: '' });
  const [bulkLoading, setBulkLoading] = useState(false);
  const [lastBulkBatchId, setLastBulkBatchId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<any>(null);
  const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
  const fmtCur  = (n: any) => `Rp ${(Number(n) || 0).toLocaleString('id-ID')}`;
  const initials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Derived stats from employees list
  const statsData = {
    total:    employees.length,
    active:   employees.filter(e => e.status === 'ACTIVE').length,
    onLeave:  employees.filter(e => e.status === 'ON_LEAVE').length,
    inactive: employees.filter(e => e.status === 'INACTIVE').length,
    pkwtExpiring: employees.filter(e => {
      if (!e.contract_end || e.contract_type !== 'PKWT') return false;
      const days = (new Date(e.contract_end).getTime() - Date.now()) / 86400000;
      return days > 0 && days <= 90;
    }).length,
  };

  // ── fetchTabExtra: load data for new tabs ─────────────────────────────────
  const fetchTabExtra = useCallback(async (tab: DetailTab, empId: any) => {
    const profileTabs: DetailTab[] = ['skills', 'payroll', 'leave', 'attendance', 'overtime', 'kpi'];
    setTabExtraLoading(true);
    try {
      if (tab === 'mutations') {
        const res = await fetch(`/api/humanify/workflow?action=mutations&employee_id=${empId}`);
        const json = await res.json();
        setTabExtra((prev: any) => ({ ...prev, mutations: json.data || [] }));
      } else if (profileTabs.includes(tab)) {
        const res = await fetch(`/api/humanify/employee-profile?action=${tab}&employeeId=${empId}`);
        const json = await res.json();
        setTabExtra((prev: any) => ({ ...prev, [tab]: json.data }));
      }
    } catch { setTabExtra((prev: any) => ({ ...prev, [tab]: null })); }
    finally { setTabExtraLoading(false); }
  }, []);

  // ── Create employee handler ───────────────────────────────────────────────
  const handleCreateEmployee = async () => {
    if (!createForm.name || !createForm.email || !createForm.department || !createForm.position) {
      showToast('error', 'Nama, email, departemen, dan jabatan wajib diisi'); return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch('/api/humanify/employee-profile?action=create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createForm)
      });
      const json = await res.json();
      if (json.success) { showToast('success', json.message || 'Karyawan berhasil ditambahkan'); setShowCreateModal(false); fetchEmployees(); setCreateForm({ name: '', email: '', phone_number: '', department: '', position: '', branch_name: '', branch_id: '', work_location: 'ADMIN_OFFICE', contract_type: 'PKWTT', join_date: '', gender: 'male', nik: '' }); }
      else showToast('error', json.error || 'Gagal menambahkan karyawan');
    } catch { showToast('error', 'Gagal menambahkan karyawan'); }
    setCreateLoading(false);
  };

  // ── Quick action handler ──────────────────────────────────────────────────
  const handleQuickAction = async () => {
    if (!selectedEmployee || !quickActionType) return;
    setQuickActionLoading(true);
    try {
      const res = await fetch(`/api/humanify/employee-profile?action=${quickActionType}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedEmployee.id, ...quickActionForm })
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', json.message || 'Berhasil');
        setShowQuickAction(false); setQuickActionType(null); setQuickActionForm({});
        const res2 = await fetch(`/api/humanify/employee-profile?action=detail&employeeId=${selectedEmployee.id}`);
        const json2 = await res2.json();
        if (json2.data) { setSelectedEmployee(json2.data); setPersonalForm(json2.data); }
        fetchEmployees();
      } else showToast('error', json.error || 'Gagal');
    } catch { showToast('error', 'Gagal melakukan aksi'); }
    setQuickActionLoading(false);
  };

  // ── Delete employee handler ───────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/humanify/employee-profile?action=delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: deleteTarget.id })
      });
      const json = await res.json();
      if (json.success) { showToast('success', 'Karyawan berhasil dihapus'); setShowDeleteConfirm(false); setDeleteTarget(null); fetchEmployees(); }
      else showToast('error', json.error || 'Gagal menghapus');
    } catch { showToast('error', 'Gagal menghapus'); }
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    fetch('/api/humanify/master-data')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setBranches(json.data?.branches || []);
          setJobGrades(json.data?.jobGrades || []);
        }
      })
      .catch(() => {});
  }, [mounted]);
  useEffect(() => {
    if (mounted && router.query.add === '1') setShowCreateModal(true);
  }, [mounted, router.query.add]);
  useEffect(() => {
    const q = router.query.search;
    if (mounted && typeof q === 'string' && q) { setSearch(q); setPage(1); }
  }, [mounted, router.query.search]);
  useEffect(() => { if (mounted) fetchEmployees(); }, [mounted, search, filterDept, filterStatus, page]);
  useEffect(() => { setSelectedIds(new Set()); }, [page, search, filterDept, filterStatus]);

  useEffect(() => {
    if (!selectedEmployee?.id) return;
    if (['mutations', 'skills', 'payroll', 'leave', 'attendance', 'overtime', 'kpi'].includes(detailTab)) {
      fetchTabExtra(detailTab, selectedEmployee.id);
    }
  }, [detailTab, selectedEmployee?.id, fetchTabExtra]);

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === employees.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(employees.map((e: any) => String(e.id))));
  };

  const applyBulkEdit = async () => {
    const patch: Record<string, string> = {};
    if (bulkPatch.department.trim()) patch.department = bulkPatch.department.trim();
    if (bulkPatch.position.trim()) patch.position = bulkPatch.position.trim();
    if (bulkPatch.status.trim()) patch.status = bulkPatch.status.trim();
    if (!Object.keys(patch).length) {
      showToast('error', 'Isi minimal satu field (departemen / jabatan / status)');
      return;
    }
    if (!selectedIds.size) {
      showToast('error', 'Pilih minimal satu karyawan');
      return;
    }
    setBulkLoading(true);
    try {
      const res = await fetch('/api/humanify/employees-bulk?action=update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selectedIds], patch }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', json.message || 'Bulk update berhasil');
        setLastBulkBatchId(json.data?.batchId || null);
        setSelectedIds(new Set());
        setBulkPatch({ department: '', position: '', status: '' });
        fetchEmployees();
      } else {
        showToast('error', json.error || 'Bulk update gagal');
      }
    } catch {
      showToast('error', 'Bulk update gagal');
    } finally {
      setBulkLoading(false);
    }
  };

  const undoBulkEdit = async () => {
    if (!lastBulkBatchId) return;
    setBulkLoading(true);
    try {
      const res = await fetch('/api/humanify/employees-bulk?action=undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: lastBulkBatchId }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', json.message || 'Undo berhasil');
        setLastBulkBatchId(null);
        fetchEmployees();
      } else {
        showToast('error', json.error || 'Undo gagal');
      }
    } catch {
      showToast('error', 'Undo gagal');
    } finally {
      setBulkLoading(false);
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: 'list', page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (filterDept) params.set('department', filterDept);
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/humanify/employee-profile?${params}`);
      const json = await res.json();
      const data = json.data || [];
      setEmployees(data);
      setTotal(json.total ?? data.length);
      setDataSource(data.length ? 'live' : 'empty');
    } catch (e) {
      console.error(e);
      setEmployees([]);
      setTotal(0);
      setDataSource('empty');
    }
    setLoading(false);
  };

  const fetchDetail = async (empId: string | number, tab: DetailTab = 'personal') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/humanify/employee-profile?action=detail&employeeId=${empId}`);
      const json = await res.json();
      setSelectedEmployee(json.data);
      setPersonalForm(json.data || {});
      setActiveTab('detail');
      setDetailTab(tab);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const savePersonal = async () => {
    try {
      const res = await fetch('/api/humanify/employee-profile?action=update-personal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personalForm)
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', t('hris.personalSaved'));
        setEditMode(false);
        fetchDetail(personalForm.id);
      } else showToast('error', json.error || t('hris.saveFailed'));
    } catch (e) { showToast('error', t('hris.saveFailed')); }
  };

  const saveSubData = async () => {
    try {
      const res = await fetch(`/api/humanify/employee-profile?action=${subModalType}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...subForm, employee_id: selectedEmployee.id })
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', t('hris.dataSaved'));
        setShowSubModal(false);
        setSubForm({});
        fetchDetail(selectedEmployee.id);
      } else showToast('error', json.error || t('hris.saveFailed'));
    } catch (e) { showToast('error', t('hris.saveFailed')); }
  };

  const deleteSubData = async (type: string, id: string) => {
    if (!confirm(t('hris.deleteConfirm'))) return;
    try {
      const url = type === 'document'
        ? `/api/humanify/employee-documents?id=${encodeURIComponent(id)}`
        : `/api/humanify/employee-profile?action=${type}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: type === 'document' ? undefined : { 'Content-Type': 'application/json' },
        body: type === 'document' ? undefined : JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', t('hris.dataDeleted'));
        fetchDetail(selectedEmployee.id);
      }
    } catch (e) { showToast('error', t('hris.deleteFailed')); }
  };

  const openSubModal = (type: string, data?: any) => {
    setSubModalType(type);
    setSubForm(data ? { ...data } : {});
    setShowSubModal(true);
  };

  const DEPT_LABELS = Object.fromEntries(deptOptions.map((d) => [d.code, d.label]));
  const DEPARTMENTS = deptOptions.map((d) => d.code);

  const fmtCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700', INACTIVE: 'bg-gray-100 text-gray-700',
      ON_LEAVE: 'bg-yellow-100 text-yellow-700', TERMINATED: 'bg-red-100 text-red-700',
      active: 'bg-green-100 text-green-700', expired: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    };
    const labels: Record<string, string> = {
      ACTIVE: 'Aktif', INACTIVE: 'Tidak Aktif', ON_LEAVE: 'Cuti', TERMINATED: 'Diberhentikan',
      active: 'Aktif', expired: 'Kedaluwarsa', pending: 'Menunggu Verifikasi', verified: 'Terverifikasi',
      approved: 'Disetujui', rejected: 'Ditolak'
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{labels[status] || status}</span>;
  };

  // ==============================
  // Kolom tabel dengan guard permission (useFilteredColumns)
  // Kolom "Gaji" & "NIK" hanya tampil jika punya permission yg sesuai.
  // ==============================
  const columnDefs: Array<PermissionAwareColumn & { render: (emp: any) => React.ReactNode; align?: 'left' | 'center' | 'right' }> = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          aria-label="Pilih semua"
          checked={employees.length > 0 && selectedIds.size === employees.length}
          onChange={toggleSelectAll}
          onClick={(e) => e.stopPropagation()}
        />
      ) as any,
      align: 'center',
      render: (emp) => (
        <input
          type="checkbox"
          aria-label={`Pilih ${emp.name || ''}`}
          checked={selectedIds.has(String(emp.id))}
          onChange={() => toggleSelect(String(emp.id))}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: 'employee',
      header: t('hris.employee'),
      render: (emp) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--hf-brand-100)] flex items-center justify-center text-[color:var(--hf-brand-600)] font-bold text-sm">
            {(emp.name || '?')[0]}
          </div>
          <div>
            <p className="font-medium text-gray-800">{emp.name}</p>
            <p className="text-xs text-gray-400">{emp.employee_id} • {emp.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'nik',
      header: 'NIK',
      permission: 'employees.view_salary',
      render: (emp) => (
        <span className="text-xs text-gray-500 font-mono">{emp.nik || '—'}</span>
      )
    },
    {
      key: 'department',
      header: t('hris.department'),
      render: (emp) => <span className="text-gray-600">{DEPT_LABELS[emp.department] || emp.department}</span>
    },
    {
      key: 'position',
      header: t('hris.position'),
      render: (emp) => <span className="text-gray-600">{emp.position}</span>
    },
    {
      key: 'branch',
      header: t('hris.branchLabel'),
      render: (emp) => <span className="text-gray-500 text-xs">{emp.branch_name || getWorkLocationLabel(emp.work_location) || '-'}</span>
    },
    {
      key: 'work_location',
      header: 'Lokasi Kerja',
      render: (emp) => <span className="text-gray-500 text-xs">{getWorkLocationLabel(emp.work_location)}</span>
    },
    {
      key: 'salary',
      header: 'Gaji Pokok',
      permission: 'employees.view_salary',
      render: (emp) => (
        <span className="text-xs text-gray-700 font-semibold">
          {emp.base_salary ? fmtCurrency(emp.base_salary) : '—'}
        </span>
      )
    },
    {
      key: 'contract',
      header: t('hris.contractType'),
      render: (emp) => (
        <>
          <span className="text-xs">{emp.contract_type || '-'}</span>
          {emp.contract_end && <p className="text-[10px] text-gray-400">s/d {fmtDate(emp.contract_end)}</p>}
        </>
      )
    },
    {
      key: 'status',
      header: t('hris.status'),
      render: (emp) => statusBadge(emp.status)
    },
    {
      key: 'actions',
      header: t('hris.actions'),
      align: 'center',
      render: (emp) => (
        <button 
          onClick={(e) => { e.stopPropagation(); fetchDetail(emp.id); }}
          aria-label={`Lihat detail karyawan ${emp.name || ''}`}
          className="p-1.5 text-gray-400 hover:text-[color:var(--hf-brand-600)] hover:bg-[var(--hf-brand-50)] rounded"
          title={`Lihat detail: ${emp.name || ''}`}
        >
          <Eye className="w-4 h-4" aria-hidden="true" />
        </button>
      )
    }
  ];
  const visibleColumns = useFilteredColumns(columnDefs);

  if (!mounted) return null;

  return (
    <PageGuard
      anyPermission={['employees.view', 'employees.*', 'hris.*']}
      title="Database Karyawan"
      description="Data kepegawaian (PII & sensitif)."
    >
    <HQLayout title={t('hris.employeeDbTitle')} currentMenu="hris">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-6 h-6 text-[color:var(--hf-brand-600)]" /> {t('hris.employeeDbTitle')}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('hris.employeeDbSubtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <DataSourceBadge source={dataSource} />
            {activeTab === 'list' && (
              <>
                <CanAccess permission="employees.create">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--hf-brand-600)] text-white rounded-lg hover:bg-[var(--hf-brand)] text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" /> Tambah Karyawan
                  </button>
                </CanAccess>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const params = new URLSearchParams({ format: 'csv' });
                      if (search) params.set('search', search);
                      if (filterDept) params.set('department', filterDept);
                      if (filterStatus) params.set('status', filterStatus);
                      const res = await fetch(`/api/humanify/employees-export?${params}`);
                      if (!res.ok) {
                        const j = await res.json().catch(() => ({}));
                        showToast('error', j.error || 'Export gagal');
                        return;
                      }
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `humanify-employees-${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      showToast('success', 'CSV diekspor');
                    } catch {
                      showToast('error', 'Export gagal');
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm text-gray-700"
                  title="Export CSV"
                >
                  <Download className="w-4 h-4" /> Export
                </button>
              </>
            )}
            {activeTab === 'detail' && (
              <button onClick={() => { setActiveTab('list'); setSelectedEmployee(null); }}
                className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1">
                {t('hris.backToList')}
              </button>
            )}
          </div>
        </div>

        {/* ===== LIST VIEW ===== */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-xl border p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input type="text" placeholder={t('hris.searchPlaceholder')}
                        value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1); }}
                    className="px-3 py-2 border rounded-lg text-sm">
                    <option value="">{t('hris.allDepartments')}</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{DEPT_LABELS[d] || d}</option>)}
                  </select>
                  <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                    className="px-3 py-2 border rounded-lg text-sm">
                    <option value="">{t('hris.allStatuses')}</option>
                    <option value="ACTIVE">Aktif</option>
                    <option value="INACTIVE">Tidak Aktif</option>
                    <option value="ON_LEAVE">Cuti</option>
                    <option value="TERMINATED">Diberhentikan</option>
                  </select>
                  <div className="flex rounded-lg border overflow-hidden text-sm">
                    <button
                      type="button"
                      onClick={() => setListView('table')}
                      className={`flex items-center gap-1.5 px-3 py-2 ${listView === 'table' ? 'bg-[var(--hf-brand-600)] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Users className="w-4 h-4" /> Daftar
                    </button>
                    <button
                      type="button"
                      onClick={() => setListView('genealogy')}
                      className={`flex items-center gap-1.5 px-3 py-2 border-l ${listView === 'genealogy' ? 'bg-[var(--hf-brand-600)] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Network className="w-4 h-4" /> Genealogi
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">{t('hris.employeesFound', { count: total })}</div>
            </div>

            {listView === 'genealogy' ? (
              <div className="bg-white rounded-xl border p-5">
                <EmployeeGenealogyPanel
                  mode="tree"
                  showToast={showToast}
                  onSelectEmployee={(id) => fetchDetail(id, 'genealogy')}
                />
              </div>
            ) : (
            <>
            {(selectedIds.size > 0 || lastBulkBatchId) && (
              <div className="bg-[var(--hf-brand-50)] border border-[var(--hf-brand-100)] rounded-xl p-3 flex flex-wrap items-end gap-3">
                <p className="text-sm text-[color:var(--hf-brand-600)] font-medium w-full md:w-auto">
                  {selectedIds.size > 0 ? `${selectedIds.size} dipilih` : 'Undo tersedia'}
                </p>
                {selectedIds.size > 0 && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Departemen</label>
                      <input
                        className="border rounded-lg px-2 py-1.5 text-sm w-36"
                        value={bulkPatch.department}
                        onChange={(e) => setBulkPatch((p) => ({ ...p, department: e.target.value }))}
                        placeholder="opsional"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Jabatan</label>
                      <input
                        className="border rounded-lg px-2 py-1.5 text-sm w-36"
                        value={bulkPatch.position}
                        onChange={(e) => setBulkPatch((p) => ({ ...p, position: e.target.value }))}
                        placeholder="opsional"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Status</label>
                      <select
                        className="border rounded-lg px-2 py-1.5 text-sm w-36"
                        value={bulkPatch.status}
                        onChange={(e) => setBulkPatch((p) => ({ ...p, status: e.target.value }))}
                      >
                        <option value="">—</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                        <option value="ON_LEAVE">ON_LEAVE</option>
                      </select>
                    </div>
                    <CanAccess anyPermission={['employees.update', 'employees.edit', 'employees.*', 'hris.*']}>
                      <button
                        type="button"
                        disabled={bulkLoading}
                        onClick={applyBulkEdit}
                        className="px-3 py-1.5 bg-[var(--hf-brand-600)] text-white rounded-lg text-sm font-medium hover:bg-[var(--hf-brand)] disabled:opacity-50"
                      >
                        Terapkan
                      </button>
                    </CanAccess>
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      className="px-3 py-1.5 border rounded-lg text-sm text-gray-600 hover:bg-white"
                    >
                      Batal
                    </button>
                  </>
                )}
                {lastBulkBatchId && (
                  <button
                    type="button"
                    disabled={bulkLoading}
                    onClick={undoBulkEdit}
                    className="px-3 py-1.5 border border-amber-300 bg-amber-50 text-amber-900 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    Undo batch (24 jam)
                  </button>
                )}
              </div>
            )}
            {/* Employee Table — kolom Gaji/NIK otomatis disembunyikan via useFilteredColumns */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {visibleColumns.map((col: any) => (
                        <th
                          key={col.key}
                          className={`px-4 py-3 font-medium text-gray-600 ${col.align === 'center' ? 'text-center' : 'text-left'}`}
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr><td colSpan={visibleColumns.length} className="text-center py-8 text-gray-400">{t('hris.loadingData')}</td></tr>
                    ) : employees.length === 0 ? (
                      <tr>
                        <td colSpan={visibleColumns.length} className="p-4">
                          <HrisEmptyState
                            source={dataSource}
                            title={t('hris.noEmployeeData')}
                            description="Tambahkan karyawan manual atau impor massal dari CSV untuk mengisi database."
                            action={
                              <div className="flex flex-wrap items-center justify-center gap-2">
                                <CanAccess permission="employees.create">
                                  <button
                                    type="button"
                                    onClick={() => setShowCreateModal(true)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
                                    style={{ background: 'var(--hf-brand-600)' }}
                                  >
                                    <Plus className="w-4 h-4" /> Tambah Karyawan
                                  </button>
                                </CanAccess>
                                <a
                                  href="/humanify/employees-import"
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:bg-white"
                                >
                                  Impor CSV
                                </a>
                              </div>
                            }
                          />
                        </td>
                      </tr>
                    ) : employees.map((emp: any) => (
                      <tr key={emp.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => fetchDetail(emp.id)}>
                        {visibleColumns.map((col: any) => (
                          <td
                            key={col.key}
                            className={`px-4 py-3 ${col.align === 'center' ? 'text-center' : ''}`}
                          >
                            {col.render(emp)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {total > 20 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                  <p className="text-xs text-gray-500">{t('hris.page', { page, total: Math.ceil(total / 20) })}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="px-3 py-1 border rounded text-xs disabled:opacity-50">{t('hris.prev')}</button>
                    <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}
                      className="px-3 py-1 border rounded text-xs disabled:opacity-50">{t('hris.next')}</button>
                  </div>
                </div>
              )}
            </div>
            </>
            )}
          </div>
        )}

        {/* ===== DETAIL VIEW ===== */}
        {activeTab === 'detail' && selectedEmployee && (
          <div className="space-y-4">
            {/* Employee Header Card */}
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--hf-brand-500)] to-[var(--hf-brand-600)] flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                  {(selectedEmployee.name || '?')[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-gray-800">{selectedEmployee.name}</h2>
                    {statusBadge(selectedEmployee.status)}
                  </div>
                  <p className="text-sm text-gray-500">{selectedEmployee.employee_id} • {selectedEmployee.position}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{DEPT_LABELS[selectedEmployee.department] || selectedEmployee.department}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{selectedEmployee.branch_name || getWorkLocationLabel(selectedEmployee.work_location) || '-'}</span>
                    {selectedEmployee.work_location && (
                      <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{getWorkLocationLabel(selectedEmployee.work_location)}</span>
                    )}
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{selectedEmployee.email}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{selectedEmployee.phone_number || '-'}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{t('hris.joined')}: {fmtDate(selectedEmployee.join_date)}</span>
                    {selectedEmployee.grade_name && (
                      <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" />{t('hris.grade')}: {selectedEmployee.grade_code} - {selectedEmployee.grade_name}</span>
                    )}
                    {selectedEmployee.supervisor_name && (
                      <span className="flex items-center gap-1"><GitBranch className="w-3.5 h-3.5" />Atasan: {selectedEmployee.supervisor_name}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Detail Tabs */}
            <div className="bg-white rounded-xl border">
              <div className="border-b overflow-x-auto">
                <div className="flex min-w-max">
                  {([
                    { key: 'personal', label: t('hris.tabPersonal'), icon: User },
                    { key: 'family', label: t('hris.tabFamily'), icon: Heart },
                    { key: 'education', label: t('hris.tabEducation'), icon: GraduationCap },
                    { key: 'certification', label: t('hris.tabCertification'), icon: Award },
                    { key: 'experience', label: t('hris.tabExperience'), icon: Briefcase },
                    { key: 'documents', label: t('hris.tabDocuments'), icon: FileText },
                    { key: 'contracts', label: t('hris.tabContracts'), icon: Shield },
                    { key: 'genealogy', label: 'Rantai Komando', icon: GitBranch },
                    { key: 'mutations', label: 'Mutasi & Penugasan', icon: ArrowRightLeft },
                  ] as { key: DetailTab; label: string; icon: any }[]).map(tab => (
                    <button key={tab.key} onClick={() => setDetailTab(tab.key)}
                      className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        detailTab === tab.key ? 'border-[var(--hf-brand-600)] text-[color:var(--hf-brand-600)]' : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}>
                      <tab.icon className="w-4 h-4" /> {tab.label}
                      {tab.key === 'family' && selectedEmployee.families?.length > 0 && (
                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">{selectedEmployee.families.length}</span>
                      )}
                      {tab.key === 'education' && selectedEmployee.educations?.length > 0 && (
                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">{selectedEmployee.educations.length}</span>
                      )}
                      {tab.key === 'certification' && selectedEmployee.certifications?.length > 0 && (
                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">{selectedEmployee.certifications.length}</span>
                      )}
                      {tab.key === 'documents' && selectedEmployee.documents?.length > 0 && (
                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">{selectedEmployee.documents.length}</span>
                      )}
                      {tab.key === 'contracts' && selectedEmployee.contracts?.length > 0 && (
                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">{selectedEmployee.contracts.length}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5">
                {/* ===== PERSONAL TAB ===== */}
                {detailTab === 'personal' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800">{t('hris.personalInfo')}</h3>
                      <CanAccess permission="employees.update">
                        {!editMode ? (
                          <button onClick={() => { setEditMode(true); setPersonalForm({ ...selectedEmployee }); }}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">
                            <Edit className="w-3.5 h-3.5" /> {t('hris.edit')}
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => setEditMode(false)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">{t('hris.cancel')}</button>
                            <button onClick={savePersonal} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--hf-brand-600)] text-white rounded-lg hover:bg-[var(--hf-brand)]">
                              <Save className="w-3.5 h-3.5" /> {t('hris.save')}
                            </button>
                          </div>
                        )}
                      </CanAccess>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { label: t('hris.fullName'), key: 'name', type: 'text' },
                        { label: t('hris.email'), key: 'email', type: 'email' },
                        { label: t('hris.phoneNumber'), key: 'phone_number', type: 'text' },
                        { label: t('hris.gender'), key: 'gender', type: 'select', options: [{v:'MALE',l:'Laki-laki'},{v:'FEMALE',l:'Perempuan'}] },
                        { label: t('hris.placeOfBirth'), key: 'place_of_birth', type: 'text' },
                        { label: t('hris.dateOfBirth'), key: 'date_of_birth', type: 'date' },
                        { label: t('hris.nationalId'), key: 'national_id', type: 'text' },
                        { label: t('hris.bloodType'), key: 'blood_type', type: 'select', options: ['A','B','AB','O'] },
                        { label: t('hris.religion'), key: 'religion', type: 'text' },
                        { label: t('hris.maritalStatus'), key: 'marital_status', type: 'select', options: [{v:'SINGLE',l:'Belum Menikah'},{v:'MARRIED',l:'Menikah'},{v:'DIVORCED',l:'Cerai'},{v:'WIDOWED',l:'Janda/Duda'}] },
                        { label: t('hris.nationality'), key: 'nationality', type: 'text' },
                        { label: t('hris.address'), key: 'address', type: 'textarea' },
                        { label: t('hris.taxId'), key: 'tax_id', type: 'text' },
                        { label: t('hris.bpjsHealth'), key: 'bpjs_kesehatan', type: 'text' },
                        { label: t('hris.bpjsEmployment'), key: 'bpjs_ketenagakerjaan', type: 'text' },
                      ].map(field => (
                        <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                          <label className="text-xs font-medium text-gray-500 block mb-1">{field.label}</label>
                          {editMode ? (
                            field.type === 'select' ? (
                              <select value={personalForm[field.key] || ''} onChange={e => setPersonalForm((f: any) => ({ ...f, [field.key]: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg text-sm">
                                <option value="">-</option>
                                {field.options?.map((o: any) => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.v} value={o.v}>{o.l}</option>)}
                              </select>
                            ) : field.type === 'textarea' ? (
                              <textarea value={personalForm[field.key] || ''} onChange={e => setPersonalForm((f: any) => ({ ...f, [field.key]: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
                            ) : (
                              <input type={field.type} value={personalForm[field.key] || ''} onChange={e => setPersonalForm((f: any) => ({ ...f, [field.key]: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg text-sm" />
                            )
                          ) : (
                            <p className="text-sm text-gray-800 py-2">{
                              field.type === 'date' ? fmtDate(selectedEmployee[field.key]) :
                              field.type === 'select' && field.options ? (field.options.find((o: any) => typeof o === 'string' ? o === selectedEmployee[field.key] : o.v === selectedEmployee[field.key]) as any)?.l || selectedEmployee[field.key] || '-' :
                              (selectedEmployee[field.key] || '-')
                            }</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Employment Info */}
                    <h3 className="font-semibold text-gray-800 mt-6 mb-4">{t('hris.employmentInfo')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { label: 'UID Karyawan', key: 'employee_id', readOnly: true },
                        { label: t('hris.department'), key: 'department', type: 'dept' },
                        { label: t('hris.position'), key: 'position', type: 'text' },
                        { label: t('hris.branchLabel'), key: 'branch_name', type: 'branch' },
                        { label: 'Lokasi Kerja', key: 'work_location', type: 'workloc' },
                        { label: t('hris.gradeLevel'), key: 'job_grade_id', type: 'grade' },
                        { label: t('hris.organization'), key: 'org_name', readOnly: true },
                        { label: t('hris.supervisor'), key: 'supervisor_name', readOnly: true },
                        { label: t('hris.contractType'), key: 'contract_type', readOnly: true },
                        { label: t('hris.contractStart'), key: 'contract_start', type: 'date', readOnly: true },
                        { label: t('hris.contractEnd'), key: 'contract_end', type: 'date', readOnly: true },
                        { label: t('hris.joinDate'), key: 'join_date', type: 'date', readOnly: true },
                      ].map(field => (
                        <div key={field.key}>
                          <label className="text-xs font-medium text-gray-500 block mb-1">{field.label}</label>
                          {editMode && !field.readOnly ? (
                            field.type === 'dept' ? (
                              <select value={personalForm.department || ''} onChange={e => setPersonalForm((f: any) => ({ ...f, department: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg text-sm">
                                <option value="">-</option>
                                {deptOptions.map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
                              </select>
                            ) : field.type === 'workloc' ? (
                              <select value={personalForm.work_location || ''} onChange={e => setPersonalForm((f: any) => ({ ...f, work_location: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg text-sm">
                                <option value="">-</option>
                                {HRIS_WORK_LOCATIONS.map(w => <option key={w.code} value={w.code}>{w.label}</option>)}
                              </select>
                            ) : field.type === 'branch' ? (
                              <select value={personalForm.branch_id || ''} onChange={e => {
                                const b = branches.find(br => br.id === e.target.value);
                                setPersonalForm((f: any) => ({ ...f, branch_id: e.target.value, branch_name: b?.name || f.branch_name }));
                              }} className="w-full px-3 py-2 border rounded-lg text-sm">
                                <option value="">{personalForm.branch_name || 'Pilih cabang'}</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                              </select>
                            ) : field.type === 'grade' ? (
                              <select value={personalForm.job_grade_id || ''} onChange={e => setPersonalForm((f: any) => ({ ...f, job_grade_id: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg text-sm">
                                <option value="">-</option>
                                {jobGrades.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
                              </select>
                            ) : (
                              <input type="text" value={personalForm[field.key] || ''} onChange={e => setPersonalForm((f: any) => ({ ...f, [field.key]: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg text-sm" />
                            )
                          ) : (
                            <p className="text-sm text-gray-800 py-2">{
                              field.key === 'department' ? getDepartmentLabel(selectedEmployee.department) :
                              field.key === 'work_location' ? getWorkLocationLabel(selectedEmployee.work_location) :
                              field.key === 'job_grade_id' ? (
                                selectedEmployee.grade_code
                                  ? `${selectedEmployee.grade_code} — ${selectedEmployee.grade_name || ''}`
                                  : '-'
                              ) :
                              field.type === 'date' ? fmtDate(selectedEmployee[field.key]) :
                              (selectedEmployee[field.key] || '-')
                            }</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Emergency Contact */}
                    <h3 className="font-semibold text-gray-800 mt-6 mb-4">{t('hris.emergencyContact')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { label: t('hris.name'), key: 'emergency_contact_name' },
                        { label: t('hris.relationship'), key: 'emergency_contact_relationship' },
                        { label: t('hris.phoneNumber'), key: 'emergency_contact_phone' },
                      ].map(field => (
                        <div key={field.key}>
                          <label className="text-xs font-medium text-gray-500 block mb-1">{field.label}</label>
                          {editMode ? (
                            <input type="text" value={personalForm[field.key] || ''} onChange={e => setPersonalForm((f: any) => ({ ...f, [field.key]: e.target.value }))}
                              className="w-full px-3 py-2 border rounded-lg text-sm" />
                          ) : (
                            <p className="text-sm text-gray-800 py-2">{selectedEmployee[field.key] || '-'}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ===== FAMILY TAB ===== */}
                {detailTab === 'family' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800">{t('hris.familyData')}</h3>
                      <button onClick={() => openSubModal('family')}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--hf-brand-600)] text-white rounded-lg hover:bg-[var(--hf-brand)]">
                        <Plus className="w-3.5 h-3.5" /> {t('hris.add')}
                      </button>
                    </div>
                    {(selectedEmployee.families || []).length === 0 ? (
                      <p className="text-center text-gray-400 py-8">{t('hris.noFamilyData')}</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedEmployee.families.map((f: any) => (
                          <div key={f.id} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-gray-800">{f.name}</p>
                                <p className="text-xs text-gray-500">{f.relationship} • {f.gender || '-'} • {fmtDate(f.date_of_birth)}</p>
                                {f.occupation && <p className="text-xs text-gray-400 mt-1">Pekerjaan: {f.occupation}</p>}
                                {f.phone_number && <p className="text-xs text-gray-400">Telp: {f.phone_number}</p>}
                                <div className="flex gap-2 mt-1">
                                  {f.is_emergency_contact && <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] rounded-full">Kontak Darurat</span>}
                                  {f.is_dependent && <span className="px-2 py-0.5 bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)] text-[10px] rounded-full">Tanggungan</span>}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => openSubModal('family', f)} className="p-1.5 text-gray-400 hover:text-[color:var(--hf-brand-600)] hover:bg-[var(--hf-brand-50)] rounded"><Edit className="w-3.5 h-3.5" /></button>
                                <button onClick={() => deleteSubData('family', f.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ===== EDUCATION TAB ===== */}
                {detailTab === 'education' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800">{t('hris.educationHistory')}</h3>
                      <button onClick={() => openSubModal('education')}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--hf-brand-600)] text-white rounded-lg hover:bg-[var(--hf-brand)]">
                        <Plus className="w-3.5 h-3.5" /> {t('hris.add')}
                      </button>
                    </div>
                    {(selectedEmployee.educations || []).length === 0 ? (
                      <p className="text-center text-gray-400 py-8">{t('hris.noEducationData')}</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedEmployee.educations.map((e: any) => (
                          <div key={e.id} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-[var(--hf-brand-50)] text-[color:var(--hf-brand)] text-xs rounded font-medium">{e.level}</span>
                                  <p className="font-medium text-gray-800">{e.institution}</p>
                                  {e.is_highest && <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 text-[10px] rounded-full">Tertinggi</span>}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{e.major || '-'} {e.degree ? `(${e.degree})` : ''}</p>
                                <p className="text-xs text-gray-400">{e.start_year || '?'} - {e.end_year || 'sekarang'} {e.gpa ? `• IPK: ${e.gpa}` : ''}</p>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => openSubModal('education', e)} className="p-1.5 text-gray-400 hover:text-[color:var(--hf-brand-600)] hover:bg-[var(--hf-brand-50)] rounded"><Edit className="w-3.5 h-3.5" /></button>
                                <button onClick={() => deleteSubData('education', e.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ===== CERTIFICATION TAB ===== */}
                {detailTab === 'certification' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800">{t('hris.certificationLicense')}</h3>
                      <button onClick={() => openSubModal('certification')}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--hf-brand-600)] text-white rounded-lg hover:bg-[var(--hf-brand)]">
                        <Plus className="w-3.5 h-3.5" /> {t('hris.add')}
                      </button>
                    </div>
                    {(selectedEmployee.certifications || []).length === 0 ? (
                      <p className="text-center text-gray-400 py-8">{t('hris.noCertificationData')}</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedEmployee.certifications.map((c: any) => (
                          <div key={c.id} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-gray-800">{c.name}</p>
                                <p className="text-xs text-gray-500">{c.issuing_organization || '-'}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  Terbit: {fmtDate(c.issue_date)} {c.expiry_date ? `• Kadaluarsa: ${fmtDate(c.expiry_date)}` : '• Seumur Hidup'}
                                </p>
                                {c.credential_id && <p className="text-xs text-gray-400">ID: {c.credential_id}</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                {c.expiry_date && new Date(c.expiry_date) < new Date() ? (
                                  <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] rounded-full">Kedaluwarsa</span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] rounded-full">Aktif</span>
                                )}
                                <button onClick={() => openSubModal('certification', c)} className="p-1.5 text-gray-400 hover:text-[color:var(--hf-brand-600)] hover:bg-[var(--hf-brand-50)] rounded"><Edit className="w-3.5 h-3.5" /></button>
                                <button onClick={() => deleteSubData('certification', c.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ===== EXPERIENCE TAB ===== */}
                {detailTab === 'experience' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800">{t('hris.workExperience')}</h3>
                      <button onClick={() => openSubModal('experience')}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--hf-brand-600)] text-white rounded-lg hover:bg-[var(--hf-brand)]">
                        <Plus className="w-3.5 h-3.5" /> {t('hris.add')}
                      </button>
                    </div>
                    {(selectedEmployee.experiences || []).length === 0 ? (
                      <p className="text-center text-gray-400 py-8">{t('hris.noExperienceData')}</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedEmployee.experiences.map((e: any) => (
                          <div key={e.id} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-gray-800">{e.position}</p>
                                <p className="text-sm text-gray-600">{e.company_name} {e.department ? `• ${e.department}` : ''}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {fmtDate(e.start_date)} - {e.is_current ? 'Sekarang' : fmtDate(e.end_date)}
                                </p>
                                {e.description && <p className="text-xs text-gray-500 mt-1">{e.description}</p>}
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => openSubModal('experience', e)} className="p-1.5 text-gray-400 hover:text-[color:var(--hf-brand-600)] hover:bg-[var(--hf-brand-50)] rounded"><Edit className="w-3.5 h-3.5" /></button>
                                <button onClick={() => deleteSubData('experience', e.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ===== DOCUMENTS TAB ===== */}
                {detailTab === 'documents' && selectedEmployee && (
                  <EmployeeDocumentsPanel
                    employeeId={selectedEmployee.id}
                    documents={selectedEmployee.documents || []}
                    showToast={showToast}
                    fmtDate={fmtDate}
                    onRefresh={() => fetchDetail(selectedEmployee.id, 'documents')}
                  />
                )}

                {/* ===== CONTRACTS TAB ===== */}
                {detailTab === 'contracts' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800">{t('hris.contractHistory')}</h3>
                      <CanAccess permission="employees.update">
                        <button onClick={() => openSubModal('contract')}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--hf-brand-600)] text-white rounded-lg hover:bg-[var(--hf-brand)]">
                          <Plus className="w-3.5 h-3.5" /> {t('hris.add')}
                        </button>
                      </CanAccess>
                    </div>
                    {(selectedEmployee.contracts || []).length === 0 ? (
                      <p className="text-center text-gray-400 py-8">{t('hris.noContractData')}</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedEmployee.contracts.map((c: any) => (
                          <div key={c.id} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-[var(--hf-brand-50)] text-[color:var(--hf-brand)] text-xs rounded font-medium">{c.contract_type}</span>
                                  {statusBadge(c.status)}
                                  {c.renewal_count > 0 && <span className="text-[10px] text-gray-400">Perpanjangan ke-{c.renewal_count}</span>}
                                </div>
                                {c.contract_number && <p className="text-xs text-gray-500 mt-1">No: {c.contract_number}</p>}
                                <p className="text-xs text-gray-400 mt-1">
                                  {fmtDate(c.start_date)} - {c.end_date ? fmtDate(c.end_date) : 'Tidak Terbatas'}
                                </p>
                                {c.position && <p className="text-xs text-gray-400">Posisi: {c.position} {c.department ? `• ${c.department}` : ''}</p>}
                                {c.salary && (
                                  <CanAccess
                                    permission="employees.view_salary"
                                    fallback={<p className="text-xs text-gray-300 italic">Gaji: •••••••</p>}
                                  >
                                    <p className="text-xs text-gray-400">Gaji: {fmtCurrency(c.salary)}</p>
                                  </CanAccess>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <CanAccess permission="employees.update">
                                  <button onClick={() => openSubModal('contract', c)} className="p-1.5 text-gray-400 hover:text-[color:var(--hf-brand-600)] hover:bg-[var(--hf-brand-50)] rounded"><Edit className="w-3.5 h-3.5" /></button>
                                </CanAccess>
                                <CanAccess permission="employees.delete">
                                  <button onClick={() => deleteSubData('contract', c.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                                </CanAccess>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ===== GENEALOGY / COMMAND CHAIN TAB ===== */}
                {detailTab === 'genealogy' && (
                  <EmployeeGenealogyPanel
                    mode="chain"
                    employeeId={selectedEmployee.id}
                    showToast={showToast}
                    canEdit
                    onSelectEmployee={(id) => fetchDetail(id, 'genealogy')}
                  />
                )}

                {detailTab === 'mutations' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800">Riwayat Mutasi & Penugasan</h3>
                      <a href={`/humanify/mutations`}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--hf-brand-600)] text-white rounded-lg hover:bg-[var(--hf-brand)]">
                        <Plus className="w-3.5 h-3.5" /> Ajukan Baru
                      </a>
                    </div>
                    {tabExtraLoading ? (
                      <p className="text-center text-gray-400 py-8">Memuat riwayat...</p>
                    ) : (tabExtra.mutations || []).length === 0 ? (
                      <HrisEmptyState
                        source={dataSource}
                        title="Belum ada riwayat mutasi / penugasan"
                        description="Riwayat mutasi dan penugasan karyawan akan muncul setelah pengajuan disetujui."
                      />
                    ) : (
                      <div className="space-y-3">
                        {(tabExtra.mutations || []).map((m: any) => (
                          <a key={m.id} href={`/humanify/mutations`}
                            className="block border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-mono text-xs text-[color:var(--hf-brand-600)]">{m.mutation_number}</span>
                                <p className="text-sm font-medium text-gray-800 mt-0.5">
                                  {m.mutation_type} — {m.from_department || m.from_branch_name} → {m.to_department || m.to_branch_name || m.to_position}
                                </p>
                                <p className="text-xs text-gray-400">Efektif: {fmtDate(m.effective_date)}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                m.status === 'pending' ? 'bg-amber-100 text-amber-700'
                                : m.status === 'rejected' ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                              }`}>{m.status}</span>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== CREATE EMPLOYEE MODAL ===== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">Tambah Karyawan Baru</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500 bg-[var(--hf-brand-50)] border border-[var(--hf-brand-50)] rounded-lg px-3 py-2">
                UID karyawan (contoh EMP-001) akan digenerate otomatis setelah data disimpan.
              </p>
              <div>
                <label className="text-xs font-medium text-gray-500">Nama Lengkap *</label>
                <input type="text" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="Nama karyawan" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Email *</label>
                <input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="email@perusahaan.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">No. Telepon</label>
                  <input type="text" value={createForm.phone_number} onChange={e => setCreateForm(f => ({ ...f, phone_number: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="08123456789" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">NIK</label>
                  <input type="text" value={createForm.nik} onChange={e => setCreateForm(f => ({ ...f, nik: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="Nomor Induk Kependudukan" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Departemen *</label>
                  <select value={createForm.department} onChange={e => setCreateForm(f => ({ ...f, department: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                    <option value="">Pilih Departemen</option>
                    {deptOptions.map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Jabatan *</label>
                  <input type="text" value={createForm.position} onChange={e => setCreateForm(f => ({ ...f, position: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="Posisi / jabatan" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Lokasi Kerja</label>
                  <select value={createForm.work_location} onChange={e => setCreateForm(f => ({ ...f, work_location: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                    {HRIS_WORK_LOCATIONS.map(w => <option key={w.code} value={w.code}>{w.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Cabang</label>
                  <select value={createForm.branch_id} onChange={e => {
                    const b = branches.find(br => br.id === e.target.value);
                    setCreateForm(f => ({ ...f, branch_id: e.target.value, branch_name: b?.name || '' }));
                  }} className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                    <option value="">Pilih cabang</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Kategori Hubungan Kerja</label>
                  <select value={createForm.employment_category} onChange={e => setCreateForm(f => ({ ...f, employment_category: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                    {EMPLOYMENT_CATEGORIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Tipe Kontrak</label>
                  <select value={createForm.contract_type} onChange={e => setCreateForm(f => ({ ...f, contract_type: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                    <option value="PKWTT">PKWTT</option>
                    <option value="PKWT">PKWT</option>
                    <option value="MAGANG">Magang</option>
                    <option value="FREELANCE">Freelance / Harian</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Tanggal Masuk</label>
                  <input type="date" value={createForm.join_date} onChange={e => setCreateForm(f => ({ ...f, join_date: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Jenis Kelamin</label>
                <select value={createForm.gender} onChange={e => setCreateForm(f => ({ ...f, gender: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Batal</button>
              <button onClick={handleCreateEmployee} disabled={createLoading}
                className="px-4 py-2 bg-[var(--hf-brand-600)] text-white rounded-lg text-sm hover:bg-[var(--hf-brand)] flex items-center gap-2">
                {createLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Karyawan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== SUB-DATA MODAL ===== */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowSubModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-800">
                {subForm.id ? 'Edit' : 'Tambah'} {
                  subModalType === 'family' ? 'Data Keluarga' :
                  subModalType === 'education' ? 'Pendidikan' :
                  subModalType === 'certification' ? 'Sertifikasi' :
                  subModalType === 'experience' ? 'Pengalaman Kerja' :
                  subModalType === 'contract' ? 'Kontrak' : ''
                }
              </h3>
              <button onClick={() => setShowSubModal(false)} className="p-1.5 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {/* Dynamic form fields based on type */}
              {subModalType === 'family' && <>
                <div><label className="text-xs font-medium text-gray-500">Nama *</label>
                  <input type="text" value={subForm.name || ''} onChange={e => setSubForm((f: any) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-gray-500">Hubungan *</label>
                    <select value={subForm.relationship || ''} onChange={e => setSubForm((f: any) => ({ ...f, relationship: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                      <option value="">Pilih</option>
                      {[{v:'spouse',l:'Pasangan'},{v:'child',l:'Anak'},{v:'parent',l:'Orang Tua'},{v:'sibling',l:'Saudara'},{v:'other',l:'Lainnya'}].map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                    </select></div>
                  <div><label className="text-xs font-medium text-gray-500">Jenis Kelamin</label>
                    <select value={subForm.gender || ''} onChange={e => setSubForm((f: any) => ({ ...f, gender: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                      <option value="">-</option><option value="MALE">Laki-laki</option><option value="FEMALE">Perempuan</option>
                    </select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-gray-500">Tanggal Lahir</label>
                    <input type="date" value={subForm.date_of_birth || ''} onChange={e => setSubForm((f: any) => ({ ...f, date_of_birth: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                  <div><label className="text-xs font-medium text-gray-500">No. Telepon</label>
                    <input type="text" value={subForm.phone_number || ''} onChange={e => setSubForm((f: any) => ({ ...f, phone_number: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                </div>
                <div><label className="text-xs font-medium text-gray-500">Pekerjaan</label>
                  <input type="text" value={subForm.occupation || ''} onChange={e => setSubForm((f: any) => ({ ...f, occupation: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={subForm.is_emergency_contact || false} onChange={e => setSubForm((f: any) => ({ ...f, is_emergency_contact: e.target.checked }))} /> Kontak Darurat</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={subForm.is_dependent || false} onChange={e => setSubForm((f: any) => ({ ...f, is_dependent: e.target.checked }))} /> Tanggungan</label>
                </div>
              </>}

              {subModalType === 'education' && <>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-gray-500">Jenjang *</label>
                    <select value={subForm.level || ''} onChange={e => setSubForm((f: any) => ({ ...f, level: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                      <option value="">Pilih</option>
                      {['SD','SMP','SMA/SMK','D1','D2','D3','D4','S1','S2','S3'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select></div>
                  <div><label className="text-xs font-medium text-gray-500">Gelar</label>
                    <input type="text" value={subForm.degree || ''} onChange={e => setSubForm((f: any) => ({ ...f, degree: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="S.Kom, S.E, dll" /></div>
                </div>
                <div><label className="text-xs font-medium text-gray-500">Institusi *</label>
                  <input type="text" value={subForm.institution || ''} onChange={e => setSubForm((f: any) => ({ ...f, institution: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                <div><label className="text-xs font-medium text-gray-500">Jurusan</label>
                  <input type="text" value={subForm.major || ''} onChange={e => setSubForm((f: any) => ({ ...f, major: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-xs font-medium text-gray-500">Tahun Masuk</label>
                    <input type="number" value={subForm.start_year || ''} onChange={e => setSubForm((f: any) => ({ ...f, start_year: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                  <div><label className="text-xs font-medium text-gray-500">Tahun Lulus</label>
                    <input type="number" value={subForm.end_year || ''} onChange={e => setSubForm((f: any) => ({ ...f, end_year: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                  <div><label className="text-xs font-medium text-gray-500">IPK</label>
                    <input type="number" step="0.01" value={subForm.gpa || ''} onChange={e => setSubForm((f: any) => ({ ...f, gpa: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={subForm.is_highest || false} onChange={e => setSubForm((f: any) => ({ ...f, is_highest: e.target.checked }))} /> Pendidikan Tertinggi</label>
              </>}

              {subModalType === 'certification' && <>
                <div><label className="text-xs font-medium text-gray-500">Nama Sertifikasi *</label>
                  <input type="text" value={subForm.name || ''} onChange={e => setSubForm((f: any) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                <div><label className="text-xs font-medium text-gray-500">Lembaga Penerbit</label>
                  <input type="text" value={subForm.issuing_organization || ''} onChange={e => setSubForm((f: any) => ({ ...f, issuing_organization: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                <div><label className="text-xs font-medium text-gray-500">ID Kredensial</label>
                  <input type="text" value={subForm.credential_id || ''} onChange={e => setSubForm((f: any) => ({ ...f, credential_id: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-gray-500">Tanggal Terbit</label>
                    <input type="date" value={subForm.issue_date || ''} onChange={e => setSubForm((f: any) => ({ ...f, issue_date: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                  <div><label className="text-xs font-medium text-gray-500">Tanggal Kadaluarsa</label>
                    <input type="date" value={subForm.expiry_date || ''} onChange={e => setSubForm((f: any) => ({ ...f, expiry_date: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                </div>
              </>}

              {subModalType === 'experience' && <>
                <div><label className="text-xs font-medium text-gray-500">Nama Perusahaan *</label>
                  <input type="text" value={subForm.company_name || ''} onChange={e => setSubForm((f: any) => ({ ...f, company_name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-gray-500">Posisi *</label>
                    <input type="text" value={subForm.position || ''} onChange={e => setSubForm((f: any) => ({ ...f, position: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                  <div><label className="text-xs font-medium text-gray-500">Departemen</label>
                    <input type="text" value={subForm.department || ''} onChange={e => setSubForm((f: any) => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-gray-500">Mulai</label>
                    <input type="date" value={subForm.start_date || ''} onChange={e => setSubForm((f: any) => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                  <div><label className="text-xs font-medium text-gray-500">Selesai</label>
                    <input type="date" value={subForm.end_date || ''} onChange={e => setSubForm((f: any) => ({ ...f, end_date: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                </div>
                <div><label className="text-xs font-medium text-gray-500">Deskripsi</label>
                  <textarea value={subForm.description || ''} onChange={e => setSubForm((f: any) => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" rows={2} /></div>
              </>}

              {subModalType === 'contract' && <>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-gray-500">Tipe Kontrak *</label>
                    <select value={subForm.contract_type || 'PKWTT'} onChange={e => setSubForm((f: any) => ({ ...f, contract_type: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                      {['PKWT','PKWTT','MAGANG','FREELANCE'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select></div>
                  <div><label className="text-xs font-medium text-gray-500">No. Kontrak</label>
                    <input type="text" value={subForm.contract_number || ''} onChange={e => setSubForm((f: any) => ({ ...f, contract_number: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-gray-500">Tanggal Mulai *</label>
                    <input type="date" value={subForm.start_date || ''} onChange={e => setSubForm((f: any) => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                  <div><label className="text-xs font-medium text-gray-500">Tanggal Berakhir</label>
                    <input type="date" value={subForm.end_date || ''} onChange={e => setSubForm((f: any) => ({ ...f, end_date: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-gray-500">Posisi</label>
                    <input type="text" value={subForm.position || ''} onChange={e => setSubForm((f: any) => ({ ...f, position: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                  <div><label className="text-xs font-medium text-gray-500">Departemen</label>
                    <select value={subForm.department || ''} onChange={e => setSubForm((f: any) => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                      <option value="">-</option>
                      {deptOptions.map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
                    </select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <CanAccess
                    permission="employees.view_salary"
                    fallback={
                      <div><label className="text-xs font-medium text-gray-500">Gaji</label>
                        <input type="text" value="••••••••" disabled readOnly className="w-full px-3 py-2 border rounded-lg text-sm mt-1 bg-gray-50 text-gray-400" /></div>
                    }
                  >
                    <div><label className="text-xs font-medium text-gray-500">Gaji</label>
                      <input type="number" value={subForm.salary || ''} onChange={e => setSubForm((f: any) => ({ ...f, salary: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" /></div>
                  </CanAccess>
                </div>
                <div><label className="text-xs font-medium text-gray-500">Catatan</label>
                  <textarea value={subForm.notes || ''} onChange={e => setSubForm((f: any) => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" rows={2} /></div>
              </>}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t sticky bottom-0 bg-white">
              <button onClick={() => setShowSubModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">{t('hris.cancel')}</button>
              <button onClick={saveSubData} className="px-4 py-2 bg-[var(--hf-brand-600)] text-white rounded-lg text-sm hover:bg-[var(--hf-brand)]">{t('hris.save')}</button>
            </div>
          </div>
        </div>
      )}

    </HQLayout>
    </PageGuard>
  );
}
