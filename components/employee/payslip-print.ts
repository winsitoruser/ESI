import {
  DEFAULT_PAYSLIP_LAYOUT,
  renderPayslipHtml,
  type PayslipLayoutId,
} from '@/lib/hris/payslip-templates';

/** Print / download ESS payslip (ESS-S2-1). Uses browser print stylesheet; gate = row already from released payroll API. */
export function printPayslipHtml(
  ps: {
    period_start?: string;
    period_end?: string;
    run_code?: string;
    pay_date?: string;
    net_salary?: number;
    total_earnings?: number;
    total_deductions?: number;
    tax_amount?: number;
    earnings?: Array<{ name?: string; label?: string; amount?: number }>;
    deductions?: Array<{ name?: string; label?: string; amount?: number }>;
    employee_name?: string;
    employee_code?: string;
    position?: string;
    department?: string;
    company_name?: string;
    company_address?: string;
    logo_url?: string;
    intro?: string;
    closing?: string;
  },
  layoutVariant?: PayslipLayoutId | string | null,
) {
  const fmtMonth = (d?: string) =>
    d ? new Date(d).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '-';

  const earnings = Array.isArray(ps.earnings) ? ps.earnings : [];
  const deductions = Array.isArray(ps.deductions) ? ps.deductions : [];

  const html = renderPayslipHtml(
    {
      companyName: ps.company_name || 'Humanify',
      companyAddress: ps.company_address,
      logoUrl: ps.logo_url,
      employeeName: ps.employee_name || 'Karyawan',
      employeeCode: ps.employee_code || ps.run_code || '',
      position: ps.position || '',
      department: ps.department || '',
      period: fmtMonth(ps.period_start),
      payDate: ps.pay_date || '-',
      earnings: earnings.map((e) => ({ name: e.name || e.label || '-', amount: e.amount || 0 })),
      deductions: deductions.map((d) => ({ name: d.name || d.label || '-', amount: d.amount || 0 })),
      totalEarnings: ps.total_earnings || 0,
      totalDeductions: ps.total_deductions || 0,
      netPay: ps.net_salary || 0,
      intro: ps.intro,
      closing: ps.closing,
      documentNumber: ps.run_code,
    },
    layoutVariant || DEFAULT_PAYSLIP_LAYOUT,
    { forPrint: true },
  );

  const w = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}
