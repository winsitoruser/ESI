/**
 * P4 — automated lifecycle triggers (onboarding, offboarding, e-sign, hire pipeline)
 */
import { createOnboarding, createOffboarding, listOnboarding, listOffboarding, updateOnboarding } from '@/lib/hris/lifecycle-store';
import { createESignDocument, type ESignDocType } from '@/lib/hris/esign-service';
import { getDepartmentLabel } from '@/lib/hris/master-data';

let sequelize: any;
let Employee: any;
try { sequelize = require('../sequelize'); } catch (_) {}
try { Employee = require('../../models/Employee'); } catch (_) {}

const ONBOARDING_TEMPLATE = [
  { key: 'doc_kontrak', label: 'Tanda tangan kontrak kerja', category: 'legal', required: true },
  { key: 'doc_ktp', label: 'Upload KTP & dokumen identitas', category: 'document', required: true },
  { key: 'doc_npwp', label: 'Upload NPWP', category: 'document', required: false },
  { key: 'bank_account', label: 'Informasi rekening bank', category: 'document', required: true },
  { key: 'bpjs_reg', label: 'Registrasi BPJS Kesehatan & Ketenagakerjaan', category: 'benefit', required: true },
  { key: 'email_setup', label: 'Pembuatan akun email & sistem', category: 'it', required: true },
  { key: 'asset_issue', label: 'Serah terima aset kantor (laptop, seragam)', category: 'it', required: true },
  { key: 'training_intro', label: 'Orientasi perusahaan & budaya', category: 'training', required: true },
  { key: 'training_role', label: 'Training peran & tanggung jawab', category: 'training', required: true },
  { key: 'intro_team', label: 'Perkenalan dengan tim & atasan', category: 'general', required: true },
  { key: 'review_30', label: 'Review 30 hari pertama', category: 'review', required: true },
  { key: 'review_90', label: 'Review akhir probasi (90 hari)', category: 'review', required: true },
];

const OFFBOARDING_TEMPLATE = [
  { key: 'resign_letter', label: 'Surat pengunduran diri diterima', category: 'legal', required: true },
  { key: 'exit_interview', label: 'Exit interview dengan HR', category: 'hr', required: true },
  { key: 'handover', label: 'Serah terima pekerjaan & dokumen', category: 'work', required: true },
  { key: 'asset_return', label: 'Pengembalian aset (laptop, seragam, ID)', category: 'it', required: true },
  { key: 'email_deactivate', label: 'Nonaktivasi akun email & sistem', category: 'it', required: true },
  { key: 'access_revoke', label: 'Cabut akses aplikasi & sistem', category: 'it', required: true },
  { key: 'leave_payout', label: 'Penggantian hak & sisa cuti', category: 'finance', required: true },
  { key: 'final_payroll', label: 'Pencairan gaji akhir & THP terakhir', category: 'finance', required: true },
  { key: 'bpjs_closure', label: 'Pelaporan BPJS keluar', category: 'benefit', required: true },
  { key: 'tax_1721', label: 'Penerbitan Bukti Potong 1721-A1', category: 'tax', required: true },
  { key: 'paklaring', label: 'Penerbitan surat keterangan kerja / paklaring', category: 'legal', required: true },
  { key: 'nda_reminder', label: 'Pengingat NDA / klausul kerahasiaan', category: 'legal', required: true },
];

export type LifecycleAutomationResult = {
  onboarding?: unknown;
  offboarding?: unknown;
  employee?: unknown;
  esign?: unknown;
  skipped?: string;
};

/** Normalize Date / ISO / locale strings to YYYY-MM-DD for Postgres date columns. */
export function toDateOnly(value: unknown): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function mapEmployeeRow(emp: any) {
  const row = emp?.toJSON ? emp.toJSON() : emp;
  return {
    id: row.id,
    employeeId: row.employeeId || row.employee_id,
    employeeUid: row.employeeId || row.employee_id || '',
    name: row.name,
    email: row.email,
    position: row.position || '',
    department: row.department || '',
    branchName: row.branchName || row.branch_name || '',
    workLocation: row.workLocation || row.work_location || '',
    joinDate: row.joinDate || row.join_date || row.hire_date,
  };
}

export async function startOnboardingForEmployee(
  employee: ReturnType<typeof mapEmployeeRow>,
  tenantId?: string | null,
): Promise<LifecycleAutomationResult> {
  const employeeId = String(employee.id);
  const existing = await listOnboarding({ tenantId: tenantId || undefined, employeeId });
  const active = existing.find((p) => p.status === 'in_progress');
  if (active) return { onboarding: active, skipped: 'onboarding_already_active' };

  const onboarding = await createOnboarding({
    tenantId,
    employeeId,
    employeeUid: employee.employeeUid || '',
    employeeName: employee.name,
    position: employee.position,
    department: employee.department,
    departmentLabel: getDepartmentLabel(employee.department),
    branchName: employee.branchName,
    workLocation: employee.workLocation,
    joinDate: toDateOnly(employee.joinDate),
    status: 'in_progress',
    tasks: ONBOARDING_TEMPLATE.map((t) => ({ ...t, completed: false })),
    notes: 'Dibuat otomatis saat karyawan terdaftar',
  });
  return { onboarding };
}

