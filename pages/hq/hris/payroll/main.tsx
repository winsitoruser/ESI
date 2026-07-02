import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { CanAccess, PageGuard } from '@/components/permissions';
import DocumentExportButton from '@/components/documents/DocumentExportButton';
import * as XLSX from 'xlsx';
import {
  DollarSign, Users, Calculator, FileText, Clock, CheckCircle, XCircle,
  Search, Plus, Eye, Download, Settings, Layers, CreditCard, Banknote,
  Building2, ArrowRight, X, Save, Edit, AlertCircle, RefreshCw,
  ChevronRight, Briefcase, TrendingUp, Wallet, Trash2, ToggleLeft, ToggleRight, Percent, Hash,
  Upload, FileSpreadsheet, UploadCloud, Table2, CheckCircle2, XOctagon, Loader2, Info
} from 'lucide-react';

interface PayrollComponent {
  id: string; code: string; name: string; description?: string; type: string; category: string;
  calculation_type: string; default_amount: number; percentage_base?: string; percentage_value?: number;
  formula?: string; is_taxable: boolean; is_mandatory: boolean; is_active?: boolean;
  applies_to_pay_types?: string[]; applicable_departments?: string[]; sort_order?: number;
}

interface EmployeeSalaryConfig {
  id: string; employee_id: string; employee_name: string; position: string;
  department: string; emp_code?: string; branch_name?: string;
  pay_type: string; base_salary: number; hourly_rate: number; daily_rate: number;
  tax_status: string; bank_name?: string; is_active: boolean;
}

interface PayrollRun {
  id: string; run_code: string; name: string; period_start: string; period_end: string;
  pay_date: string; pay_type: string; total_employees: number;
  total_gross: number; total_deductions: number; total_net: number;
  total_tax: number; status: string;
}

const PAY_TYPES: Record<string, { label: string; desc: string; icon: any }> = {
  monthly: { label: 'Bulanan', desc: 'Gaji per bulan', icon: Banknote },
  daily: { label: 'Harian', desc: 'Gaji per hari kerja', icon: Clock },
  hourly: { label: 'Per Jam', desc: 'Gaji per jam kerja', icon: Clock },
  weekly: { label: 'Mingguan', desc: 'Gaji per minggu', icon: Clock },
};

