import { useState, useEffect, useCallback, useRef } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { Briefcase, Users, Clock, DollarSign, Plus, Edit, Trash2, X, Check, Eye, Search, BarChart3, Calendar, FileText, FolderOpen, Upload, Download, File, FileSpreadsheet, FileImage, FilePlus, Tag, Filter, Star, Shield, AlertTriangle, ChevronDown, ChevronRight, ExternalLink, Copy, Paperclip } from 'lucide-react';

interface ProjectItem { id: string; project_code: string; name: string; description: string; client_name: string; location: string; start_date: string; end_date: string; status: string; budget_amount: number; actual_cost: number; project_manager_id: number; department: string; industry: string; completion_percent: number; priority: string; milestones: any[]; }
interface Worker { id: string; project_id: string; employee_id: number; role: string; assignment_start: string; assignment_end: string; daily_rate: number; hourly_rate: number; allocation_percent: number; status: string; worker_type: string; contract_number: string; }
interface Timesheet { id: string; project_id: string; employee_id: number; timesheet_date: string; hours_worked: number; overtime_hours: number; activity_description: string; task_category: string; status: string; }
interface PayrollItem { id: string; project_id: string; employee_id: number; period_start: string; period_end: string; regular_hours: number; overtime_hours: number; days_worked: number; gross_amount: number; net_amount: number; status: string; }

interface ProjectDocument { id: string; projectId: string | null; name: string; description: string; category: string; originalFilename: string; filePath: string; fileSize: number; mimeType: string; fileExtension: string; uploadedBy: string; uploadedAt: string; tags: string; version: string; status: string; }
interface DocTemplate { id: string; name: string; description: string; category: string; icon: string; color: string; format: string; version: string; lastUpdated: string; sections: string[]; tags: string[]; downloadCount: number; }

type TabKey = 'projects' | 'workers' | 'timesheets' | 'payroll' | 'documents' | 'templates';

const MOCK_PM_OVERVIEW = { totalProjects: 8, activeProjects: 5, totalWorkers: 45, totalBudget: 2500000000, totalActualCost: 1800000000, avgCompletion: 62 };
const MOCK_PROJECTS: ProjectItem[] = [
  { id: 'p1', project_code: 'PRJ-2026-001', name: 'Ekspansi Cabang Bali', description: 'Pembukaan cabang baru di Bali', client_name: 'Internal', location: 'Bali', start_date: '2026-01-15', end_date: '2026-06-30', status: 'in_progress', budget_amount: 800000000, actual_cost: 520000000, project_manager_id: 1, department: 'Operations', industry: 'F&B', completion_percent: 65, priority: 'high', milestones: [] },
  { id: 'p2', project_code: 'PRJ-2026-002', name: 'Sistem POS v3.0', description: 'Upgrade sistem POS ke versi 3.0', client_name: 'Internal', location: 'Jakarta', start_date: '2026-02-01', end_date: '2026-08-31', status: 'in_progress', budget_amount: 500000000, actual_cost: 180000000, project_manager_id: 3, department: 'IT', industry: 'Technology', completion_percent: 35, priority: 'high', milestones: [] },
  { id: 'p3', project_code: 'PRJ-2026-003', name: 'Renovasi Gudang Surabaya', description: 'Renovasi dan perluasan gudang', client_name: 'Internal', location: 'Surabaya', start_date: '2026-03-01', end_date: '2026-05-31', status: 'planned', budget_amount: 350000000, actual_cost: 0, project_manager_id: 5, department: 'Facilities', industry: 'Construction', completion_percent: 0, priority: 'medium', milestones: [] },
];
const MOCK_PM_WORKERS: Worker[] = [
  { id: 'w1', project_id: 'p1', employee_id: 10, role: 'Site Manager', assignment_start: '2026-01-15', assignment_end: '2026-06-30', daily_rate: 500000, hourly_rate: 62500, allocation_percent: 100, status: 'active', worker_type: 'permanent', contract_number: '' },
  { id: 'w2', project_id: 'p1', employee_id: 15, role: 'Architect', assignment_start: '2026-01-15', assignment_end: '2026-04-30', daily_rate: 750000, hourly_rate: 93750, allocation_percent: 50, status: 'active', worker_type: 'contract', contract_number: 'CTR-2026-005' },
];
const MOCK_PM_TIMESHEETS: Timesheet[] = [
  { id: 'ts1', project_id: 'p1', employee_id: 10, timesheet_date: '2026-03-12', hours_worked: 8, overtime_hours: 2, activity_description: 'Supervisi pekerjaan struktur', task_category: 'supervision', status: 'approved' },
  { id: 'ts2', project_id: 'p2', employee_id: 3, timesheet_date: '2026-03-12', hours_worked: 8, overtime_hours: 0, activity_description: 'Development modul payment', task_category: 'development', status: 'submitted' },
];

