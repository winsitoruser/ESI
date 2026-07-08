import { getDepartmentLabel, getWorkLocationLabel } from './master-data';

/** Team function role → departemen master (kode ENUM) */
export const TEAM_ROLE_TO_DEPARTMENT: Record<string, string> = {
  sales: 'SALES',
  marketing: 'MARKETING',
  ops: 'OPERATIONS',
  finance: 'FINANCE',
  admin: 'ADMINISTRATION',
  manager: 'MANAGEMENT',
  executive: 'MANAGEMENT',
};

/** Work area untuk roster tim (disimpan di team_members.work_area) */
export const HRIS_TEAM_WORK_AREAS = [
  { code: 'FIELD', label: 'Lapangan' },
  { code: 'OFFICE', label: 'Kantor' },
  { code: 'HYBRID', label: 'Hybrid' },
] as const;

const workAreaLabel: Record<string, string> = Object.fromEntries(
  HRIS_TEAM_WORK_AREAS.map((w) => [w.code, w.label])
);

export function getWorkAreaLabel(code?: string | null): string {
  if (!code) return '-';
  return workAreaLabel[code] || code;
}

export function workLocationToWorkArea(workLocation?: string | null): string {
  if (!workLocation) return 'OFFICE';
  if (workLocation === 'FIELD') return 'FIELD';
  if (workLocation === 'REMOTE' || workLocation === 'MULTIPLE') return 'HYBRID';
  return 'OFFICE';
}

export function workAreaToWorkLocation(workArea?: string | null): string {
  if (workArea === 'FIELD') return 'FIELD';
  if (workArea === 'HYBRID') return 'REMOTE';
  return 'ADMIN_OFFICE';
}

export function departmentCodeForTeamRole(role?: string, fallback?: string): string {
  if (role && TEAM_ROLE_TO_DEPARTMENT[role]) return TEAM_ROLE_TO_DEPARTMENT[role];
  return fallback || '';
}

/** Sinkronkan field team member dari record karyawan master */
export function deriveTeamFieldsFromEmployee(
  emp: Record<string, unknown>,
  role?: string
) {
  const departmentCode = (emp.department as string) || departmentCodeForTeamRole(role);
  const workLocation = (emp.work_location as string) || (emp.workLocation as string) || '';
  const branchName = (emp.branch_name as string) || (emp.branchName as string) || '';

  return {
    name: (emp.name as string) || '',
    email: (emp.email as string) || '',
    phone: (emp.phone_number as string) || (emp.phone as string) || '',
    department: departmentCode,
    departmentLabel: getDepartmentLabel(departmentCode),
    location: branchName,
    workArea: workLocationToWorkArea(workLocation),
    workLocation,
    workLocationLabel: getWorkLocationLabel(workLocation),
    employeeUid: (emp.employee_id as string) || (emp.employeeId as string) || '',
    joinDate: (emp.join_date as string) || (emp.joinDate as string) || null,
  };
}

export function serializeTeamMember(member: any, employee?: Record<string, unknown> | null) {
  const base = member?.toJSON ? member.toJSON() : { ...member };
  const linked = employee || null;
  const uid = linked
    ? ((linked.employee_id as string) || (linked.employeeId as string))
    : base.employeeUid || null;

  return {
    ...base,
    employeeId: base.employeeId || base.employee_id || null,
    employeeUid: uid,
    departmentLabel: getDepartmentLabel(base.department),
    workAreaLabel: getWorkAreaLabel(base.workArea || base.work_area),
    linkedEmployee: linked
      ? {
          id: linked.id,
          employee_id: uid,
          name: linked.name,
          position: linked.position,
          department: linked.department,
        }
      : null,
  };
}
