/**
 * Offboarding final settlement — penggantian hak, sisa cuti, THP terakhir, pesangon
 */

export interface SettlementInput {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  joinDate?: string;
  lastWorkingDate: string;
  resignDate: string;
  reasonCategory: 'resignation' | 'termination' | 'retirement' | 'contract_end' | 'other';
  remainingLeaveDays?: number;
  unpaidOvertimeHours?: number;
  loanBalance?: number;
  cashAdvanceBalance?: number;
}

export interface SettlementBreakdown {
  finalSalary: number;
  leavePayout: number;
  overtimePayout: number;
  severancePay: number;
  longServicePay: number;
  compensationPay: number;
  totalEarnings: number;
  loanDeduction: number;
  cashAdvanceDeduction: number;
  bpjsDeduction: number;
  taxDeduction: number;
  totalDeductions: number;
  netSettlement: number;
  workingDaysInMonth: number;
  daysWorked: number;
  tenureYears: number;
  notes: string[];
}

const WORKING_DAYS_MONTH = 22;

export function calcTenureYears(joinDate: string, lastWorkingDate: string): number {
  const start = new Date(joinDate);
  const end = new Date(lastWorkingDate);
  return Math.max(0, (end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

/** UU 13/2003 simplified severance for PHK */
export function calcSeverance(baseSalary: number, tenureYears: number, reasonCategory: string): {
  severance: number; longService: number; compensation: number;
} {
  if (reasonCategory === 'resignation') {
    return { severance: 0, longService: 0, compensation: 0 };
  }
  const months = Math.floor(tenureYears * 12);
  let severanceMonths = 1;
  if (months >= 36) severanceMonths = 3;
  else if (months >= 24) severanceMonths = 2;

  const severance = baseSalary * severanceMonths;
  const longService = tenureYears >= 3 ? baseSalary * Math.min(Math.floor(tenureYears - 2), 10) : 0;
  const compensation = reasonCategory === 'termination' ? baseSalary : 0;

  return { severance, longService, compensation };
}

export function calculateFinalSettlement(input: SettlementInput): SettlementBreakdown {
  const dailyRate = input.baseSalary / WORKING_DAYS_MONTH;
  const lastDay = new Date(input.lastWorkingDate);
  const daysWorked = Math.min(lastDay.getDate(), WORKING_DAYS_MONTH);
  const finalSalary = Math.round(dailyRate * daysWorked);

  const leaveDays = input.remainingLeaveDays ?? 0;
  const leavePayout = Math.round(dailyRate * leaveDays);

  const otRate = (input.baseSalary / 173) * 1.5;
  const overtimePayout = Math.round(otRate * (input.unpaidOvertimeHours ?? 0));

  const tenureYears = input.joinDate
    ? calcTenureYears(input.joinDate, input.lastWorkingDate)
    : 0;
  const { severance, longService, compensation } = calcSeverance(
    input.baseSalary, tenureYears, input.reasonCategory
  );

  const totalEarnings = finalSalary + leavePayout + overtimePayout + severance + longService + compensation;
  const loanDeduction = input.loanBalance ?? 0;
  const cashAdvanceDeduction = input.cashAdvanceBalance ?? 0;
  const bpjsDeduction = Math.round(input.baseSalary * 0.02);
  const taxDeduction = Math.round(totalEarnings * 0.05);
  const totalDeductions = loanDeduction + cashAdvanceDeduction + bpjsDeduction + taxDeduction;
  const netSettlement = totalEarnings - totalDeductions;

  const notes: string[] = [];
  if (leaveDays > 0) notes.push(`Penggantian ${leaveDays} hari cuti belum diambil`);
  if (severance > 0) notes.push(`Uang pesangon: ${severanceMonthsLabel(tenureYears)}`);
  if (input.reasonCategory === 'resignation') notes.push('Resign sukarela — tidak ada pesangon (UU 13/2003)');

  return {
    finalSalary,
    leavePayout,
    overtimePayout,
    severancePay: severance,
    longServicePay: longService,
    compensationPay: compensation,
    totalEarnings,
    loanDeduction,
    cashAdvanceDeduction,
    bpjsDeduction,
    taxDeduction,
    totalDeductions,
    netSettlement,
    workingDaysInMonth: WORKING_DAYS_MONTH,
    daysWorked,
    tenureYears: Math.round(tenureYears * 10) / 10,
    notes,
  };
}

function severanceMonthsLabel(tenureYears: number): string {
  const months = Math.floor(tenureYears * 12);
  if (months >= 36) return '3× upah';
  if (months >= 24) return '2× upah';
  return '1× upah';
}

export function settlementToPayrollComponents(settlement: SettlementBreakdown) {
  return [
    { code: 'FINAL_SALARY', name: 'Gaji Proporsional', amount: settlement.finalSalary, type: 'earning' },
    { code: 'LEAVE_PAYOUT', name: 'Penggantian Cuti', amount: settlement.leavePayout, type: 'earning' },
    { code: 'OVERTIME_FINAL', name: 'Lembur Outstanding', amount: settlement.overtimePayout, type: 'earning' },
    { code: 'SEVERANCE', name: 'Uang Pesangon', amount: settlement.severancePay, type: 'earning' },
    { code: 'LONG_SERVICE', name: 'Uang Penghargaan Masa Kerja', amount: settlement.longServicePay, type: 'earning' },
    { code: 'COMPENSATION', name: 'Uang Pengganti Hak', amount: settlement.compensationPay, type: 'earning' },
    { code: 'LOAN_DEDUCT', name: 'Potongan Pinjaman', amount: -settlement.loanDeduction, type: 'deduction' },
    { code: 'CASH_ADV_DEDUCT', name: 'Potongan Kasbon', amount: -settlement.cashAdvanceDeduction, type: 'deduction' },
    { code: 'BPJS_DEDUCT', name: 'Potongan BPJS', amount: -settlement.bpjsDeduction, type: 'deduction' },
    { code: 'TAX_FINAL', name: 'PPh 21 Final', amount: -settlement.taxDeduction, type: 'deduction' },
  ].filter(c => Math.abs(c.amount) > 0);
}