export async function startOffboardingForEmployee(
  employee: ReturnType<typeof mapEmployeeRow>,
  tenantId?: string | null,
  opts?: { reason?: string; reasonCategory?: string },
): Promise<LifecycleAutomationResult> {
  const employeeId = String(employee.id);
  const existing = await listOffboarding({ tenantId: tenantId || undefined, employeeId });
  const active = existing.find((p) => p.status === 'in_progress');
  if (active) return { offboarding: active, skipped: 'offboarding_already_active' };

  const offboarding = await createOffboarding({
    tenantId,
    employeeId,
    employeeUid: employee.employeeUid || '',
    employeeName: employee.name,
    position: employee.position,
    department: employee.department,
    departmentLabel: getDepartmentLabel(employee.department),
    branchName: employee.branchName,
    resignDate: new Date().toISOString().slice(0, 10),
    lastWorkingDate: new Date().toISOString().slice(0, 10),
    reason: opts?.reason || 'Offboarding otomatis',
    reasonCategory: opts?.reasonCategory || 'resignation',
    status: 'in_progress',
    tasks: OFFBOARDING_TEMPLATE.map((t) => ({ ...t, completed: false })),
  });
  return { offboarding };
}

export async function handleCandidateHired(
  candidate: any,
  tenantId?: string | null,
): Promise<LifecycleAutomationResult> {
  if (!candidate) return { skipped: 'no_candidate' };

  let employee: any = null;
  const email = candidate.email;
  const name = candidate.full_name || candidate.name;

  if (Employee && email) {
    try {
      const existing = await Employee.findOne({ where: { email, ...(tenantId ? { tenantId } : {}) } });
      if (existing) {
        employee = existing;
      } else {
        const count = await Employee.count({ where: tenantId ? { tenantId } : {} });
        const employeeIdCode = `EMP${String(count + 1).padStart(3, '0')}`;
        let position = '';
        let department = 'ADMINISTRATION';
        if (sequelize && candidate.job_opening_id) {
          const [jobs] = await sequelize.query(
            'SELECT title, department FROM hris_job_openings WHERE id = $1 LIMIT 1',
            { bind: [candidate.job_opening_id] },
          );
          if (jobs?.[0]) {
            position = jobs[0].title || '';
            department = jobs[0].department || department;
          }
        }
        employee = await Employee.create({
          employeeId: employeeIdCode,
          name,
          email,
          phoneNumber: candidate.phone || null,
          position: position || 'Staff',
          department,
          status: 'ACTIVE',
          joinDate: new Date(),
          employmentCategory: 'permanent',
          tenantId: tenantId || null,
        });
      }
    } catch (e) {
      console.warn('[lifecycle-automation] employee create from hire:', (e as Error).message);
    }
  }

  if (employee) {
    const mapped = mapEmployeeRow(employee);
    const result = await startOnboardingForEmployee(mapped, tenantId);
    try {
      const { enrollEmployeeOnHire } = await import('./lms/integrations');
      const lms = await enrollEmployeeOnHire({
        tenantId,
        employeeId: String(mapped.id || employee.id),
        employeeName: name,
      });
      return { ...result, employee: mapped, lms_enrollment: lms };
    } catch (e) {
      console.warn('[lifecycle-automation] LMS hire enroll:', (e as Error).message);
    }
    return { ...result, employee: mapped };
  }

  return { skipped: 'employee_not_created' };
}

function contractDocType(contractType?: string): ESignDocType {
  const t = String(contractType || '').toUpperCase();
  if (t === 'PKWTT') return 'pkwtt';
  if (t === 'PKWT') return 'pkwt';
  return 'pkwt';
}

export async function sendContractToESign(contract: any, signers?: { name: string; email: string; role: string }[]) {
  const title = `Kontrak ${contract.contractType || contract.contract_type || 'PKWT'} — ${contract.contractNumber || contract.contract_number || contract.id}`;
  const defaultSigners = signers?.length
    ? signers
    : [
        { name: contract.employeeName || 'Karyawan', email: contract.employeeEmail || 'employee@company.com', role: 'Karyawan' },
        { name: 'HR Manager', email: 'hr@company.com', role: 'HR' },
      ];

  const doc = await createESignDocument({
    docType: contractDocType(contract.contractType || contract.contract_type),
    title,
    employeeId: String(contract.employeeId || contract.employee_id || ''),
    employeeName: contract.employeeName || contract.employee_name,
    signers: defaultSigners,
  });

  if (doc && sequelize && contract.id) {
    try {
      await sequelize.query(
        'UPDATE employee_contracts SET document_id = $2, updated_at = NOW() WHERE id = $1',
        { bind: [contract.id, doc.id] },
      );
    } catch { /* column may not exist on all envs */ }
  }

  return doc;
}

export async function markOnboardingDocKontrakComplete(employeeId: string) {
  const processes = await listOnboarding({ employeeId: String(employeeId) });
  const proc = processes.find((p) => p.status === 'in_progress');
  if (!proc?.id) return null;

  const tasks = (proc.tasks || []).map((t: any) =>
    t.key === 'doc_kontrak' ? { ...t, completed: true } : t,
  );
  const allRequiredDone = tasks.filter((t: any) => t.required).every((t: any) => t.completed);
  return updateOnboarding(proc.id, {
    tasks,
    status: allRequiredDone ? 'completed' : 'in_progress',
  });
}

export async function createPaklaringOnOffboardingComplete(employee: ReturnType<typeof mapEmployeeRow>) {
  return createESignDocument({
    docType: 'paklaring',
    title: `Paklaring — ${employee.name}`,
    employeeId: String(employee.id),
    employeeName: employee.name,
    signers: [
      { name: employee.name, email: employee.email || 'employee@company.com', role: 'Karyawan' },
      { name: 'HR Manager', email: 'hr@company.com', role: 'HR' },
    ],
  });
}
