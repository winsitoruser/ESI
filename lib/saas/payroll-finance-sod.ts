/**
 * Payroll segregation of duties — approve / paid require Finance (or Owner / platform).
 * HR Admin may calculate/create runs but cannot approve or mark paid without Finance role.
 */
const PAYROLL_FINANCE_ROLES = new Set([
  'finance_staff',
  'finance',
  'owner',
  'super_admin',
  'superadmin',
  'platform_admin',
]);

export function canPayrollFinanceAction(role: string | null | undefined): boolean {
  return PAYROLL_FINANCE_ROLES.has(String(role || '').trim().toLowerCase());
}

export function payrollFinanceDeniedPayload(action: 'approve' | 'paid' | 'released') {
  return {
    success: false,
    error: 'FINANCE_SOD_REQUIRED',
    message:
      action === 'approve'
        ? 'Persetujuan payroll hanya untuk peran Finance atau Owner.'
        : 'Menandai payroll sebagai dibayar hanya untuk peran Finance atau Owner.',
    action,
  };
}
