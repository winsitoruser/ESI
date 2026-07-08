import { useState, useEffect, useCallback, useRef } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import { useTranslation } from '@/lib/i18n';
import { Briefcase, Users, Clock, DollarSign, FolderOpen, FileText, AlertTriangle } from 'lucide-react';

import { TabKey, ProjectForm, WorkerForm, TimesheetForm, PayrollCalcForm, UploadForm, DocFilter, TplFilter, ProjectItem, Worker, Timesheet, PayrollItem, ProjectDocument, DocTemplate } from '@/components/humanify/project-management/types';
import { fmtCur, statusColor, priorityColor, fmtSize, getFileIcon, DOC_CATEGORIES, BULK_HEADERS, BULK_LABELS, defaultProjectForm, defaultWorkerForm, defaultTsForm, defaultPayrollCalcForm } from '@/components/humanify/project-management/utils';
import OverviewCards from '@/components/humanify/project-management/OverviewCards';
import ProjectsTab from '@/components/humanify/project-management/ProjectsTab';
import WorkersTab from '@/components/humanify/project-management/WorkersTab';
import TimesheetsTab from '@/components/humanify/project-management/TimesheetsTab';
import PayrollTab from '@/components/humanify/project-management/PayrollTab';
import DocumentsTab from '@/components/humanify/project-management/DocumentsTab';
import TemplatesTab from '@/components/humanify/project-management/TemplatesTab';
import UploadModal from '@/components/humanify/project-management/UploadModal';
import CrudModal from '@/components/humanify/project-management/CrudModal';
import BulkImportModal from '@/components/humanify/project-management/BulkImportModal';

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
  const [uploadForm, setUploadForm] = useState<UploadForm>({ name: '', description: '', category: 'Umum', projectId: '', tags: '' });
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [docFilter, setDocFilter] = useState<DocFilter>({ category: '', search: '' });
  const [tplFilter, setTplFilter] = useState<TplFilter>({ category: '', search: '' });
  const [selectedTemplate, setSelectedTemplate] = useState<DocTemplate | null>(null);
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

  // Form states
  const [projForm, setProjForm] = useState<ProjectForm>(defaultProjectForm);
  const [workerForm, setWorkerForm] = useState<WorkerForm>(defaultWorkerForm);
  const [tsForm, setTsForm] = useState<TimesheetForm>(defaultTsForm);
  const [payrollCalcForm, setPayrollCalcForm] = useState<PayrollCalcForm>(defaultPayrollCalcForm);

  const showToast = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const api = useCallback(async (action: string, method = 'GET', body?: any, extra = '') => {
    const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`/api/humanify/project-management?action=${action}${extra}`, opts);
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
    const r = await fetch(`/api/humanify/project-documents?action=${action}${extra}`, opts);
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
        await fetch('/api/humanify/project-documents?action=upload', { method: 'POST', body: formData });
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

  // CSV Parser
  const parseCsv = (csv: string): { headers: string[]; rows: Record<string, string>[] } => {
    const lines = csv.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = lines[0].split(',').map(h => h.trim().replace(/\"/g, ''));
    const rows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/\"/g, ''));
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return obj;
    });
    return { headers, rows };
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
      showToast('Impor massal berhasil!');
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

  const openAdd = (type: string) => {
    setEditingItem(null); setModalType(type); setShowModal(true);
    if (type === 'project') setProjForm(defaultProjectForm);
    if (type === 'worker') setWorkerForm({ ...defaultWorkerForm, projectId: selectedProject || '' });
    if (type === 'timesheet') setTsForm({ ...defaultTsForm, projectId: selectedProject || '', timesheetDate: new Date().toISOString().split('T')[0] });
    if (type === 'calc-payroll') { setPayrollCalcForm({ ...defaultPayrollCalcForm, projectId: selectedProject || '' }); setModalType('calc-payroll'); }
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
      <OverviewCards overview={overview} />

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
      {!loading && tab === 'projects' && (
        <ProjectsTab
          projects={projects}
          projectDetail={projectDetail}
          setProjectDetail={setProjectDetail}
          api={api}
          openAdd={openAdd}
          handleDelete={handleDelete}
        />
      )}

      {/* WORKERS TAB */}
      {!loading && tab === 'workers' && (
        <WorkersTab
          workers={workers}
          projects={projects}
          selectedProject={selectedProject}
          openAdd={openAdd}
          openBulk={openBulk}
          handleDelete={handleDelete}
        />
      )}

      {/* TIMESHEETS TAB */}
      {!loading && tab === 'timesheets' && (
        <TimesheetsTab
          timesheets={timesheets}
          projects={projects}
          selectedProject={selectedProject}
          openAdd={openAdd}
          openBulk={openBulk}
          api={api}
          handleDelete={handleDelete}
          loadData={loadData}
          showToast={showToast}
        />
      )}

      {/* PAYROLL TAB */}
      {!loading && tab === 'payroll' && (
        <PayrollTab
          payrollItems={payrollItems}
          projects={projects}
          selectedProject={selectedProject}
          openAdd={openAdd}
          openBulk={openBulk}
          api={api}
          handleDelete={handleDelete}
          loadData={loadData}
          showToast={showToast}
        />
      )}

      {/* DOCUMENTS TAB */}
      {!loading && tab === 'documents' && (
        <DocumentsTab
          documents={documents}
          docFilter={docFilter}
          setDocFilter={setDocFilter}
          setShowUploadModal={setShowUploadModal}
          setUploadFiles={setUploadFiles}
          setUploadForm={setUploadForm}
          handleDeleteDoc={handleDeleteDoc}
        />
      )}

      {/* TEMPLATES TAB */}
      {!loading && tab === 'templates' && (
        <TemplatesTab
          templates={templates}
          templateCategories={templateCategories}
          selectedTemplate={selectedTemplate}
          setSelectedTemplate={setSelectedTemplate}
          tplFilter={tplFilter}
          setTplFilter={setTplFilter}
          docApi={docApi}
          showToast={showToast}
        />
      )}

      {/* Crud Modal */}
      <CrudModal
        showModal={showModal}
        setShowModal={setShowModal}
        modalType={modalType}
        editingItem={editingItem}
        projForm={projForm}
        setProjForm={setProjForm}
        workerForm={workerForm}
        setWorkerForm={setWorkerForm}
        tsForm={tsForm}
        setTsForm={setTsForm}
        payrollCalcForm={payrollCalcForm}
        setPayrollCalcForm={setPayrollCalcForm}
        handleSave={handleSave}
        projects={projects}
      />

      {/* Upload Modal */}
      <UploadModal
        showUploadModal={showUploadModal}
        setShowUploadModal={setShowUploadModal}
        uploadFiles={uploadFiles}
        setUploadFiles={setUploadFiles}
        uploadForm={uploadForm}
        setUploadForm={setUploadForm}
        handleUpload={handleUpload}
        uploading={uploading}
        fileInputRef={fileInputRef}
        handleDrag={handleDrag}
        handleDrop={handleDrop}
        handleFileSelect={handleFileSelect}
        removeFile={removeFile}
        dragActive={dragActive}
        projects={projects}
        getFileIcon={getFileIcon}
        fmtSize={fmtSize}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        showBulkModal={showBulkModal}
        setShowBulkModal={setShowBulkModal}
        bulkType={bulkType}
        bulkProjectId={bulkProjectId}
        setBulkProjectId={setBulkProjectId}
        bulkCsvText={bulkCsvText}
        setBulkCsvText={setBulkCsvText}
        bulkParsed={bulkParsed}
        bulkErrors={bulkErrors}
        bulkUploading={bulkUploading}
        bulkResult={bulkResult}
        BULK_LABELS={BULK_LABELS}
        BULK_HEADERS={BULK_HEADERS}
        projects={projects}
        csvInputRef={csvInputRef}
        downloadCsvTemplate={downloadCsvTemplate}
        handleCsvFileUpload={handleCsvFileUpload}
        parseBulkCsv={parseBulkCsv}
        handleBulkImport={handleBulkImport}
      />
    </div>
    </HQLayout>
  );
}