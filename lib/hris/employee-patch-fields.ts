/**
 * Allowlisted employee PATCH fields. Ownership, role, and tenant never come from the client.
 */
export const EMPLOYEE_PATCH_BLOCKED = new Set([
  'id',
  'employeeId',
  'employee_id',
  'employee_code',
  'password',
  'tenantId',
  'tenant_id',
  'companyId',
  'company_id',
  'role',
  'work_role',
  'workRole',
  'originalRole',
  'is_super_admin',
  'isSuperAdmin',
]);

export const EMPLOYEE_PATCH_ALLOWED = new Set([
  'name',
  'email',
  'phone',
  'phoneNumber',
  'position',
  'department',
  'workLocation',
  'work_location',
  'employmentCategory',
  'employment_category',
  'contractType',
  'contract_type',
  'status',
  'isActive',
  'is_active',
  'branchId',
  'branch_id',
  'managerId',
  'manager_id',
  'avatar',
]);

export function pickEmployeePatch(body: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!body || typeof body !== 'object') return out;
  for (const [key, value] of Object.entries(body)) {
    if (EMPLOYEE_PATCH_BLOCKED.has(key)) continue;
    if (!EMPLOYEE_PATCH_ALLOWED.has(key)) continue;
    out[key] = value;
  }
  return out;
}