const RUN_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draf', color: 'bg-gray-100 text-gray-600' },
  calculated: { label: 'Dihitung', color: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Disetujui', color: 'bg-green-100 text-green-700' },
  paid: { label: 'Dibayar', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
};

const fmtCurrency = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

const MOCK_PAYROLL_COMPONENTS: PayrollComponent[] = [
  { id: 'c1', code: 'GAPOK', name: 'Gaji Pokok', type: 'earning', category: 'fixed', calculation_type: 'fixed', default_amount: 0, is_taxable: true, is_mandatory: true, is_active: true, sort_order: 1 },
  { id: 'c2', code: 'TUNJ_JABATAN', name: 'Tunjangan Jabatan', type: 'earning', category: 'fixed', calculation_type: 'fixed', default_amount: 500000, is_taxable: true, is_mandatory: false, is_active: true, sort_order: 2 },
  { id: 'c3', code: 'TUNJ_MAKAN', name: 'Tunjangan Makan', type: 'earning', category: 'fixed', calculation_type: 'fixed', default_amount: 750000, is_taxable: true, is_mandatory: false, is_active: true, sort_order: 3 },
  { id: 'c4', code: 'TUNJ_TRANSPORT', name: 'Tunjangan Transportasi', type: 'earning', category: 'fixed', calculation_type: 'fixed', default_amount: 500000, is_taxable: true, is_mandatory: false, is_active: true, sort_order: 4 },
  { id: 'c5', code: 'BPJS_KES', name: 'BPJS Kesehatan (Karyawan)', type: 'deduction', category: 'statutory', calculation_type: 'percentage', default_amount: 0, percentage_base: 'base_salary', percentage_value: 1, is_taxable: false, is_mandatory: true, is_active: true, sort_order: 5 },
  { id: 'c6', code: 'BPJS_TK', name: 'BPJS Ketenagakerjaan (JHT)', type: 'deduction', category: 'statutory', calculation_type: 'percentage', default_amount: 0, percentage_base: 'base_salary', percentage_value: 2, is_taxable: false, is_mandatory: true, is_active: true, sort_order: 6 },
  { id: 'c7', code: 'PPH21', name: 'PPh 21', type: 'deduction', category: 'tax', calculation_type: 'formula', default_amount: 0, is_taxable: false, is_mandatory: true, is_active: true, sort_order: 7 },
  { id: 'c8', code: 'LEMBUR', name: 'Uang Lembur', type: 'earning', category: 'variable', calculation_type: 'fixed', default_amount: 0, is_taxable: true, is_mandatory: false, is_active: true, sort_order: 8 },
];

const MOCK_SALARIES: EmployeeSalaryConfig[] = [
  { id: 'sal1', employee_id: '1', employee_name: 'Ahmad Wijaya', position: 'General Manager', department: 'MANAGEMENT', emp_code: 'EMP-001', branch_name: 'Kantor Pusat Jakarta', pay_type: 'monthly', base_salary: 25000000, hourly_rate: 0, daily_rate: 0, tax_status: 'K/1', bank_name: 'BCA', is_active: true },
  { id: 'sal2', employee_id: '2', employee_name: 'Siti Rahayu', position: 'Branch Manager', department: 'OPERATIONS', emp_code: 'EMP-002', branch_name: 'Cabang Bandung', pay_type: 'monthly', base_salary: 18000000, hourly_rate: 0, daily_rate: 0, tax_status: 'TK/0', bank_name: 'BCA', is_active: true },
  { id: 'sal3', employee_id: '3', employee_name: 'Budi Santoso', position: 'Branch Manager', department: 'OPERATIONS', emp_code: 'EMP-003', branch_name: 'Cabang Surabaya', pay_type: 'monthly', base_salary: 18000000, hourly_rate: 0, daily_rate: 0, tax_status: 'K/2', bank_name: 'Mandiri', is_active: true },
  { id: 'sal4', employee_id: '5', employee_name: 'Eko Prasetyo', position: 'Warehouse Supervisor', department: 'WAREHOUSE', emp_code: 'EMP-005', branch_name: 'Gudang Pusat Bekasi', pay_type: 'monthly', base_salary: 12000000, hourly_rate: 0, daily_rate: 0, tax_status: 'K/1', bank_name: 'BRI', is_active: true },
  { id: 'sal5', employee_id: '6', employee_name: 'Lisa Permata', position: 'Finance Manager', department: 'FINANCE', emp_code: 'EMP-006', branch_name: 'Kantor Pusat Jakarta', pay_type: 'monthly', base_salary: 20000000, hourly_rate: 0, daily_rate: 0, tax_status: 'TK/0', bank_name: 'BCA', is_active: true },
  { id: 'sal6', employee_id: '12', employee_name: 'Hendra Gunawan', position: 'Warehouse Staff', department: 'WAREHOUSE', emp_code: 'EMP-012', branch_name: 'Gudang Pusat Bekasi', pay_type: 'daily', base_salary: 0, hourly_rate: 0, daily_rate: 150000, tax_status: 'TK/0', bank_name: 'BRI', is_active: true },
];

const MOCK_PAYROLL_RUNS: PayrollRun[] = [
  { id: 'run1', run_code: 'PAY-2026-02', name: 'Payroll Februari 2026', period_start: '2026-02-01', period_end: '2026-02-28', pay_date: '2026-02-28', pay_type: 'monthly', total_employees: 148, total_gross: 1850000000, total_deductions: 370000000, total_net: 1480000000, total_tax: 185000000, status: 'paid' },
  { id: 'run2', run_code: 'PAY-2026-01', name: 'Payroll Januari 2026', period_start: '2026-01-01', period_end: '2026-01-31', pay_date: '2026-01-31', pay_type: 'monthly', total_employees: 145, total_gross: 1790000000, total_deductions: 358000000, total_net: 1432000000, total_tax: 179000000, status: 'paid' },
  { id: 'run3', run_code: 'PAY-2026-03', name: 'Payroll Maret 2026', period_start: '2026-03-01', period_end: '2026-03-31', pay_date: '2026-03-31', pay_type: 'monthly', total_employees: 148, total_gross: 1860000000, total_deductions: 372000000, total_net: 1488000000, total_tax: 186000000, status: 'draft' },
];

const MOCK_PAYROLL_STATS = {
  totalEmployees: 148, totalMonthlyGross: 1860000000, totalMonthlyNet: 1488000000,
  avgSalary: 12567567, highestSalary: 25000000, lowestSalary: 3300000,
  totalComponents: 8, activeComponents: 8,
};

export default function PayrollPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'salaries' | 'runs' | 'components' | 'bulk-upload'>('overview');

  // Data
  const [components, setComponents] = useState<PayrollComponent[]>([]);
  const [salaries, setSalaries] = useState<EmployeeSalaryConfig[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [stats, setStats] = useState<any>({});

  // Modals
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [payslipItems, setPayslipItems] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [editingComponent, setEditingComponent] = useState<PayrollComponent | null>(null);
  const [compForm, setCompForm] = useState({
    code: '', name: '', description: '', type: 'earning' as string, category: 'fixed' as string,
    calculation_type: 'fixed' as string, default_amount: '', percentage_base: 'base_salary',
    percentage_value: '', formula: '', is_taxable: true, is_mandatory: false,
    applies_to_pay_types: ['monthly'] as string[], applicable_departments: [] as string[],
    sort_order: '0', is_active: true
  });

  // Salary form
  const [salaryForm, setSalaryForm] = useState({
    employeeId: '', payType: 'monthly', baseSalary: '', hourlyRate: '', dailyRate: '',
    weeklyHours: '40', overtimeRateMultiplier: '1.5', overtimeHolidayMultiplier: '2.0',
    taxStatus: 'TK/0', taxMethod: 'gross_up', bankName: '', bankAccountNumber: '', bankAccountName: '',
    bpjsKesehatanNumber: '', bpjsKetenagakerjaanNumber: '', npwp: '',
    components: [] as { componentId: string; amount: number; percentage?: number }[]
  });

  // Run form
  const [runForm, setRunForm] = useState({
    periodStart: '', periodEnd: '', payDate: '', payType: 'monthly', name: ''
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDragActive, setUploadDragActive] = useState(false);
  const [uploadStep, setUploadStep] = useState<'select' | 'validating' | 'preview' | 'uploading' | 'done'>('select');
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [uploadSummary, setUploadSummary] = useState<any>({});
  const [uploadProgress, setUploadProgress] = useState(0);

  // Toast
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hq/hris/payroll');
      const json = await res.json();
      if (json.success) {
        setComponents(json.components?.length ? json.components : MOCK_PAYROLL_COMPONENTS);
        setRuns(json.runs?.length ? json.runs : MOCK_PAYROLL_RUNS);
        setStats(json.stats && Object.keys(json.stats).length ? json.stats : MOCK_PAYROLL_STATS);
      } else {
        setComponents(MOCK_PAYROLL_COMPONENTS); setRuns(MOCK_PAYROLL_RUNS); setStats(MOCK_PAYROLL_STATS);
      }
    } catch {
      setComponents(MOCK_PAYROLL_COMPONENTS); setRuns(MOCK_PAYROLL_RUNS); setStats(MOCK_PAYROLL_STATS);
    } finally { setLoading(false); }
  };

  const fetchSalaries = async () => {
    try {
      const res = await fetch('/api/hq/hris/payroll?action=employee-salaries');
      const json = await res.json();
      if (json.success && json.data?.length) setSalaries(json.data);
      else setSalaries(MOCK_SALARIES);
    } catch { setSalaries(MOCK_SALARIES); }
  };

  const fetchRuns = async () => {
    try {
      const res = await fetch('/api/hq/hris/payroll?action=runs');
      const json = await res.json();
      if (json.success && json.data?.length) setRuns(json.data);
      else setRuns(MOCK_PAYROLL_RUNS);
    } catch { setRuns(MOCK_PAYROLL_RUNS); }
  };

  const fetchComponents = async () => {
    try {
      const res = await fetch('/api/hq/hris/payroll?action=components');
      const json = await res.json();
      if (json.success && json.data?.length) setComponents(json.data);
      else setComponents(MOCK_PAYROLL_COMPONENTS);
    } catch { setComponents(MOCK_PAYROLL_COMPONENTS); }
  };

  useEffect(() => { setMounted(true); fetchOverview(); }, []);
  useEffect(() => {
    if (activeTab === 'salaries') fetchSalaries();
    if (activeTab === 'runs') fetchRuns();
    if (activeTab === 'components') fetchComponents();
  }, [activeTab]);

  const openNewComponent = () => {
    setEditingComponent(null);
    setCompForm({
      code: '', name: '', description: '', type: 'earning', category: 'fixed',
      calculation_type: 'fixed', default_amount: '', percentage_base: 'base_salary',
      percentage_value: '', formula: '', is_taxable: true, is_mandatory: false,
      applies_to_pay_types: ['monthly'], applicable_departments: [], sort_order: '0', is_active: true
    });
    setShowComponentModal(true);
  };

  const openEditComponent = (comp: PayrollComponent) => {
    setEditingComponent(comp);
    setCompForm({
      code: comp.code, name: comp.name, description: comp.description || '',
      type: comp.type, category: comp.category, calculation_type: comp.calculation_type,
      default_amount: String(comp.default_amount || ''), percentage_base: comp.percentage_base || 'base_salary',
      percentage_value: String(comp.percentage_value || ''), formula: comp.formula || '',
      is_taxable: comp.is_taxable ?? true, is_mandatory: comp.is_mandatory ?? false,
      applies_to_pay_types: comp.applies_to_pay_types || ['monthly'],
      applicable_departments: comp.applicable_departments || [],
      sort_order: String(comp.sort_order ?? 0), is_active: comp.is_active ?? true
    });
    setShowComponentModal(true);
  };

  const handleSaveComponent = async () => {
    if (!compForm.code || !compForm.name) { showToast('error', 'Kode dan Nama wajib diisi'); return; }
    try {
      const isEdit = !!editingComponent;
      const payload: any = {
        ...compForm,
        default_amount: parseFloat(compForm.default_amount) || 0,
        percentage_value: parseFloat(compForm.percentage_value) || 0,
        sort_order: parseInt(compForm.sort_order) || 0,
      };
      if (isEdit) payload.id = editingComponent!.id;
      const res = await fetch(`/api/hq/hris/payroll?action=component`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', isEdit ? 'Komponen diperbarui' : 'Komponen ditambahkan');
        fetchComponents(); fetchOverview(); setShowComponentModal(false);
      } else showToast('error', json.error || 'Gagal');
    } catch { showToast('error', 'Gagal menyimpan komponen'); }
  };

  const handleDeleteComponent = async (comp: PayrollComponent) => {
    if (!confirm(`Hapus komponen "${comp.name}"?`)) return;
    try {
      const res = await fetch(`/api/hq/hris/payroll?action=component&id=${comp.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { showToast('success', 'Komponen dihapus'); fetchComponents(); fetchOverview(); }
      else showToast('error', json.error || 'Gagal');
    } catch { showToast('error', 'Gagal menghapus'); }
  };

  const togglePayType = (pt: string) => {
    setCompForm(f => ({
      ...f, applies_to_pay_types: f.applies_to_pay_types.includes(pt)
        ? f.applies_to_pay_types.filter(t => t !== pt)
        : [...f.applies_to_pay_types, pt]
    }));
  };

  const toggleDepartment = (dept: string) => {
    setCompForm(f => ({
      ...f, applicable_departments: f.applicable_departments.includes(dept)
        ? f.applicable_departments.filter(d => d !== dept)
        : [...f.applicable_departments, dept]
    }));
  };

  // ===== Bulk Upload Handlers =====
  const PAY_TYPES_VALID = ['monthly', 'daily', 'hourly', 'weekly'];
  const TAX_STATUSES_VALID = ['TK/0','TK/1','TK/2','TK/3','K/0','K/1','K/2','K/3'];

  const HEADER_MAP: Record<string, string> = {
    'Kode Karyawan *': 'employee_id_code', 'Kode Karyawan': 'employee_id_code',
    'Nama Karyawan': 'employee_name', 'Departemen': 'department', 'Jabatan': 'position',
    'Tipe Gaji *': 'pay_type', 'Tipe Gaji': 'pay_type',
    'Gaji Pokok *': 'base_salary', 'Gaji Pokok': 'base_salary',
    'Tarif per Jam': 'hourly_rate', 'Tarif per Hari': 'daily_rate',
    'Jam Kerja/Minggu': 'weekly_hours', 'Multiplier Lembur': 'overtime_multiplier',
    'Multiplier Lembur Libur': 'overtime_holiday_multiplier',
    'Status PTKP *': 'tax_status', 'Status PTKP': 'tax_status',
    'Metode Pajak': 'tax_method', 'Nama Bank': 'bank_name',
    'No. Rekening': 'bank_account_number', 'Atas Nama Rekening': 'bank_account_name',
    'No. BPJS Kesehatan': 'bpjs_kesehatan', 'No. BPJS TK': 'bpjs_ketenagakerjaan',
    'NPWP': 'npwp',
  };

  const parseFileClientSide = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

          // Find header row (contains "Kode Karyawan")
          let headerIdx = -1;
          for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
            const rowStr = rawRows[i].map(String).join(',');
            if (rowStr.includes('Kode Karyawan')) { headerIdx = i; break; }
          }
          if (headerIdx === -1) { resolve([]); return; }

          const headers = rawRows[headerIdx].map((h: any) => String(h || '').trim());

          // Map header labels to keys
          const keyMap = headers.map((h: string) => HEADER_MAP[h] || h);

          // Skip description row if next row contains descriptions
          let dataStart = headerIdx + 1;
          if (dataStart < rawRows.length) {
            const nextRow = rawRows[dataStart].map(String).join(',');
            if (nextRow.includes('Kode unik') || nextRow.includes('wajib') || nextRow.includes('Departemen:')) {
              dataStart++;
            }
          }

          const parsed: any[] = [];
          for (let i = dataStart; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || !row[0] || String(row[0]).trim() === '') continue;
            const obj: any = {};
            keyMap.forEach((key: string, idx: number) => {
              obj[key] = row[idx] != null ? String(row[idx]).trim() : '';
            });
            parsed.push(obj);
          }
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const validateRows = (rows: any[]): any[] => {
    return rows.map((row, i) => {
      const errors: string[] = [];
      const empCode = String(row.employee_id_code || '').trim();
      const payType = String(row.pay_type || 'monthly').trim().toLowerCase();
      const baseSalary = parseFloat(String(row.base_salary || '0').replace(/[^\d.]/g, ''));
      const taxStatus = String(row.tax_status || 'TK/0').trim();

      if (!empCode) errors.push('Kode Karyawan wajib diisi');
      if (!PAY_TYPES_VALID.includes(payType)) errors.push(`Tipe Gaji "${payType}" tidak valid`);
      if (!baseSalary || baseSalary <= 0) errors.push('Gaji Pokok harus > 0');
      if (!TAX_STATUSES_VALID.includes(taxStatus)) errors.push(`Status PTKP "${taxStatus}" tidak valid`);

      return {
        rowNum: i + 1,
        employee_id_code: empCode,
        employee_name: String(row.employee_name || ''),
        department: String(row.department || ''),
        position: String(row.position || ''),
        pay_type: payType,
        base_salary: baseSalary,
        hourly_rate: parseFloat(String(row.hourly_rate || '0').replace(/[^\d.]/g, '')) || 0,
        daily_rate: parseFloat(String(row.daily_rate || '0').replace(/[^\d.]/g, '')) || 0,
        weekly_hours: parseFloat(String(row.weekly_hours || '40').replace(/[^\d.]/g, '')) || 40,
        overtime_multiplier: parseFloat(String(row.overtime_multiplier || '1.5').replace(/[^\d.]/g, '')) || 1.5,
        overtime_holiday_multiplier: parseFloat(String(row.overtime_holiday_multiplier || '2.0').replace(/[^\d.]/g, '')) || 2.0,
        tax_status: taxStatus,
        tax_method: String(row.tax_method || 'gross_up').trim().toLowerCase(),
        bank_name: String(row.bank_name || ''),
        bank_account_number: String(row.bank_account_number || ''),
        bank_account_name: String(row.bank_account_name || ''),
        bpjs_kesehatan: String(row.bpjs_kesehatan || ''),
        bpjs_ketenagakerjaan: String(row.bpjs_ketenagakerjaan || ''),
        npwp: String(row.npwp || ''),
        errors,
        status: errors.length > 0 ? 'error' : 'valid'
      };
    });
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setUploadDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelected(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
  };

  const handleFileSelected = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      showToast('error', 'Format file harus .csv atau .xlsx'); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Ukuran file maksimal 10MB'); return;
    }
    setUploadFile(file);
    setUploadStep('validating');
    setUploadProgress(20);

    try {
      // Client-side parse
      setUploadProgress(40);
      const rawRows = await parseFileClientSide(file);
      setUploadProgress(70);

      if (rawRows.length === 0) {
        showToast('error', 'Tidak ada data ditemukan. Pastikan template diisi dengan benar.');
        setUploadStep('select');
        return;
      }

      // Client-side validation
      const validated = validateRows(rawRows);
      setUploadProgress(100);

      const validCount = validated.filter(r => r.status === 'valid').length;
      const errorCount = validated.filter(r => r.status === 'error').length;

      setUploadResults(validated);
      setUploadSummary({ totalRows: validated.length, validCount, errorCount });
      setUploadStep('preview');
      showToast('success', `${validated.length} baris data berhasil dibaca. ${validCount} valid, ${errorCount} error.`);
    } catch (e: any) {
      console.error('[Payroll Bulk] Parse error:', e);
      showToast('error', 'Gagal membaca file: ' + (e.message || 'Format tidak dikenali'));
      setUploadStep('select');
      setUploadFile(null);
    }
  };

  const handleConfirmUpload = async () => {
    const validRows = uploadResults.filter(r => r.status === 'valid');
    if (validRows.length === 0) { showToast('error', 'Tidak ada data valid untuk disimpan'); return; }
    setUploadStep('uploading');
    setUploadProgress(10);
    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(p => Math.min(p + 3, 85));
      }, 150);
      const res = await fetch('/api/hq/hris/payroll-bulk?action=save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows })
      });
      clearInterval(progressInterval);
      setUploadProgress(95);
      const json = await res.json();

      // Update row statuses based on server response
      if (json.data && Array.isArray(json.data)) {
        setUploadResults(prev => prev.map(r => {
          const serverRow = json.data.find((sr: any) => sr.employee_id_code === r.employee_id_code);
          if (serverRow) return { ...r, status: serverRow.status, errors: serverRow.errors || r.errors };
          return r;
        }));
      }

      setUploadSummary(s => ({ ...s, savedCount: json.savedCount, message: json.message }));
      setUploadProgress(100);
      setUploadStep('done');
      if (json.success) {
        showToast('success', json.message || 'Upload berhasil');
        fetchSalaries();
      } else {
        showToast('error', json.error || 'Ada error saat upload');
      }
    } catch (e) {
      showToast('error', 'Gagal menyimpan data');
      setUploadStep('preview');
    }
  };

  const resetUpload = () => {
    setUploadFile(null);
    setUploadStep('select');
    setUploadResults([]);
    setUploadSummary({});
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveSalary = async () => {
    if (!salaryForm.employeeId || !salaryForm.baseSalary) {
      showToast('error', 'Karyawan dan gaji pokok wajib diisi'); return;
    }
    try {
      const res = await fetch('/api/hq/hris/payroll?action=employee-salary', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...salaryForm,
          baseSalary: parseFloat(salaryForm.baseSalary) || 0,
          hourlyRate: parseFloat(salaryForm.hourlyRate) || 0,
          dailyRate: parseFloat(salaryForm.dailyRate) || 0,
          weeklyHours: parseFloat(salaryForm.weeklyHours) || 40,
          overtimeRateMultiplier: parseFloat(salaryForm.overtimeRateMultiplier) || 1.5,
          overtimeHolidayMultiplier: parseFloat(salaryForm.overtimeHolidayMultiplier) || 2.0,
        })
      });
      const json = await res.json();
      if (json.success) { showToast('success', 'Konfigurasi gaji disimpan'); fetchSalaries(); setShowSalaryModal(false); }
      else showToast('error', json.error || 'Gagal');
    } catch { showToast('error', 'Gagal menyimpan'); }
  };

  const handleCreateRun = async () => {
    if (!runForm.periodStart || !runForm.periodEnd) {
      showToast('error', 'Periode wajib diisi'); return;
    }
    try {
      const res = await fetch('/api/hq/hris/payroll?action=run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(runForm)
      });
      const json = await res.json();
      if (json.success) { showToast('success', 'Proses penggajian dibuat'); fetchRuns(); setShowRunModal(false); }
      else showToast('error', json.error || 'Gagal');
    } catch { showToast('error', 'Gagal membuat proses penggajian'); }
  };

  const handleCalculateRun = async (runId: string) => {
    showToast('success', 'Menghitung penggajian...');
    try {
      const res = await fetch('/api/hq/hris/payroll?action=calculate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId })
      });
      const json = await res.json();
      if (json.success) { showToast('success', json.message || 'Penggajian dihitung'); fetchRuns(); }
      else showToast('error', json.error || 'Gagal');
    } catch { showToast('error', 'Gagal menghitung penggajian'); }
  };

  const handleApproveRun = async (runId: string) => {
    try {
      const res = await fetch('/api/hq/hris/payroll?action=approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId })
      });
      const json = await res.json();
      if (json.success) { showToast('success', 'Penggajian disetujui'); fetchRuns(); }
      else showToast('error', json.error || 'Gagal');
    } catch { showToast('error', 'Gagal menyetujui'); }
  };

  const viewPayslip = async (run: PayrollRun) => {
    setSelectedRun(run);
    try {
      const res = await fetch(`/api/hq/hris/payroll?action=payslip&runId=${run.id}`);
      const json = await res.json();
      setPayslipItems(json.data || []);
    } catch { setPayslipItems([]); }
    setShowPayslipModal(true);
  };

  const filteredSalaries = useMemo(() => {
    if (!searchQuery) return salaries;
    const q = searchQuery.toLowerCase();
    return salaries.filter(s => s.employee_name?.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q));
  }, [salaries, searchQuery]);

  if (!mounted) return null;

  return (
    <PageGuard
      anyPermission={['payroll.view', 'payroll.*', 'employees.*']}
      title="Penggajian Utama (Payroll)"
      description="Jalankan, setujui, dan transfer gaji (modul sangat sensitif)."
    >
    <HQLayout title={t('hris.payrollTitle')} subtitle={t('hris.payrollSubtitle')}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Karyawan', value: stats.totalEmployees || 0, icon: Users, bg: 'bg-blue-100', color: 'text-blue-600', fmt: false },
            { label: 'Gaji Terkonfigurasi', value: stats.configuredSalaries || 0, icon: CreditCard, bg: 'bg-green-100', color: 'text-green-600', fmt: false },
            { label: 'Komponen Gaji', value: stats.totalComponents || 0, icon: Layers, bg: 'bg-purple-100', color: 'text-purple-600', fmt: false },
            { label: 'Total Gaji Bulanan', value: stats.monthlyPayroll || 0, icon: Wallet, bg: 'bg-amber-100', color: 'text-amber-600', fmt: true },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center gap-3">
                <div className={`p-2 ${s.bg} rounded-lg`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                <div>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className={`text-lg font-bold ${s.color}`}>{s.fmt ? fmtCurrency(s.value as number) : s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="flex border-b overflow-x-auto">
            {[
              { key: 'overview', label: 'Ringkasan', icon: TrendingUp },
              { key: 'salaries', label: 'Konfigurasi Gaji', icon: CreditCard },
              { key: 'runs', label: 'Proses Penggajian', icon: Calculator },
              { key: 'components', label: 'Komponen Gaji', icon: Layers },
              { key: 'bulk-upload', label: 'Impor Data', icon: Upload },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>

          {/* ==================== TAB: Overview ==================== */}
          {activeTab === 'overview' && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pay Types Guide */}
                <div className="border rounded-xl p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2"><Briefcase className="w-4 h-4 text-blue-600" /> Tipe Perhitungan Gaji</h3>
                  <div className="space-y-3">
                    {Object.entries(PAY_TYPES).map(([key, pt]) => (
                      <div key={key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="p-1.5 bg-blue-100 rounded"><pt.icon className="w-4 h-4 text-blue-600" /></div>
                        <div>
                          <p className="font-medium text-sm">{pt.label}</p>
                          <p className="text-xs text-gray-500">{pt.desc}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {key === 'hourly' && 'Gaji = Tarif/jam × Jam kerja/minggu × 4.33'}
                            {key === 'daily' && 'Gaji = Tarif/hari × Hari kerja dalam periode'}
                            {key === 'weekly' && 'Gaji = Gaji pokok/minggu × 4.33'}
                            {key === 'monthly' && 'Gaji = Gaji pokok tetap per bulan'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                  <div className="border rounded-xl p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2"><Calculator className="w-4 h-4 text-green-600" /> Aksi Cepat</h3>
                    <div className="space-y-2">
                      <button onClick={() => { setActiveTab('salaries'); }} className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 text-left">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-5 h-5 text-blue-600" />
                          <div><p className="font-medium text-sm">Konfigurasi Gaji</p><p className="text-xs text-gray-500">Atur gaji per karyawan</p></div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                      <button onClick={() => { setActiveTab('runs'); setShowRunModal(true); }} className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 text-left">
                        <div className="flex items-center gap-3">
                          <Calculator className="w-5 h-5 text-green-600" />
                          <div><p className="font-medium text-sm">Proses Penggajian</p><p className="text-xs text-gray-500">Hitung gaji periode baru</p></div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  {/* BPJS Info */}
                  <div className="border rounded-xl p-4">
                    <h3 className="font-semibold mb-2 text-sm">Tarif BPJS & PPh21 (Otomatis)</h3>
                    <div className="space-y-1.5 text-xs text-gray-600">
                      <div className="flex justify-between"><span>BPJS Kesehatan (Karyawan)</span><span className="font-medium">1%</span></div>
                      <div className="flex justify-between"><span>BPJS Kesehatan (Perusahaan)</span><span className="font-medium">4%</span></div>
                      <div className="flex justify-between"><span>BPJS JHT (Karyawan)</span><span className="font-medium">2%</span></div>
                      <div className="flex justify-between"><span>BPJS JHT (Perusahaan)</span><span className="font-medium">3.7%</span></div>
                      <div className="flex justify-between"><span>BPJS JP (Karyawan)</span><span className="font-medium">1%</span></div>
                      <div className="flex justify-between"><span>BPJS JP (Perusahaan)</span><span className="font-medium">2%</span></div>
                      <div className="flex justify-between border-t pt-1.5 mt-1.5"><span>PPh 21</span><span className="font-medium">Progresif 5-35%</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB: Salaries ==================== */}
          {activeTab === 'salaries' && (
            <div>
              <div className="p-4 flex flex-wrap gap-3 justify-between items-center border-b">
                <div className="flex gap-2 items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Cari karyawan..." value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 border rounded-lg text-sm w-52" />
                  </div>
                </div>
                <button onClick={() => setShowSalaryModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Konfigurasi Gaji
                </button>
              </div>

              {salaries.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Belum ada konfigurasi gaji karyawan</p>
                  <p className="text-sm mt-1">Klik tombol "Konfigurasi Gaji" untuk mulai</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tipe</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gaji Pokok</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate/Jam</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate/Hari</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status Pajak</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Bank</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredSalaries.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium">{s.employee_name}</p>
                            <p className="text-xs text-gray-500">{s.position} · {s.department}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                              {PAY_TYPES[s.pay_type]?.label || s.pay_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-sm">{fmtCurrency(s.base_salary)}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">{s.hourly_rate > 0 ? fmtCurrency(s.hourly_rate) : '-'}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">{s.daily_rate > 0 ? fmtCurrency(s.daily_rate) : '-'}</td>
                          <td className="px-4 py-3 text-center text-xs">{s.tax_status}</td>
                          <td className="px-4 py-3 text-center text-xs text-gray-500">{s.bank_name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB: Runs ==================== */}
          {activeTab === 'runs' && (
            <div>
              <div className="p-4 flex justify-between items-center border-b">
                <h3 className="font-semibold">Riwayat Proses Penggajian</h3>
                <button onClick={() => {
                  const now = new Date();
                  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                  const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
                  setRunForm({ periodStart: start, periodEnd: endStr, payDate: endStr, payType: 'monthly', name: '' });
                  setShowRunModal(true);
                }} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                  <Plus className="w-4 h-4" /> Proses Penggajian Baru
                </button>
              </div>

              {runs.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Calculator className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Belum ada proses penggajian</p>
                </div>
              ) : (
                <div className="divide-y">
                  {runs.map(run => {
                    const st = RUN_STATUS[run.status] || RUN_STATUS.draft;
                    return (
                      <div key={run.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{run.name || run.run_code}</p>
                            <p className="text-xs text-gray-500">{run.run_code} · {run.period_start} s/d {run.period_end}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold text-sm">{fmtCurrency(run.total_net)}</p>
                            <p className="text-xs text-gray-500">{run.total_employees} karyawan</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                          <div className="flex gap-1">
                            {run.status === 'draft' && (
                              <CanAccess permission="payroll.run">
                                <button onClick={() => handleCalculateRun(run.id)}
                                  className="px-2.5 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">Hitung</button>
                              </CanAccess>
                            )}
                            {run.status === 'calculated' && (
                              <CanAccess permission="payroll.approve">
                                <button onClick={() => handleApproveRun(run.id)}
                                  className="px-2.5 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">Setujui</button>
                              </CanAccess>
                            )}
                            {['calculated', 'approved', 'paid'].includes(run.status) && (
                              <button onClick={() => viewPayslip(run)}
                                className="px-2.5 py-1 border text-xs rounded hover:bg-gray-50">Slip Gaji</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB: Components ==================== */}
          {activeTab === 'components' && (
            <div>
              <div className="p-4 flex justify-between items-center border-b">
                <div>
                  <h3 className="font-semibold text-lg">Komponen Gaji ({components.length})</h3>
                  <p className="text-sm text-gray-500">Konfigurasi komponen pendapatan dan potongan gaji</p>
                </div>
                <button onClick={openNewComponent}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Tambah Komponen
                </button>
              </div>

              {/* Earnings Section */}
              <div className="p-4">
                <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Pendapatan ({components.filter(c => c.type === 'earning').length})
                </h4>
                <div className="space-y-2">
                  {components.filter(c => c.type === 'earning').map(comp => (
                    <div key={comp.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{comp.name}</p>
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded font-mono">{comp.code}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{comp.description || `${comp.category} · ${comp.calculation_type}`}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] rounded-full border border-green-200">
                              {comp.calculation_type === 'fixed' ? 'Nominal Tetap' : comp.calculation_type === 'percentage' ? `Persentase ${comp.percentage_value || ''}%` : comp.calculation_type === 'per_day' ? 'Per Hari Kerja' : comp.calculation_type === 'formula' ? 'Formula' : comp.calculation_type}
                            </span>
                            {comp.is_taxable && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] rounded-full border border-amber-200">Kena Pajak</span>}
                            {comp.is_mandatory && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded-full border border-blue-200">Wajib</span>}
                            {(comp.applies_to_pay_types || []).map(pt => (
                              <span key={pt} className="px-2 py-0.5 bg-gray-50 text-gray-600 text-[10px] rounded-full border border-gray-200">{PAY_TYPES[pt]?.label || pt}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-green-600">
                            {comp.calculation_type === 'percentage'
                              ? `${comp.percentage_value || 0}%`
                              : comp.default_amount > 0 ? fmtCurrency(comp.default_amount) : '-'}
                          </p>
                          <p className="text-[10px] text-gray-400">Urutan: {comp.sort_order ?? 0}</p>
                          <div className="flex gap-1 mt-1.5 justify-end">
                            <button onClick={() => openEditComponent(comp)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteComponent(comp)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Hapus">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {components.filter(c => c.type === 'earning').length === 0 && (
                    <p className="text-center text-gray-400 py-4 text-sm">Belum ada komponen pendapatan</p>
                  )}
                </div>
              </div>

              {/* Deductions Section */}
              <div className="p-4 pt-0">
                <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Potongan ({components.filter(c => c.type === 'deduction').length})
                </h4>
                <div className="space-y-2">
                  {components.filter(c => c.type === 'deduction').map(comp => (
                    <div key={comp.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{comp.name}</p>
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded font-mono">{comp.code}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{comp.description || `${comp.category} · ${comp.calculation_type}`}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] rounded-full border border-red-200">
                              {comp.calculation_type === 'fixed' ? 'Nominal Tetap' : comp.calculation_type === 'percentage' ? `Persentase ${comp.percentage_value || ''}%` : comp.calculation_type === 'per_day' ? 'Per Hari Kerja' : comp.calculation_type === 'formula' ? 'Formula/Auto' : comp.calculation_type}
                            </span>
                            {comp.is_mandatory && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded-full border border-blue-200">Wajib</span>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-red-600">
                            {comp.calculation_type === 'percentage'
                              ? `${comp.percentage_value || 0}%`
                              : comp.default_amount > 0 ? fmtCurrency(comp.default_amount) : 'Otomatis'}
                          </p>
                          <p className="text-[10px] text-gray-400">Urutan: {comp.sort_order ?? 0}</p>
                          <div className="flex gap-1 mt-1.5 justify-end">
                            <button onClick={() => openEditComponent(comp)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteComponent(comp)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Hapus">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {components.filter(c => c.type === 'deduction').length === 0 && (
                    <p className="text-center text-gray-400 py-4 text-sm">Belum ada komponen potongan</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB: Bulk Upload ==================== */}
          {activeTab === 'bulk-upload' && (
            <div className="p-6 space-y-6">
              {/* Step 1: Download Template + File Selection */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Download Templates */}
                <div className="border rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold">1. Download Template</h3>
                  </div>
                  <p className="text-sm text-gray-500">Download template yang sudah disiapkan, lengkap dengan petunjuk pengisian dan contoh data.</p>
                  <div className="space-y-2">
                    <a href="/api/hq/hris/payroll-bulk?action=template-excel" download
                      className="flex items-center justify-between w-full px-4 py-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                          <FileSpreadsheet className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-green-800">Excel Template (.xlsx)</p>
                          <p className="text-[10px] text-green-600">Dengan dropdown, validasi & 3 sheet panduan</p>
                        </div>
                      </div>
                      <Download className="w-4 h-4 text-green-600" />
                    </a>
                    <a href="/api/hq/hris/payroll-bulk?action=template-csv" download
                      className="flex items-center justify-between w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                          <Table2 className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-blue-800">CSV Template (.csv)</p>
                          <p className="text-[10px] text-blue-600">Format sederhana, bisa dibuka di Notepad/Excel</p>
                        </div>
                      </div>
                      <Download className="w-4 h-4 text-blue-600" />
                    </a>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-[11px] text-amber-800 space-y-1">
                        <p className="font-medium">Template berisi:</p>
                        <p>- 3 sheet: Data Gaji, Petunjuk, Referensi</p>
                        <p>- 5 baris contoh data (bisa dihapus)</p>
                        <p>- Dropdown validasi tipe gaji & PTKP</p>
                        <p>- Keterangan lengkap setiap kolom</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* File Upload Area */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold">2. Upload File</h3>
                  </div>

                  <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} className="hidden" />

                  {/* Drop zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setUploadDragActive(true); }}
                    onDragLeave={() => setUploadDragActive(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      uploadDragActive ? 'border-blue-500 bg-blue-50' :
                      uploadFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
                  >
                    {!uploadFile ? (
                      <>
                        <UploadCloud className={`w-12 h-12 mx-auto mb-3 ${uploadDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                        <p className="text-sm font-medium text-gray-700">
                          {uploadDragActive ? 'Lepaskan file di sini...' : 'Drag & drop file di sini'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">atau klik untuk memilih file</p>
                        <p className="text-[10px] text-gray-400 mt-2">Format: .csv, .xlsx, .xls (maks 10MB)</p>
                      </>
                    ) : (
                      <div className="flex items-center justify-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          uploadFile.name.endsWith('.csv') ? 'bg-blue-100' : 'bg-green-100'}`}>
                          {uploadFile.name.endsWith('.csv')
                            ? <Table2 className="w-6 h-6 text-blue-600" />
                            : <FileSpreadsheet className="w-6 h-6 text-green-600" />}
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-sm">{uploadFile.name}</p>
                          <p className="text-xs text-gray-500">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); resetUpload(); }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>

                  {/* Action buttons - file is now auto-parsed on select, so only show reset */}
                  {uploadFile && uploadStep === 'select' && (
                    <div className="flex gap-3">
                      <button onClick={resetUpload}
                        className="px-4 py-3 border rounded-lg hover:bg-gray-50 text-sm">Reset</button>
                    </div>
                  )}

                  {/* Progress bar */}
                  {(uploadStep === 'validating' || uploadStep === 'uploading') && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        <p className="text-sm font-medium">{uploadStep === 'validating' ? 'Memvalidasi data...' : 'Mengupload dan menyimpan...'}</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 text-right">{uploadProgress}%</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Preview Results */}
              {(uploadStep === 'preview' || uploadStep === 'done') && uploadResults.length > 0 && (
                <div className="border rounded-xl overflow-hidden">
                  {/* Summary Bar */}
                  <div className={`px-4 py-3 flex items-center justify-between ${
                    uploadStep === 'done' ? 'bg-green-50' : uploadSummary.errorCount > 0 ? 'bg-amber-50' : 'bg-blue-50'}`}>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Table2 className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium">{uploadSummary.totalRows || 0} baris data</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700 font-medium">{uploadSummary.validCount || 0} valid</span>
                      </div>
                      {(uploadSummary.errorCount || 0) > 0 && (
                        <div className="flex items-center gap-1.5">
                          <XOctagon className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-red-700 font-medium">{uploadSummary.errorCount} error</span>
                        </div>
                      )}
                      {uploadStep === 'done' && uploadSummary.savedCount !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <Save className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-blue-700 font-medium">{uploadSummary.savedCount} tersimpan</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {uploadStep === 'preview' && (uploadSummary.errorCount || 0) === 0 && (
                        <button onClick={handleConfirmUpload}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium">
                          <Upload className="w-4 h-4" /> Konfirmasi & Simpan ({uploadSummary.validCount} data)
                        </button>
                      )}
                      {uploadStep === 'preview' && (uploadSummary.errorCount || 0) > 0 && (
                        <p className="text-sm text-red-600 font-medium flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" /> Perbaiki error terlebih dahulu
                        </p>
                      )}
                      <button onClick={resetUpload}
                        className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
                        {uploadStep === 'done' ? 'Unggah Lagi' : 'Reset'}
                      </button>
                    </div>
                  </div>

                  {/* Data Table */}
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-10">#</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-16">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Kode</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nama</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Tipe</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Gaji Pokok</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Rate/Jam</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Rate/Hari</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">PTKP</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Pajak</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Bank</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 min-w-[200px]">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {uploadResults.map((row, i) => (
                          <tr key={i} className={`${
                            row.status === 'error' ? 'bg-red-50' :
                            row.status === 'saved' ? 'bg-green-50' :
                            row.status === 'valid' ? 'bg-white' : 'bg-white'} hover:bg-gray-50/50`}>
                            <td className="px-3 py-2 text-xs text-gray-400">{row.rowNum}</td>
                            <td className="px-3 py-2 text-center">
                              {row.status === 'valid' && <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />}
                              {row.status === 'saved' && <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />}
                              {row.status === 'error' && <XOctagon className="w-4 h-4 text-red-500 mx-auto" />}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">{row.employee_id_code}</td>
                            <td className="px-3 py-2 text-xs font-medium">{row.employee_name || '-'}</td>
                            <td className="px-3 py-2 text-center">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full">{row.pay_type}</span>
                            </td>
                            <td className="px-3 py-2 text-right text-xs font-medium">{fmtCurrency(row.base_salary)}</td>
                            <td className="px-3 py-2 text-right text-xs text-gray-500">{row.hourly_rate > 0 ? fmtCurrency(row.hourly_rate) : '-'}</td>
                            <td className="px-3 py-2 text-right text-xs text-gray-500">{row.daily_rate > 0 ? fmtCurrency(row.daily_rate) : '-'}</td>
                            <td className="px-3 py-2 text-center text-xs">{row.tax_status}</td>
                            <td className="px-3 py-2 text-center text-xs">{row.tax_method}</td>
                            <td className="px-3 py-2 text-xs text-gray-500">{row.bank_name || '-'}</td>
                            <td className="px-3 py-2">
                              {row.errors && row.errors.length > 0 && (
                                <div className="space-y-0.5">
                                  {row.errors.map((err: string, j: number) => (
                                    <p key={j} className="text-[10px] text-red-600 flex items-start gap-1">
                                      <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {err}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Done message */}
              {uploadStep === 'done' && uploadSummary.message && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800">{uploadSummary.message}</p>
                    <p className="text-sm text-green-600 mt-0.5">Data gaji karyawan berhasil diperbarui. Lihat di tab Konfigurasi Gaji.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==================== SALARY CONFIG MODAL ==================== */}
      {showSalaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">Konfigurasi Gaji Karyawan</h3>
              <button onClick={() => setShowSalaryModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Karyawan *</label>
                <input type="text" value={salaryForm.employeeId} onChange={e => setSalaryForm(f => ({ ...f, employeeId: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="UUID karyawan" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Perhitungan Gaji *</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(PAY_TYPES).map(([key, pt]) => (
                    <button key={key} onClick={() => setSalaryForm(f => ({ ...f, payType: key }))}
                      className={`p-3 border rounded-lg text-center text-sm transition-all ${
                        salaryForm.payType === key ? 'border-blue-600 bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}>
                      <pt.icon className="w-5 h-5 mx-auto mb-1" />
                      <p className="font-medium">{pt.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {salaryForm.payType === 'monthly' ? 'Gaji Pokok/Bulan' :
                     salaryForm.payType === 'weekly' ? 'Gaji Pokok/Minggu' : 'Gaji Pokok'} *
                  </label>
                  <input type="number" value={salaryForm.baseSalary} onChange={e => setSalaryForm(f => ({ ...f, baseSalary: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="5000000" />
                </div>
                {salaryForm.payType === 'hourly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tarif per Jam</label>
                    <input type="number" value={salaryForm.hourlyRate} onChange={e => setSalaryForm(f => ({ ...f, hourlyRate: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="30000" />
                  </div>
                )}
                {salaryForm.payType === 'daily' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tarif per Hari</label>
                    <input type="number" value={salaryForm.dailyRate} onChange={e => setSalaryForm(f => ({ ...f, dailyRate: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="200000" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jam Kerja/Minggu</label>
                  <input type="number" value={salaryForm.weeklyHours} onChange={e => setSalaryForm(f => ({ ...f, weeklyHours: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status Pajak (PTKP)</label>
                  <select value={salaryForm.taxStatus} onChange={e => setSalaryForm(f => ({ ...f, taxStatus: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    {['TK/0','TK/1','TK/2','TK/3','K/0','K/1','K/2','K/3'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Metode Pajak</label>
                  <select value={salaryForm.taxMethod} onChange={e => setSalaryForm(f => ({ ...f, taxMethod: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="gross">Gross (potong gaji)</option>
                    <option value="gross_up">Gross Up (ditanggung perusahaan)</option>
                    <option value="nett">Nett (pajak ditanggung perusahaan)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                  <input type="text" value={salaryForm.bankName} onChange={e => setSalaryForm(f => ({ ...f, bankName: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="BCA" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No. Rekening</label>
                  <input type="text" value={salaryForm.bankAccountNumber} onChange={e => setSalaryForm(f => ({ ...f, bankAccountNumber: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Atas Nama</label>
                  <input type="text" value={salaryForm.bankAccountName} onChange={e => setSalaryForm(f => ({ ...f, bankAccountName: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NPWP</label>
                  <input type="text" value={salaryForm.npwp} onChange={e => setSalaryForm(f => ({ ...f, npwp: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="00.000.000.0-000.000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pengali Lembur</label>
                  <input type="number" value={salaryForm.overtimeRateMultiplier} onChange={e => setSalaryForm(f => ({ ...f, overtimeRateMultiplier: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" step="0.1" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowSalaryModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Batal</button>
              <button onClick={handleSaveSalary} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
                <Save className="w-4 h-4" /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== RUN MODAL ==================== */}
      {showRunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg m-4">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Buat Proses Penggajian Baru</h3>
              <button onClick={() => setShowRunModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama (opsional)</label>
                <input type="text" value={runForm.name} onChange={e => setRunForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Penggajian Februari 2026" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Periode Awal *</label>
                  <input type="date" value={runForm.periodStart} onChange={e => setRunForm(f => ({ ...f, periodStart: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Periode Akhir *</label>
                  <input type="date" value={runForm.periodEnd} onChange={e => setRunForm(f => ({ ...f, periodEnd: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Bayar</label>
                  <input type="date" value={runForm.payDate} onChange={e => setRunForm(f => ({ ...f, payDate: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
                  <select value={runForm.payType} onChange={e => setRunForm(f => ({ ...f, payType: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    {Object.entries(PAY_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowRunModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Batal</button>
              <CanAccess permission="payroll.run">
                <button onClick={handleCreateRun} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-2">
                  <Calculator className="w-4 h-4" /> Buat Draf
                </button>
              </CanAccess>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PAYSLIP MODAL ==================== */}
      {showPayslipModal && selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-semibold">Slip Gaji - {selectedRun.name || selectedRun.run_code}</h3>
                <p className="text-xs text-gray-500">{selectedRun.period_start} s/d {selectedRun.period_end} · {payslipItems.length} karyawan</p>
              </div>
              <div className="flex items-center gap-2">
                <DocumentExportButton
                  documentType="payroll-summary"
                  variant="button"
                  size="sm"
                  label="Rekap"
                  data={{ items: payslipItems.map((item: any) => ({ employeeId: item.employee_code || item.employee_id, employeeName: item.employee_name, position: item.employee_position, department: item.department, baseSalary: parseFloat(item.base_salary || 0), allowances: parseFloat(item.total_earnings || 0) - parseFloat(item.base_salary || 0), deductions: parseFloat(item.total_deductions || 0), tax: parseFloat(item.tax_amount || 0), netPay: parseFloat(item.net_salary || 0) })) }}
                  meta={{ period: `${selectedRun.period_start} - ${selectedRun.period_end}`, documentNumber: selectedRun.run_code }}
                  showFormats={['excel']}
                />
                <button onClick={() => setShowPayslipModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="divide-y">
              {payslipItems.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Belum ada data slip gaji</div>
              ) : (
                payslipItems.map((item: any) => {
                  const earnings = typeof item.earnings === 'string' ? JSON.parse(item.earnings) : (item.earnings || []);
                  const deductions = typeof item.deductions === 'string' ? JSON.parse(item.deductions) : (item.deductions || []);
                  return (
                    <div key={item.id} className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold">{item.employee_name}</p>
                          <p className="text-xs text-gray-500">{item.employee_position} · {item.department} · {PAY_TYPES[item.pay_type]?.label}</p>
                        </div>
                        <div className="text-right flex items-start gap-2">
                          <div>
                            <p className="text-lg font-bold text-green-600">{fmtCurrency(parseFloat(item.net_salary))}</p>
                            <p className="text-xs text-gray-500">Gaji Bersih</p>
                          </div>
                          <DocumentExportButton
                            documentType="payslip"
                            variant="icon"
                            data={{
                              employeeName: item.employee_name,
                              employeeId: item.employee_code || item.employee_id,
                              position: item.employee_position,
                              department: item.department,
                              employmentStatus: PAY_TYPES[item.pay_type]?.label || item.pay_type,
                              period: `${selectedRun.period_start} s/d ${selectedRun.period_end}`,
                              earnings: typeof item.earnings === 'string' ? JSON.parse(item.earnings) : (item.earnings || []),
                              deductions: typeof item.deductions === 'string' ? JSON.parse(item.deductions) : (item.deductions || []),
                              totalEarnings: parseFloat(item.total_earnings || 0),
                              totalDeductions: parseFloat(item.total_deductions || 0),
                              netPay: parseFloat(item.net_salary || 0),
                            }}
                            meta={{ documentNumber: `PSL-${selectedRun.run_code}-${item.employee_code || item.employee_id}`, period: `${selectedRun.period_start} - ${selectedRun.period_end}` }}
                            showFormats={['pdf']}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="font-medium text-green-600 mb-1">Pendapatan</p>
                          {earnings.map((e: any, i: number) => (
                            <div key={i} className="flex justify-between py-0.5"><span>{e.name}</span><span>{fmtCurrency(e.amount)}</span></div>
                          ))}
                          <div className="flex justify-between pt-1 mt-1 border-t font-semibold">
                            <span>Total</span><span>{fmtCurrency(parseFloat(item.total_earnings))}</span>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-red-600 mb-1">Potongan</p>
                          {deductions.map((d: any, i: number) => (
                            <div key={i} className="flex justify-between py-0.5"><span>{d.name}</span><span>{fmtCurrency(d.amount)}</span></div>
                          ))}
                          <div className="flex justify-between pt-1 mt-1 border-t font-semibold">
                            <span>Total</span><span>{fmtCurrency(parseFloat(item.total_deductions))}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== COMPONENT CONFIG MODAL ==================== */}
      {showComponentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">{editingComponent ? 'Edit' : 'Tambah'} Komponen Gaji</h3>
              <button onClick={() => setShowComponentModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kode Komponen *</label>
                  <input type="text" value={compForm.code}
                    onChange={e => setCompForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono" placeholder="TRANSPORT" disabled={!!editingComponent} />
                  {editingComponent && <p className="text-[10px] text-gray-400 mt-0.5">Kode tidak dapat diubah</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Komponen *</label>
                  <input type="text" value={compForm.name} onChange={e => setCompForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Tunjangan Transportasi" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <input type="text" value={compForm.description} onChange={e => setCompForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Deskripsi singkat komponen" />
                </div>
              </div>

              {/* Type & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Komponen *</label>
                  <div className="flex gap-2">
                    <button onClick={() => setCompForm(f => ({ ...f, type: 'earning' }))}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                        compForm.type === 'earning' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300'}`}>
                      <TrendingUp className="w-4 h-4 mx-auto mb-0.5" /> Pendapatan
                    </button>
                    <button onClick={() => setCompForm(f => ({ ...f, type: 'deduction' }))}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                        compForm.type === 'deduction' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 hover:border-gray-300'}`}>
                      <DollarSign className="w-4 h-4 mx-auto mb-0.5" /> Potongan
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                  <select value={compForm.category} onChange={e => setCompForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="fixed">Tetap (Fixed)</option>
                    <option value="variable">Variabel</option>
                    <option value="calculated">Otomatis (Calculated)</option>
                    <option value="daily">Harian</option>
                    <option value="annual">Tahunan</option>
                  </select>
                </div>
              </div>

              {/* Calculation Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Metode Perhitungan *</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'fixed', label: 'Nominal Tetap', icon: Hash, desc: 'Jumlah tetap per periode' },
                    { key: 'percentage', label: 'Persentase', icon: Percent, desc: '% dari basis tertentu' },
                    { key: 'per_day', label: 'Per Hari Kerja', icon: Clock, desc: 'Nominal × hari kerja' },
                    { key: 'formula', label: 'Formula', icon: Calculator, desc: 'Rumus kustom' },
                  ].map(m => (
                    <button key={m.key} onClick={() => setCompForm(f => ({ ...f, calculation_type: m.key }))}
                      className={`p-2.5 rounded-lg border-2 text-center transition-all ${
                        compForm.calculation_type === m.key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}>
                      <m.icon className="w-4 h-4 mx-auto mb-1" />
                      <p className="text-xs font-medium">{m.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount / Percentage / Formula based on calculation type */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nilai & Bobot</p>
                {compForm.calculation_type === 'fixed' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nominal Default (Rp)</label>
                    <input type="number" value={compForm.default_amount} onChange={e => setCompForm(f => ({ ...f, default_amount: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="500000" />
                    <p className="text-[10px] text-gray-400 mt-0.5">Bisa di-override per karyawan saat assign komponen</p>
                  </div>
                )}
                {compForm.calculation_type === 'percentage' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Basis Perhitungan</label>
                      <select value={compForm.percentage_base} onChange={e => setCompForm(f => ({ ...f, percentage_base: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="base_salary">Gaji Pokok</option>
                        <option value="gross_salary">Gaji Kotor</option>
                        <option value="total_earnings">Total Pendapatan</option>
                        <option value="fixed_amount">Jumlah Tetap</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Persentase (%)</label>
                      <input type="number" step="0.01" value={compForm.percentage_value}
                        onChange={e => setCompForm(f => ({ ...f, percentage_value: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="5.0" />
                    </div>
                  </div>
                )}
                {compForm.calculation_type === 'per_day' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nominal per Hari (Rp)</label>
                    <input type="number" value={compForm.default_amount} onChange={e => setCompForm(f => ({ ...f, default_amount: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="35000" />
                    <p className="text-[10px] text-gray-400 mt-0.5">Total = Nominal × Hari kerja aktual dalam periode</p>
                  </div>
                )}
                {compForm.calculation_type === 'formula' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Formula</label>
                    <textarea value={compForm.formula} onChange={e => setCompForm(f => ({ ...f, formula: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm font-mono" rows={2}
                      placeholder="base_salary * overtime_hours * overtime_multiplier / 173" />
                    <p className="text-[10px] text-gray-400 mt-0.5">Variabel: base_salary, gross_salary, working_days, overtime_hours, overtime_multiplier</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Urutan Perhitungan</label>
                  <input type="number" value={compForm.sort_order} onChange={e => setCompForm(f => ({ ...f, sort_order: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" min={0} />
                  <p className="text-[10px] text-gray-400 mt-0.5">Menentukan urutan perhitungan (semakin kecil, semakin dulu dihitung)</p>
                </div>
              </div>

              {/* Flags */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pengaturan</p>
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => setCompForm(f => ({ ...f, is_taxable: !f.is_taxable }))}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      compForm.is_taxable ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}>
                    {compForm.is_taxable ? <ToggleRight className="w-5 h-5 text-amber-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                    <div className="text-left">
                      <p className="text-xs font-medium">Kena Pajak</p>
                      <p className="text-[10px] text-gray-500">{compForm.is_taxable ? 'Ya' : 'Tidak'}</p>
                    </div>
                  </button>
                  <button onClick={() => setCompForm(f => ({ ...f, is_mandatory: !f.is_mandatory }))}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      compForm.is_mandatory ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                    {compForm.is_mandatory ? <ToggleRight className="w-5 h-5 text-blue-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                    <div className="text-left">
                      <p className="text-xs font-medium">Wajib</p>
                      <p className="text-[10px] text-gray-500">{compForm.is_mandatory ? 'Auto-apply' : 'Opsional'}</p>
                    </div>
                  </button>
                  <button onClick={() => setCompForm(f => ({ ...f, is_active: !f.is_active }))}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      compForm.is_active ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                    {compForm.is_active ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                    <div className="text-left">
                      <p className="text-xs font-medium">Aktif</p>
                      <p className="text-[10px] text-gray-500">{compForm.is_active ? 'Aktif' : 'Nonaktif'}</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Applicable Pay Types */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Berlaku untuk Tipe Gaji</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PAY_TYPES).map(([key, pt]) => (
                    <button key={key} onClick={() => togglePayType(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        compForm.applies_to_pay_types.includes(key)
                          ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {pt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Applicable Departments */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Berlaku untuk Departemen <span className="font-normal text-gray-400">(kosong = semua)</span></p>
                <div className="flex flex-wrap gap-1.5">
                  {['MANAGEMENT','OPERATIONS','SALES','FINANCE','ADMINISTRATION','WAREHOUSE','KITCHEN','CUSTOMER_SERVICE','IT','HR'].map(d => (
                    <button key={d} onClick={() => toggleDepartment(d)}
                      className={`px-2.5 py-1 rounded text-[10px] font-medium border transition-all ${
                        compForm.applicable_departments.includes(d)
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowComponentModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Batal</button>
              <button onClick={handleSaveComponent}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
                <Save className="w-4 h-4" /> {editingComponent ? 'Perbarui' : 'Simpan'}
              </button>
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
    </PageGuard>
  );
}
