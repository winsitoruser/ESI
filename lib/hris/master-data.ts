/**
 * HRIS master data — sumber tunggal untuk departemen, lokasi kerja, dan label.
 * Dipakai frontend & backend agar UID/dept/posisi/lokasi konsisten.
 */

export interface HrisOption {
  code: string;
  label: string;
}

/** Departemen karyawan (ENUM / kode tersimpan di DB) */
export const HRIS_DEPARTMENTS: HrisOption[] = [
  { code: 'MANAGEMENT', label: 'Manajemen' },
  { code: 'OPERATIONS', label: 'Operasional' },
  { code: 'SALES', label: 'Penjualan' },
  { code: 'FINANCE', label: 'Keuangan' },
  { code: 'ADMINISTRATION', label: 'Administrasi' },
  { code: 'WAREHOUSE', label: 'Gudang' },
  { code: 'CUSTOMER_SERVICE', label: 'Layanan Pelanggan' },
  { code: 'IT', label: 'IT' },
  { code: 'HR', label: 'SDM' },
  { code: 'MARKETING', label: 'Pemasaran' },
  { code: 'LOGISTICS', label: 'Logistik' },
  { code: 'CLINICAL', label: 'Klinis' },
  { code: 'PHARMACY', label: 'Farmasi' },
  { code: 'PRODUCTION', label: 'Produksi' },
];

/** Lokasi kerja (kolom work_location di employees) — disesuaikan ESI pet ecosystem */
export const HRIS_WORK_LOCATIONS: HrisOption[] = [
  { code: 'ADMIN_OFFICE', label: 'Kantor Pusat' },
  { code: 'FIELD', label: 'Lapangan' },
  { code: 'REMOTE', label: 'Remote / WFH' },
  { code: 'PARTNER_SITE', label: 'Lokasi Partner' },
  { code: 'HQ_OFFICE', label: 'Kantor HQ' },
  { code: 'MULTIPLE', label: 'Multi Lokasi' },
];

export const HRIS_DEPARTMENT_CODES = HRIS_DEPARTMENTS.map((d) => d.code);
export const HRIS_WORK_LOCATION_CODES = HRIS_WORK_LOCATIONS.map((w) => w.code);

const deptMap = Object.fromEntries(HRIS_DEPARTMENTS.map((d) => [d.code, d.label]));
const locMap = Object.fromEntries(HRIS_WORK_LOCATIONS.map((w) => [w.code, w.label]));

/** Label/kode wizard & input bebas → kode master (Finance → FINANCE, SDM → HR). */
const DEPARTMENT_INPUT_ALIASES: Record<string, string> = {
  FINANCE: 'FINANCE',
  KEUANGAN: 'FINANCE',
  HR: 'HR',
  SDM: 'HR',
  HUMAN_RESOURCES: 'HR',
  HRD: 'HR',
  OPERATIONS: 'OPERATIONS',
  OPERASIONAL: 'OPERATIONS',
  IT: 'IT',
  SALES: 'SALES',
  PENJUALAN: 'SALES',
  MARKETING: 'MARKETING',
  PEMASARAN: 'MARKETING',
  ADMINISTRATION: 'ADMINISTRATION',
  ADMINISTRASI: 'ADMINISTRATION',
  MANAGEMENT: 'MANAGEMENT',
  MANAJEMEN: 'MANAGEMENT',
  KITCHEN: 'PRODUCTION',
  PRODUCTION: 'PRODUCTION',
  PRODUKSI: 'PRODUCTION',
};

export function slugDepartmentCode(raw: string): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[\s&-]+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
    .slice(0, 50);
}

/** Normalisasi input departemen (kode, label, atau alias wizard) ke { code, label }. */
export function resolveDepartmentOption(raw?: string | null): HrisOption {
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    return { code: 'ADMINISTRATION', label: deptMap.ADMINISTRATION || 'Administrasi' };
  }
  const slug = slugDepartmentCode(trimmed);
  const aliased = DEPARTMENT_INPUT_ALIASES[slug] || slug;
  const known = HRIS_DEPARTMENTS.find((d) => d.code === aliased);
  if (known) return known;
  const byLabel = HRIS_DEPARTMENTS.find((d) => d.label.toLowerCase() === trimmed.toLowerCase());
  if (byLabel) return byLabel;
  return { code: aliased || slug || 'DEPT', label: trimmed };
}

export function getDepartmentLabel(code?: string | null): string {
  if (!code) return '-';
  const resolved = resolveDepartmentOption(code);
  return deptMap[resolved.code] || resolved.label || code;
}

export function getWorkLocationLabel(code?: string | null): string {
  if (!code) return '-';
  return locMap[code] || code;
}

/** Normalisasi field karyawan dari berbagai bentuk API */
export function normalizeEmployeeRecord(emp: Record<string, unknown>) {
  const uid =
    (emp.employee_id as string) ||
    (emp.employeeId as string) ||
    (emp.employee_code as string) ||
    (emp.employeeNumber as string) ||
    '';

  const department = (emp.department as string) || '';
  const position = (emp.position as string) || '';
  const workLocation =
    (emp.work_location as string) || (emp.workLocation as string) || '';
  const branchName =
    (emp.branch_name as string) || (emp.branchName as string) || '';

  return {
    ...emp,
    employee_id: uid,
    employeeId: uid,
    department,
    department_label: getDepartmentLabel(department),
    position,
    work_location: workLocation,
    workLocation,
    work_location_label: getWorkLocationLabel(workLocation),
    branch_name: branchName,
    branchName,
  };
}