export default function ProjectManagementPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('projects');
  const [overview, setOverview] = useState<any>(MOCK_PM_OVERVIEW);
  const [projects, setProjects] = useState<ProjectItem[]>(MOCK_PROJECTS);
  const [workers, setWorkers] = useState<Worker[]>(MOCK_PM_WORKERS);
  const [timesheets, setTimesheets] = useState<Timesheet[]>(MOCK_PM_TIMESHEETS);
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [projectDetail, setProjectDetail] = useState<any>(null);

  // Document & Template states
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [templateCategories, setTemplateCategories] = useState<Record<string, DocTemplate[]>>({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: '', description: '', category: 'Umum', projectId: '', tags: '' });
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [docFilter, setDocFilter] = useState({ category: '', search: '' });
  const [tplFilter, setTplFilter] = useState({ category: '', search: '' });
  const [selectedTemplate, setSelectedTemplate] = useState<DocTemplate | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Bulk import states
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkType, setBulkType] = useState<'workers' | 'timesheets' | 'payroll'>('workers');
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [bulkParsed, setBulkParsed] = useState<any[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProjectId, setBulkProjectId] = useState('');
  const [bulkResult, setBulkResult] = useState<{ success: number; failed: number } | null>(null);

  const [projForm, setProjForm] = useState({ name: '', description: '', clientName: '', location: '', startDate: '', endDate: '', budgetAmount: 0, department: '', industry: '', priority: 'medium', contractNumber: '', contractValue: 0 });
  const [workerForm, setWorkerForm] = useState({ projectId: '', employeeId: '', role: '', assignmentStart: '', assignmentEnd: '', dailyRate: 0, hourlyRate: 0, allocationPercent: 100, workerType: 'permanent' });
  const [tsForm, setTsForm] = useState({ projectId: '', employeeId: '', timesheetDate: '', hoursWorked: 8, overtimeHours: 0, activityDescription: '', taskCategory: '' });
  const [payrollCalcForm, setPayrollCalcForm] = useState({ projectId: '', employeeId: '', periodStart: '', periodEnd: '' });

  const showToast = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const fmtCur = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

  const api = useCallback(async (action: string, method = 'GET', body?: any, extra = '') => {
    const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`/api/hq/hris/project-management?action=${action}${extra}`, opts);
    return r.json();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, pj, wk, ts, pr] = await Promise.all([
        api('overview'), api('projects'), api('workers'), api('timesheets'), api('payroll')
      ]);
      setOverview(ov.data || {});
      setProjects(pj.data || []);
      setWorkers(wk.data || []);
      setTimesheets(ts.data || []);
      setPayrollItems(pr.data || []);
    } catch (e) {
      console.error(e);
      setOverview(MOCK_PM_OVERVIEW);
      setProjects(MOCK_PROJECTS);
      setWorkers(MOCK_PM_WORKERS);
      setTimesheets(MOCK_PM_TIMESHEETS);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  // Document & Template API
  const docApi = useCallback(async (action: string, method = 'GET', body?: any, extra = '') => {
    const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`/api/hq/hris/project-documents?action=${action}${extra}`, opts);
    return r.json();
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      const [docs, tpls] = await Promise.all([
        docApi('documents'),
        docApi('templates')
      ]);
      setDocuments(docs.data || []);
      setTemplates(tpls.data || []);
      setTemplateCategories(tpls.categories || {});
    } catch (e) { console.error(e); }
  }, [docApi]);

  useEffect(() => {
    if (tab === 'documents' || tab === 'templates') loadDocuments();
  }, [tab, loadDocuments]);

  const handleUpload = async () => {
    if (uploadFiles.length === 0) { showToast('Pilih file terlebih dahulu', 'error'); return; }
    setUploading(true);
    try {
      for (const file of uploadFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', uploadForm.name || file.name);
        formData.append('description', uploadForm.description);
        formData.append('category', uploadForm.category);
        formData.append('projectId', uploadForm.projectId);
        formData.append('tags', uploadForm.tags);
        await fetch('/api/hq/hris/project-documents?action=upload', { method: 'POST', body: formData });
      }
      showToast(`${uploadFiles.length} dokumen berhasil diupload`);
      setShowUploadModal(false);
      setUploadFiles([]);
      setUploadForm({ name: '', description: '', category: 'Umum', projectId: '', tags: '' });
      loadDocuments();
    } catch (e) { showToast('Upload gagal', 'error'); }
    setUploading(false);
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Hapus dokumen ini?')) return;
    await docApi('documents', 'DELETE', null, `&id=${id}`);
    showToast('Dokumen dihapus');
    loadDocuments();
  };

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true); else if (e.type === 'dragleave') setDragActive(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.length) setUploadFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.length) setUploadFiles(prev => [...prev, ...Array.from(e.target.files!)]); };
  const removeFile = (idx: number) => setUploadFiles(prev => prev.filter((_, i) => i !== idx));

  const fmtSize = (bytes: number) => { if (bytes < 1024) return bytes + ' B'; if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'; return (bytes / 1048576).toFixed(1) + ' MB'; };
  const getFileIcon = (ext: string) => { const e = ext?.toLowerCase().replace('.', ''); if (['xlsx', 'xls', 'csv'].includes(e)) return <FileSpreadsheet className="w-5 h-5 text-green-600" />; if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(e)) return <FileImage className="w-5 h-5 text-pink-600" />; if (['pdf'].includes(e)) return <File className="w-5 h-5 text-red-600" />; return <FileText className="w-5 h-5 text-blue-600" />; };

  const DOC_CATEGORIES = ['Umum', 'Kontrak', 'Proposal', 'Laporan', 'Invoice', 'SPK', 'K3/Safety', 'Legalitas', 'Foto/Dokumentasi', 'Lainnya'];

  const filteredDocs = documents.filter(d => {
    if (docFilter.category && d.category !== docFilter.category) return false;
    if (docFilter.search && !d.name.toLowerCase().includes(docFilter.search.toLowerCase()) && !d.originalFilename?.toLowerCase().includes(docFilter.search.toLowerCase())) return false;
    return true;
  });

  const filteredTemplates = templates.filter(t => {
    if (tplFilter.category && t.category !== tplFilter.category) return false;
    if (tplFilter.search && !t.name.toLowerCase().includes(tplFilter.search.toLowerCase()) && !t.description.toLowerCase().includes(tplFilter.search.toLowerCase())) return false;
    return true;
  });

  // CSV Parser
  const parseCsv = (csv: string): { headers: string[]; rows: Record<string, string>[] } => {
    const lines = csv.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return obj;
    });
    return { headers, rows };
  };

  const BULK_HEADERS: Record<string, { required: string[]; optional: string[]; example: string }> = {
    workers: {
      required: ['employee_id', 'role', 'daily_rate'],
      optional: ['hourly_rate', 'allocation_percent', 'worker_type', 'assignment_start', 'assignment_end'],
      example: 'employee_id,role,daily_rate,worker_type,allocation_percent\n101,Site Engineer,500000,contract,100\n102,Foreman,350000,contract,100\n103,Helper,200000,freelance,50'
    },
    timesheets: {
      required: ['employee_id', 'timesheet_date', 'hours_worked'],
      optional: ['overtime_hours', 'activity_description', 'task_category'],
      example: 'employee_id,timesheet_date,hours_worked,overtime_hours,activity_description\n101,2026-02-28,8,2,Pengecoran lantai 3\n102,2026-02-28,8,0,Supervisi pekerja\n103,2026-02-28,6,0,Angkut material'
    },
    payroll: {
      required: ['employee_id', 'period_start', 'period_end'],
      optional: [],
      example: 'employee_id,period_start,period_end\n101,2026-02-01,2026-02-28\n102,2026-02-01,2026-02-28\n103,2026-02-01,2026-02-28'
    }
  };

  const parseBulkCsv = (text: string, type: 'workers' | 'timesheets' | 'payroll') => {
    const { headers, rows } = parseCsv(text);
    const errors: string[] = [];
    const spec = BULK_HEADERS[type];

    if (rows.length === 0) { errors.push('Tidak ada data ditemukan. Pastikan CSV memiliki header dan minimal 1 baris data.'); setBulkErrors(errors); setBulkParsed([]); return; }

    spec.required.forEach(h => {
      if (!headers.includes(h)) errors.push(`Kolom wajib "${h}" tidak ditemukan di header CSV.`);
    });

    rows.forEach((row, i) => {
      spec.required.forEach(h => {
        if (!row[h]) errors.push(`Baris ${i + 1}: "${h}" kosong.`);
      });
      if (type === 'workers' && row.daily_rate && isNaN(Number(row.daily_rate))) errors.push(`Baris ${i + 1}: daily_rate bukan angka.`);
      if (type === 'timesheets' && row.hours_worked && isNaN(Number(row.hours_worked))) errors.push(`Baris ${i + 1}: hours_worked bukan angka.`);
    });

    setBulkErrors(errors.slice(0, 10));
    setBulkParsed(errors.filter(e => e.includes('tidak ditemukan')).length === 0 ? rows : []);
  };

  const openBulk = (type: 'workers' | 'timesheets' | 'payroll') => {
    setBulkType(type);
    setBulkCsvText('');
    setBulkParsed([]);
    setBulkErrors([]);
    setBulkResult(null);
    setBulkProjectId(selectedProject || '');
    setShowBulkModal(true);
  };

  const handleBulkImport = async () => {
    if (bulkParsed.length === 0) return;
    if (!bulkProjectId && bulkType !== 'payroll') { showToast('Pilih proyek terlebih dahulu', 'error'); return; }
    setBulkUploading(true);
    setBulkResult(null);
    try {
      if (bulkType === 'workers') {
        const workers = bulkParsed.map(r => ({
          employeeId: r.employee_id, role: r.role, dailyRate: Number(r.daily_rate) || 0,
          hourlyRate: Number(r.hourly_rate) || 0, allocationPercent: Number(r.allocation_percent) || 100,
          workerType: r.worker_type || 'contract', assignmentStart: r.assignment_start || null, assignmentEnd: r.assignment_end || null
        }));
        const res = await api('workers-bulk', 'POST', { projectId: bulkProjectId, workers });
        setBulkResult({ success: res.count || workers.length, failed: workers.length - (res.count || workers.length) });
      } else if (bulkType === 'timesheets') {
        const entries = bulkParsed.map(r => ({
          projectId: bulkProjectId, employeeId: r.employee_id, timesheetDate: r.timesheet_date,
          hoursWorked: Number(r.hours_worked) || 0, overtimeHours: Number(r.overtime_hours) || 0,
          activityDescription: r.activity_description || '', taskCategory: r.task_category || '', status: 'submitted'
        }));
        const res = await api('timesheets-bulk', 'POST', { entries });
        setBulkResult({ success: res.count || entries.length, failed: 0 });
      } else if (bulkType === 'payroll') {
        const projId = bulkProjectId;
        let success = 0, failed = 0;
        for (const r of bulkParsed) {
          try {
            await api('calculate-payroll', 'POST', { projectId: projId, employeeId: r.employee_id, periodStart: r.period_start, periodEnd: r.period_end });
            success++;
          } catch { failed++; }
        }
        setBulkResult({ success, failed });
      }
      showToast(`Impor massal berhasil!`);
      loadData();
    } catch (e) { showToast('Impor massal gagal', 'error'); }
    setBulkUploading(false);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setBulkCsvText(text);
      parseBulkCsv(text, bulkType);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const downloadCsvTemplate = (type: 'workers' | 'timesheets' | 'payroll') => {
    const spec = BULK_HEADERS[type];
    const blob = new Blob([spec.example], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `template-${type}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const BULK_LABELS: Record<string, { title: string; color: string }> = {
    workers: { title: 'Impor Massal Tenaga Kerja', color: 'green' },
    timesheets: { title: 'Impor Massal Timesheet', color: 'blue' },
    payroll: { title: 'Hitung Penggajian Massal', color: 'purple' }
  };

  const openAdd = (type: string) => {
    setEditingItem(null); setModalType(type); setShowModal(true);
    if (type === 'project') setProjForm({ name: '', description: '', clientName: '', location: '', startDate: '', endDate: '', budgetAmount: 0, department: '', industry: '', priority: 'medium', contractNumber: '', contractValue: 0 });
    if (type === 'worker') setWorkerForm({ projectId: selectedProject || '', employeeId: '', role: '', assignmentStart: '', assignmentEnd: '', dailyRate: 0, hourlyRate: 0, allocationPercent: 100, workerType: 'permanent' });
    if (type === 'timesheet') setTsForm({ projectId: selectedProject || '', employeeId: '', timesheetDate: new Date().toISOString().split('T')[0], hoursWorked: 8, overtimeHours: 0, activityDescription: '', taskCategory: '' });
    if (type === 'calc-payroll') { setPayrollCalcForm({ projectId: selectedProject || '', employeeId: '', periodStart: '', periodEnd: '' }); setModalType('calc-payroll'); }
  };

  const handleSave = async () => {
    try {
      if (modalType === 'project') {
        if (editingItem) await api('project', 'PUT', projForm, `&id=${editingItem.id}`);
        else await api('project', 'POST', projForm);
      } else if (modalType === 'worker') {
        await api('worker', 'POST', workerForm);
      } else if (modalType === 'timesheet') {
        await api('timesheet', 'POST', tsForm);
      } else if (modalType === 'calc-payroll') {
        await api('calculate-payroll', 'POST', payrollCalcForm);
      }
      showToast(editingItem ? 'Diperbarui' : 'Dibuat');
      setShowModal(false); loadData();
    } catch (e) { showToast('Gagal menyimpan', 'error'); }
  };

  const handleDelete = async (action: string, id: string) => {
    if (!confirm('Hapus data ini?')) return;
    await api(action, 'DELETE', null, `&id=${id}`);
    showToast('Dihapus'); loadData();
  };

  const statusColor = (s: string) => {
    const m: any = { planning: 'bg-gray-100 text-gray-800', active: 'bg-green-100 text-green-800', on_hold: 'bg-yellow-100 text-yellow-800', completed: 'bg-blue-100 text-blue-800', cancelled: 'bg-red-100 text-red-800', draft: 'bg-gray-100 text-gray-800', submitted: 'bg-blue-100 text-blue-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', calculated: 'bg-purple-100 text-purple-800', paid: 'bg-emerald-100 text-emerald-800' };
    return m[s] || 'bg-gray-100 text-gray-800';
  };

  const priorityColor = (p: string) => {
    const m: any = { low: 'border-gray-300', medium: 'border-blue-300', high: 'border-orange-300', critical: 'border-red-400' };
    return m[p] || 'border-gray-300';
  };

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'projects', label: 'Proyek', icon: Briefcase },
    { key: 'workers', label: 'Tenaga Kerja', icon: Users },
    { key: 'timesheets', label: 'Timesheet', icon: Clock },
    { key: 'payroll', label: 'Penggajian Proyek', icon: DollarSign },
    { key: 'documents', label: 'Dokumen', icon: FolderOpen },
    { key: 'templates', label: 'Template', icon: FileText },
  ];

  return (
    <HQLayout title={t('hris.projectManagementTitle')}>
    <div className="p-6 max-w-7xl mx-auto">
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.msg}</div>}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Proyek & Pekerja Kontrak</h1>
        <p className="text-gray-500 mt-1">Kelola proyek, tenaga kerja kontrak, timesheet, dan payroll berbasis proyek</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-xl p-4">
          <Briefcase className="w-5 h-5 text-indigo-600 mb-1" />
          <p className="text-2xl font-bold">{overview.totalProjects || 0}</p>
          <p className="text-xs text-gray-500">Total Proyek ({overview.activeProjects || 0} aktif)</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <Users className="w-5 h-5 text-green-600 mb-1" />
          <p className="text-2xl font-bold">{overview.activeWorkers || 0}</p>
          <p className="text-xs text-gray-500">Pekerja Aktif</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <DollarSign className="w-5 h-5 text-blue-600 mb-1" />
          <p className="text-2xl font-bold">{fmtCur(overview.totalBudget || 0)}</p>
          <p className="text-xs text-gray-500">Total Anggaran</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <BarChart3 className="w-5 h-5 text-orange-600 mb-1" />
          <p className="text-2xl font-bold">{fmtCur(overview.totalActual || 0)}</p>
          <p className="text-xs text-gray-500">Biaya Aktual</p>
        </div>
      </div>

      {/* Project Filter */}
      {tab !== 'projects' && (
        <div className="mb-4">
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
            <option value="">Semua Proyek</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setProjectDetail(null); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-10 text-gray-400">Memuat...</div>}

      {/* PROJECTS TAB */}
      {!loading && tab === 'projects' && !projectDetail && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Daftar Proyek</h2>
            <button onClick={() => openAdd('project')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              <Plus className="w-4 h-4" /> Buat Proyek
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {projects.map(p => (
              <div key={p.id} className={`bg-white border-l-4 ${priorityColor(p.priority)} border rounded-xl p-4 hover:shadow-md transition-shadow`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{p.project_code}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>{p.status}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    {p.client_name && <p className="text-sm text-gray-500">Klien: {p.client_name}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={async () => { const res = await api('project-detail', 'GET', null, `&id=${p.id}`); setProjectDetail(res.data); }} className="p-1.5 text-gray-400 hover:text-indigo-600"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => { setEditingItem(p); setProjForm({ name: p.name, description: p.description || '', clientName: p.client_name || '', location: p.location || '', startDate: p.start_date || '', endDate: p.end_date || '', budgetAmount: p.budget_amount, department: p.department || '', industry: p.industry || '', priority: p.priority, contractNumber: '', contractValue: 0 }); setModalType('project'); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete('project', p.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {p.description && <p className="text-sm text-gray-500 line-clamp-2 mb-2">{p.description}</p>}
                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1"><span>Progres</span><span>{Number(p.completion_percent || 0).toFixed(0)}%</span></div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${p.completion_percent || 0}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t text-xs">
                  <div><span className="text-gray-400">Anggaran</span><p className="font-medium">{fmtCur(p.budget_amount)}</p></div>
                  <div><span className="text-gray-400">Aktual</span><p className="font-medium">{fmtCur(p.actual_cost)}</p></div>
                  <div><span className="text-gray-400">Periode</span><p className="font-medium">{p.start_date ? new Date(p.start_date).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }) : '-'}</p></div>
                </div>
              </div>
            ))}
            {projects.length === 0 && <p className="text-center text-gray-400 py-8 col-span-2">Belum ada proyek</p>}
          </div>
        </div>
      )}

      {/* PROJECT DETAIL */}
      {!loading && tab === 'projects' && projectDetail && (
        <div>
          <button onClick={() => setProjectDetail(null)} className="text-sm text-indigo-600 mb-4 hover:underline">← Kembali</button>
          <div className="bg-white border rounded-xl p-6 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-indigo-600">{projectDetail.project?.project_code}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(projectDetail.project?.status)}`}>{projectDetail.project?.status}</span>
            </div>
            <h2 className="text-xl font-bold">{projectDetail.project?.name}</h2>
            <p className="text-gray-500">{projectDetail.project?.description}</p>
            <div className="grid md:grid-cols-4 gap-4 mt-4">
              <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Anggaran</p><p className="font-bold">{fmtCur(projectDetail.project?.budget_amount)}</p></div>
              <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Aktual</p><p className="font-bold">{fmtCur(projectDetail.project?.actual_cost)}</p></div>
              <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Pekerja</p><p className="font-bold">{(projectDetail.workers || []).length}</p></div>
              <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Total Jam</p><p className="font-bold">{projectDetail.totalHours || 0}</p></div>
            </div>
          </div>
          {/* Workers */}
          <div className="bg-white border rounded-xl p-5 mb-4">
            <h3 className="font-semibold mb-3">Tim Proyek ({(projectDetail.workers || []).length})</h3>
            <div className="space-y-2">
              {(projectDetail.workers || []).map((w: any) => (
                <div key={w.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                  <div><span className="font-medium">#{w.employee_id}</span> - <span>{w.role || 'Anggota'}</span></div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="capitalize">{w.worker_type}</span>
                    <span>{w.allocation_percent}%</span>
                    <span>{fmtCur(w.daily_rate)}/hari</span>
                  </div>
                </div>
              ))}
              {(projectDetail.workers || []).length === 0 && <p className="text-sm text-gray-400">Belum ada pekerja</p>}
            </div>
          </div>
          {/* Payroll */}
          {(projectDetail.payrollItems || []).length > 0 && (
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold mb-3">Data Penggajian</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Karyawan</th><th className="px-3 py-2 text-left">Periode</th><th className="px-3 py-2 text-right">Hari</th><th className="px-3 py-2 text-right">Gross</th><th className="px-3 py-2 text-right">Net</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
                <tbody className="divide-y">
                  {(projectDetail.payrollItems || []).map((pi: any) => (
                    <tr key={pi.id}><td className="px-3 py-2">#{pi.employee_id}</td><td className="px-3 py-2 text-xs">{pi.period_start && new Date(pi.period_start).toLocaleDateString('id-ID')} - {pi.period_end && new Date(pi.period_end).toLocaleDateString('id-ID')}</td><td className="px-3 py-2 text-right">{pi.days_worked}</td><td className="px-3 py-2 text-right">{fmtCur(pi.gross_amount)}</td><td className="px-3 py-2 text-right font-medium">{fmtCur(pi.net_amount)}</td><td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(pi.status)}`}>{pi.status}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* WORKERS TAB */}
      {!loading && tab === 'workers' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Tenaga Kerja Proyek</h2>
            <div className="flex gap-2">
              <button onClick={() => openBulk('workers')} className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-700 rounded-lg text-sm hover:bg-green-50">
                <Upload className="w-4 h-4" /> Bulk Import CSV
              </button>
              <button onClick={() => openAdd('worker')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                <Plus className="w-4 h-4" /> Tambah Pekerja
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Proyek</th>
                  <th className="px-4 py-3 text-left">Karyawan</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Tipe</th>
                  <th className="px-4 py-3 text-right">Rate/Hari</th>
                  <th className="px-4 py-3 text-right">Alokasi</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {workers.filter(w => !selectedProject || w.project_id === selectedProject).map(w => {
                  const proj = projects.find(p => p.id === w.project_id);
                  return (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{proj?.project_code || w.project_id.slice(0, 8)}</td>
                      <td className="px-4 py-3">#{w.employee_id}</td>
                      <td className="px-4 py-3">{w.role || '-'}</td>
                      <td className="px-4 py-3 capitalize">{w.worker_type}</td>
                      <td className="px-4 py-3 text-right">{fmtCur(w.daily_rate)}</td>
                      <td className="px-4 py-3 text-right">{w.allocation_percent}%</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(w.status)}`}>{w.status}</span></td>
                      <td className="px-4 py-3"><button onClick={() => handleDelete('worker', w.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {workers.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada pekerja proyek</p>}
          </div>
        </div>
      )}

      {/* TIMESHEETS TAB */}
      {!loading && tab === 'timesheets' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Timesheet Proyek</h2>
            <div className="flex gap-2">
              <button onClick={() => openBulk('timesheets')} className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-700 rounded-lg text-sm hover:bg-blue-50">
                <Upload className="w-4 h-4" /> Bulk Import CSV
              </button>
              <button onClick={() => openAdd('timesheet')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                <Plus className="w-4 h-4" /> Input Timesheet
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Tanggal</th>
                  <th className="px-4 py-3 text-left">Proyek</th>
                  <th className="px-4 py-3 text-left">Karyawan</th>
                  <th className="px-4 py-3 text-right">Jam Kerja</th>
                  <th className="px-4 py-3 text-right">Lembur</th>
                  <th className="px-4 py-3 text-left">Aktivitas</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {timesheets.filter(t => !selectedProject || t.project_id === selectedProject).map(t => {
                  const proj = projects.find(p => p.id === t.project_id);
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{t.timesheet_date && new Date(t.timesheet_date).toLocaleDateString('id-ID')}</td>
                      <td className="px-4 py-3 font-medium">{proj?.project_code || '-'}</td>
                      <td className="px-4 py-3">#{t.employee_id}</td>
                      <td className="px-4 py-3 text-right">{t.hours_worked}h</td>
                      <td className="px-4 py-3 text-right">{Number(t.overtime_hours) > 0 ? `${t.overtime_hours}h` : '-'}</td>
                      <td className="px-4 py-3 max-w-xs truncate">{t.activity_description}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {t.status === 'submitted' && (
                            <button onClick={async () => { await api('approve-timesheet', 'POST', { id: t.id }); showToast('Disetujui'); loadData(); }} className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-3.5 h-3.5" /></button>
                          )}
                          <button onClick={() => handleDelete('timesheet', t.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {timesheets.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada data timesheet</p>}
          </div>
        </div>
      )}

      {/* PAYROLL TAB */}
      {!loading && tab === 'payroll' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Penggajian Berbasis Proyek</h2>
            <div className="flex gap-2">
              <button onClick={() => openBulk('payroll')} className="flex items-center gap-2 px-4 py-2 border border-purple-600 text-purple-700 rounded-lg text-sm hover:bg-purple-50">
                <Upload className="w-4 h-4" /> Bulk Hitung CSV
              </button>
              <button onClick={() => openAdd('calc-payroll')} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                <DollarSign className="w-4 h-4" /> Hitung Payroll
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Proyek</th>
                  <th className="px-4 py-3 text-left">Karyawan</th>
                  <th className="px-4 py-3 text-left">Periode</th>
                  <th className="px-4 py-3 text-right">Hari</th>
                  <th className="px-4 py-3 text-right">Jam Regular</th>
                  <th className="px-4 py-3 text-right">Lembur</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Net</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payrollItems.filter(p => !selectedProject || p.project_id === selectedProject).map(pi => {
                  const proj = projects.find(p => p.id === pi.project_id);
                  return (
                    <tr key={pi.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{proj?.project_code || '-'}</td>
                      <td className="px-4 py-3">#{pi.employee_id}</td>
                      <td className="px-4 py-3 text-xs">{pi.period_start && new Date(pi.period_start).toLocaleDateString('id-ID')} - {pi.period_end && new Date(pi.period_end).toLocaleDateString('id-ID')}</td>
                      <td className="px-4 py-3 text-right">{pi.days_worked}</td>
                      <td className="px-4 py-3 text-right">{pi.regular_hours}h</td>
                      <td className="px-4 py-3 text-right">{Number(pi.overtime_hours) > 0 ? `${pi.overtime_hours}h` : '-'}</td>
                      <td className="px-4 py-3 text-right">{fmtCur(pi.gross_amount)}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmtCur(pi.net_amount)}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(pi.status)}`}>{pi.status}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {pi.status === 'calculated' && (
                            <button onClick={async () => { await api('approve-payroll', 'POST', { id: pi.id }); showToast('Disetujui'); loadData(); }} className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded">Setujui</button>
                          )}
                          {pi.status === 'approved' && (
                            <button onClick={async () => { await api('pay-payroll', 'POST', { id: pi.id, paymentRef: `PAY-${Date.now()}` }); showToast('Dibayar'); loadData(); }} className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">Bayar</button>
                          )}
                          <button onClick={() => handleDelete('payroll', pi.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {payrollItems.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada data penggajian proyek</p>}
          </div>
        </div>
      )}

      {/* DOCUMENTS TAB */}
      {!loading && tab === 'documents' && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
            <div>
              <h2 className="text-lg font-semibold">Dokumen Proyek</h2>
              <p className="text-sm text-gray-500">{filteredDocs.length} dokumen</p>
            </div>
            <button onClick={() => { setShowUploadModal(true); setUploadFiles([]); setUploadForm({ name: '', description: '', category: 'Umum', projectId: '', tags: '' }); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-200 transition-all">
              <Upload className="w-4 h-4" /> Upload Dokumen
            </button>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={docFilter.search} onChange={e => setDocFilter({ ...docFilter, search: e.target.value })} placeholder="Cari dokumen..." className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
            </div>
            <select value={docFilter.category} onChange={e => setDocFilter({ ...docFilter, category: e.target.value })} className="px-3 py-2.5 border rounded-xl text-sm bg-white min-w-[150px]">
              <option value="">Semua Kategori</option>
              {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Documents grid */}
          {filteredDocs.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map(doc => (
                <div key={doc.id} className="bg-white border rounded-xl p-4 hover:shadow-lg hover:border-indigo-200 transition-all group">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-50 transition-colors">
                      {getFileIcon(doc.fileExtension)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm truncate">{doc.name}</h3>
                      <p className="text-xs text-gray-500 truncate">{doc.originalFilename}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={doc.filePath} target="_blank" rel="noreferrer" className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Download className="w-3.5 h-3.5" /></a>
                      <button onClick={() => handleDeleteDoc(doc.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  {doc.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{doc.description}</p>}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full"><Tag className="w-3 h-3" />{doc.category}</span>
                    <span className="text-xs text-gray-400 uppercase font-mono">{doc.fileExtension?.replace('.', '')}</span>
                    <span className="text-xs text-gray-400">{fmtSize(doc.fileSize)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t">
                    <span>{doc.uploadedBy}</span>
                    <span>{new Date(doc.uploadedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white border-2 border-dashed rounded-2xl">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Belum ada dokumen</p>
              <p className="text-sm text-gray-400 mt-1">Upload dokumen pertama Anda untuk mulai mengelola</p>
              <button onClick={() => { setShowUploadModal(true); setUploadFiles([]); }} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                <Upload className="w-4 h-4 inline mr-1.5" />Upload Sekarang
              </button>
            </div>
          )}
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <div>
                <h3 className="text-lg font-semibold">Upload Dokumen</h3>
                <p className="text-sm text-gray-500">Upload file untuk proyek (maks 25MB per file)</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Drag & Drop Zone */}
              <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}`}
                onClick={() => fileInputRef.current?.click()}>
                <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.zip,.rar" />
                <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center ${dragActive ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                  <Upload className={`w-7 h-7 ${dragActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                </div>
                <p className="font-medium text-gray-700">Drag & drop file di sini</p>
                <p className="text-sm text-gray-500 mt-1">atau <span className="text-indigo-600 font-medium">klik untuk pilih file</span></p>
                <p className="text-xs text-gray-400 mt-2">PDF, DOC, XLS, PPT, JPG, PNG, ZIP (maks 25MB)</p>
              </div>

              {/* File list */}
              {uploadFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">{uploadFiles.length} file dipilih</p>
                  {uploadFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      {getFileIcon(file.name.split('.').pop() || '')}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-400">{fmtSize(file.size)}</p>
                      </div>
                      <button onClick={() => removeFile(idx)} className="p-1 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-gray-700">Nama Dokumen</label><input value={uploadForm.name} onChange={e => setUploadForm({ ...uploadForm, name: e.target.value })} placeholder="Opsional (default: nama file)" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Kategori</label>
                  <select value={uploadForm.category} onChange={e => setUploadForm({ ...uploadForm, category: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="text-sm font-medium text-gray-700">Proyek Terkait</label>
                <select value={uploadForm.projectId} onChange={e => setUploadForm({ ...uploadForm, projectId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                  <option value="">Tidak spesifik (umum)</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
                </select>
              </div>
              <div><label className="text-sm font-medium text-gray-700">Deskripsi</label><textarea value={uploadForm.description} onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })} placeholder="Keterangan singkat dokumen..." className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" rows={2} /></div>
              <div><label className="text-sm font-medium text-gray-700">Tags</label><input value={uploadForm.tags} onChange={e => setUploadForm({ ...uploadForm, tags: e.target.value })} placeholder="Pisahkan dengan koma, mis: kontrak, legal" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t">
              <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50">Batal</button>
              <button onClick={handleUpload} disabled={uploading || uploadFiles.length === 0}
                className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {uploading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Mengunggah...</> : <><Upload className="w-4 h-4" /> Upload {uploadFiles.length > 0 ? `(${uploadFiles.length})` : ''}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATES TAB */}
      {!loading && tab === 'templates' && !selectedTemplate && (
        <div>
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Template Dokumen Proyek</h2>
            <p className="text-sm text-gray-500">Kumpulan template siap pakai untuk kebutuhan manajemen proyek ({templates.length} template)</p>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={tplFilter.search} onChange={e => setTplFilter({ ...tplFilter, search: e.target.value })} placeholder="Cari template..." className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setTplFilter({ ...tplFilter, category: '' })} className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${!tplFilter.category ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border text-gray-600 hover:border-indigo-300'}`}>Semua</button>
              {Object.keys(templateCategories).map(cat => (
                <button key={cat} onClick={() => setTplFilter({ ...tplFilter, category: cat })} className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${tplFilter.category === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border text-gray-600 hover:border-indigo-300'}`}>{cat}</button>
              ))}
            </div>
          </div>

          {/* Template grid by category */}
          {!tplFilter.category ? (
            Object.entries(templateCategories).map(([cat, catTemplates]) => {
              const visible = (catTemplates as DocTemplate[]).filter(t => !tplFilter.search || t.name.toLowerCase().includes(tplFilter.search.toLowerCase()) || t.description.toLowerCase().includes(tplFilter.search.toLowerCase()));
              if (visible.length === 0) return null;
              return (
                <div key={cat} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-6 rounded-full bg-indigo-500" />
                    <h3 className="font-semibold text-gray-800">{cat}</h3>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{visible.length}</span>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visible.map(tpl => (
                      <div key={tpl.id} onClick={() => setSelectedTemplate(tpl)}
                        className="bg-white border rounded-xl p-4 hover:shadow-lg hover:border-indigo-200 cursor-pointer transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 opacity-5 group-hover:opacity-10 transition-opacity" style={{ background: `radial-gradient(circle at top right, ${tpl.color}, transparent)` }} />
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tpl.color + '15' }}>
                            <FileText className="w-5 h-5" style={{ color: tpl.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 text-sm">{tpl.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{tpl.format}</span>
                              <span className="text-[10px] text-gray-400">v{tpl.version}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{tpl.description}</p>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <div className="flex items-center gap-1"><Download className="w-3 h-3" />{tpl.downloadCount}x download</div>
                          <span>{tpl.sections.length} bagian</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(tpl => (
                <div key={tpl.id} onClick={() => setSelectedTemplate(tpl)}
                  className="bg-white border rounded-xl p-4 hover:shadow-lg hover:border-indigo-200 cursor-pointer transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 opacity-5 group-hover:opacity-10 transition-opacity" style={{ background: `radial-gradient(circle at top right, ${tpl.color}, transparent)` }} />
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tpl.color + '15' }}>
                      <FileText className="w-5 h-5" style={{ color: tpl.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm">{tpl.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{tpl.format}</span>
                        <span className="text-[10px] text-gray-400">v{tpl.version}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{tpl.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-1"><Download className="w-3 h-3" />{tpl.downloadCount}x download</div>
                    <span>{tpl.sections.length} bagian</span>
                  </div>
                </div>
              ))}
              {filteredTemplates.length === 0 && <p className="text-center text-gray-400 py-8 col-span-3">Tidak ada template ditemukan</p>}
            </div>
          )}
        </div>
      )}

      {/* TEMPLATE DETAIL */}
      {!loading && tab === 'templates' && selectedTemplate && (
        <div>
          <button onClick={() => setSelectedTemplate(null)} className="text-sm text-indigo-600 mb-4 hover:underline flex items-center gap-1"><ChevronRight className="w-4 h-4 rotate-180" /> Kembali ke Template</button>
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white border rounded-2xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: selectedTemplate.color + '15' }}>
                    <FileText className="w-7 h-7" style={{ color: selectedTemplate.color }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs font-mono uppercase px-2 py-1 bg-gray-100 text-gray-600 rounded-lg">{selectedTemplate.format}</span>
                      <span className="text-xs text-gray-500">Version {selectedTemplate.version}</span>
                      <span className="text-xs text-gray-400">Update: {new Date(selectedTemplate.lastUpdated).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-5">{selectedTemplate.description}</p>
                <div className="flex gap-3">
                  <button onClick={async () => { await docApi('download-template', 'POST', { templateId: selectedTemplate.id }); showToast('Template siap di-download'); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-200">
                    <Download className="w-4 h-4" /> Download Template
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(`Template: ${selectedTemplate.name}\nKategori: ${selectedTemplate.category}\nFormat: ${selectedTemplate.format}\nBagian: ${selectedTemplate.sections.join(', ')}`); showToast('Info template disalin'); }}
                    className="flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                    <Copy className="w-4 h-4" /> Salin Info
                  </button>
                </div>
              </div>

              {/* Sections / Outline */}
              <div className="bg-white border rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Paperclip className="w-4 h-4 text-indigo-600" /> Isi Template ({selectedTemplate.sections.length} bagian)</h3>
                <div className="space-y-2">
                  {selectedTemplate.sections.map((section, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: selectedTemplate.color }}>{idx + 1}</div>
                      <span className="text-sm text-gray-700">{section}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              <div className="bg-white border rounded-2xl p-5">
                <h4 className="font-semibold text-sm text-gray-900 mb-3">Informasi</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Kategori</span><span className="font-medium" style={{ color: selectedTemplate.color }}>{selectedTemplate.category}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Format</span><span className="font-mono uppercase text-xs bg-gray-100 px-2 py-1 rounded">{selectedTemplate.format}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Versi</span><span>{selectedTemplate.version}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Terakhir Update</span><span>{new Date(selectedTemplate.lastUpdated).toLocaleDateString('id-ID')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Jumlah Bagian</span><span>{selectedTemplate.sections.length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Total Download</span><span className="font-medium text-indigo-600">{selectedTemplate.downloadCount}x</span></div>
                </div>
              </div>

              <div className="bg-white border rounded-2xl p-5">
                <h4 className="font-semibold text-sm text-gray-900 mb-3">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.tags.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 cursor-default transition-colors">
                      <Tag className="w-3 h-3" />{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5">
                <h4 className="font-semibold text-sm text-indigo-900 mb-2">Tips Penggunaan</h4>
                <ul className="text-xs text-indigo-700 space-y-1.5">
                  <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Download dan sesuaikan dengan data proyek Anda</li>
                  <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Isi semua bagian yang ditandai wajib (*)</li>
                  <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Pastikan tanda tangan pihak yang berwenang</li>
                  <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Upload kembali dokumen yang sudah diisi ke tab Dokumen</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-semibold">
                {modalType === 'project' ? (editingItem ? 'Edit Proyek' : 'Buat Proyek') : modalType === 'worker' ? 'Tambah Pekerja' : modalType === 'timesheet' ? 'Input Timesheet' : 'Hitung Payroll'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {modalType === 'project' && (<>
                <div><label className="text-sm font-medium text-gray-700">Nama Proyek</label><input value={projForm.name} onChange={e => setProjForm({ ...projForm, name: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Deskripsi</label><textarea value={projForm.description} onChange={e => setProjForm({ ...projForm, description: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" rows={2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Client</label><input value={projForm.clientName} onChange={e => setProjForm({ ...projForm, clientName: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-sm font-medium text-gray-700">Lokasi</label><input value={projForm.location} onChange={e => setProjForm({ ...projForm, location: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Mulai</label><input type="date" value={projForm.startDate} onChange={e => setProjForm({ ...projForm, startDate: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-sm font-medium text-gray-700">Selesai</label><input type="date" value={projForm.endDate} onChange={e => setProjForm({ ...projForm, endDate: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Budget (Rp)</label><input type="number" value={projForm.budgetAmount} onChange={e => setProjForm({ ...projForm, budgetAmount: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-sm font-medium text-gray-700">Prioritas</label>
                    <select value={projForm.priority} onChange={e => setProjForm({ ...projForm, priority: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Departemen</label><input value={projForm.department} onChange={e => setProjForm({ ...projForm, department: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-sm font-medium text-gray-700">Industri</label>
                    <select value={projForm.industry} onChange={e => setProjForm({ ...projForm, industry: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                      <option value="">Pilih</option><option value="construction">Konstruksi</option><option value="mining">Tambang</option><option value="manufacturing">Manufaktur</option><option value="it">IT</option><option value="consulting">Konsulting</option><option value="outsourcing">Outsourcing</option><option value="other">Lainnya</option>
                    </select>
                  </div>
                </div>
              </>)}
              {modalType === 'worker' && (<>
                <div><label className="text-sm font-medium text-gray-700">Proyek</label>
                  <select value={workerForm.projectId} onChange={e => setWorkerForm({ ...workerForm, projectId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="">Pilih Proyek</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-medium text-gray-700">ID Karyawan</label><input type="number" value={workerForm.employeeId} onChange={e => setWorkerForm({ ...workerForm, employeeId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Role</label><input value={workerForm.role} onChange={e => setWorkerForm({ ...workerForm, role: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="e.g. Site Engineer, Foreman" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Rate Harian (Rp)</label><input type="number" value={workerForm.dailyRate} onChange={e => setWorkerForm({ ...workerForm, dailyRate: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-sm font-medium text-gray-700">Alokasi %</label><input type="number" value={workerForm.allocationPercent} onChange={e => setWorkerForm({ ...workerForm, allocationPercent: parseInt(e.target.value) || 100 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
                <div><label className="text-sm font-medium text-gray-700">Tipe Pekerja</label>
                  <select value={workerForm.workerType} onChange={e => setWorkerForm({ ...workerForm, workerType: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="permanent">Permanent</option><option value="contract">Kontrak</option><option value="freelance">Freelance</option><option value="outsource">Outsource</option>
                  </select>
                </div>
              </>)}
              {modalType === 'timesheet' && (<>
                <div><label className="text-sm font-medium text-gray-700">Proyek</label>
                  <select value={tsForm.projectId} onChange={e => setTsForm({ ...tsForm, projectId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="">Pilih Proyek</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-medium text-gray-700">ID Karyawan</label><input type="number" value={tsForm.employeeId} onChange={e => setTsForm({ ...tsForm, employeeId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Tanggal</label><input type="date" value={tsForm.timesheetDate} onChange={e => setTsForm({ ...tsForm, timesheetDate: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Jam Kerja</label><input type="number" value={tsForm.hoursWorked} onChange={e => setTsForm({ ...tsForm, hoursWorked: parseFloat(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-sm font-medium text-gray-700">Jam Lembur</label><input type="number" value={tsForm.overtimeHours} onChange={e => setTsForm({ ...tsForm, overtimeHours: parseFloat(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
                <div><label className="text-sm font-medium text-gray-700">Deskripsi Aktivitas</label><textarea value={tsForm.activityDescription} onChange={e => setTsForm({ ...tsForm, activityDescription: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" rows={2} /></div>
              </>)}
              {modalType === 'calc-payroll' && (<>
                <div><label className="text-sm font-medium text-gray-700">Proyek</label>
                  <select value={payrollCalcForm.projectId} onChange={e => setPayrollCalcForm({ ...payrollCalcForm, projectId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="">Pilih Proyek</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-medium text-gray-700">ID Karyawan</label><input type="number" value={payrollCalcForm.employeeId} onChange={e => setPayrollCalcForm({ ...payrollCalcForm, employeeId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Periode Mulai</label><input type="date" value={payrollCalcForm.periodStart} onChange={e => setPayrollCalcForm({ ...payrollCalcForm, periodStart: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-sm font-medium text-gray-700">Periode Akhir</label><input type="date" value={payrollCalcForm.periodEnd} onChange={e => setPayrollCalcForm({ ...payrollCalcForm, periodEnd: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
                <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">Payroll akan dihitung otomatis dari timesheet yang sudah disetujui dalam periode ini, dikali rate harian pekerja.</p>
              </>)}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50">Batal</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{modalType === 'calc-payroll' ? 'Hitung' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
      {/* BULK IMPORT MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <div>
                <h3 className="text-lg font-semibold">{BULK_LABELS[bulkType].title}</h3>
                <p className="text-sm text-gray-500">Import data dari file CSV atau paste langsung</p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Project selector */}
              <div>
                <label className="text-sm font-medium text-gray-700">Proyek <span className="text-red-500">*</span></label>
                <select value={bulkProjectId} onChange={e => setBulkProjectId(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                  <option value="">Pilih Proyek</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
                </select>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => downloadCsvTemplate(bulkType)}
                  className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                  <Download className="w-4 h-4" /> Download Template CSV
                </button>
                <button onClick={() => csvInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                  <FilePlus className="w-4 h-4" /> Upload File CSV
                </button>
                <input ref={csvInputRef} type="file" accept=".csv,.txt" onChange={handleCsvFileUpload} className="hidden" />
                <button onClick={() => { setBulkCsvText(BULK_HEADERS[bulkType].example); parseBulkCsv(BULK_HEADERS[bulkType].example, bulkType); }}
                  className="flex items-center gap-2 px-3 py-2 border border-indigo-200 rounded-lg text-sm text-indigo-700 hover:bg-indigo-50">
                  <Eye className="w-4 h-4" /> Isi Contoh Data
                </button>
              </div>

              {/* CSV Text Area */}
              <div>
                <label className="text-sm font-medium text-gray-700">Data CSV</label>
                <textarea value={bulkCsvText} onChange={e => { setBulkCsvText(e.target.value); if (e.target.value.trim()) parseBulkCsv(e.target.value, bulkType); else { setBulkParsed([]); setBulkErrors([]); } }}
                  placeholder={`Paste CSV di sini...\n\nFormat header:\n${BULK_HEADERS[bulkType].required.join(', ')}${BULK_HEADERS[bulkType].optional.length ? ', ' + BULK_HEADERS[bulkType].optional.join(', ') : ''}`}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm font-mono h-32 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
                <div className="flex gap-4 mt-1 text-xs text-gray-400">
                  <span>Kolom wajib: <strong className="text-gray-600">{BULK_HEADERS[bulkType].required.join(', ')}</strong></span>
                  {BULK_HEADERS[bulkType].optional.length > 0 && <span>Opsional: {BULK_HEADERS[bulkType].optional.join(', ')}</span>}
                </div>
              </div>

              {/* Validation Errors */}
              {bulkErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-800 mb-1 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> {bulkErrors.length} kesalahan ditemukan</p>
                  <ul className="text-xs text-red-700 space-y-0.5 max-h-24 overflow-y-auto">
                    {bulkErrors.map((err, i) => <li key={i}>- {err}</li>)}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              {bulkParsed.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Check className="w-4 h-4 text-green-600" /> {bulkParsed.length} baris siap diimport
                    </p>
                    {bulkErrors.length > 0 && <span className="text-xs text-amber-600">{bulkErrors.length} warning (tetap bisa import)</span>}
                  </div>
                  <div className="overflow-x-auto border rounded-lg max-h-48">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-gray-500">#</th>
                          {Object.keys(bulkParsed[0] || {}).map(h => <th key={h} className="px-2 py-1.5 text-left text-gray-500 whitespace-nowrap">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {bulkParsed.slice(0, 20).map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                            {Object.values(row).map((v: any, j) => <td key={j} className="px-2 py-1.5 whitespace-nowrap">{v || <span className="text-gray-300">-</span>}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {bulkParsed.length > 20 && <p className="text-xs text-center text-gray-400 py-2">...dan {bulkParsed.length - 20} baris lainnya</p>}
                  </div>
                </div>
              )}

              {/* Result */}
              {bulkResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-800 flex items-center gap-1"><Check className="w-4 h-4" /> Import selesai!</p>
                  <p className="text-xs text-green-700 mt-1">Berhasil: <strong>{bulkResult.success}</strong>{bulkResult.failed > 0 && <> | Gagal: <strong className="text-red-600">{bulkResult.failed}</strong></>}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center p-5 border-t">
              <p className="text-xs text-gray-400">Gunakan template CSV untuk format yang benar</p>
              <div className="flex gap-2">
                <button onClick={() => setShowBulkModal(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50">Tutup</button>
                <button onClick={handleBulkImport} disabled={bulkUploading || bulkParsed.length === 0 || !bulkProjectId}
                  className={`px-5 py-2 text-sm text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    bulkType === 'workers' ? 'bg-green-600 hover:bg-green-700' : bulkType === 'timesheets' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'
                  }`}>
                  {bulkUploading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Mengimport...</> : <><Upload className="w-4 h-4" /> Import {bulkParsed.length} Data</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </HQLayout>
  );
}
