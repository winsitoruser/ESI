/**
 * Fetch PPh21 & BPJS export rows from live payroll / employee salary data.
 */
import type { BPJSExportRow, PPh21ExportRow } from '@/lib/hris/tax-bpjs-export';

const ACTIVE_EMPLOYEE_FILTER = `(e.is_active = true AND (e.status = 'active' OR e.status IS NULL))`;

const ALLOWANCE_SUBQUERY = `COALESCE((
  SELECT SUM(COALESCE(esc.amount, pc.default_amount, 0))
  FROM employee_salary_components esc
  JOIN payroll_components pc ON esc.component_id = pc.id
  WHERE esc.employee_salary_id = es.id AND esc.is_active = true
    AND pc.type = 'earning' AND pc.code NOT IN ('BASIC', 'OVERTIME')
), 0)`;

function getPTKP(status: string): number {
  const map: Record<string, number> = {
    'TK/0': 54000000, 'TK/1': 58500000, 'TK/2': 63000000, 'TK/3': 67500000,
    'K/0': 58500000, 'K/1': 63000000, 'K/2': 67500000, 'K/3': 72000000,
  };
  return map[status] || 54000000;
}

function calculatePPh21(pkp: number): number {
  if (pkp <= 0) return 0;
  const brackets = [
    { limit: 60000000, rate: 0.05 },
    { limit: 250000000, rate: 0.15 },
    { limit: 500000000, rate: 0.25 },
    { limit: 5000000000, rate: 0.30 },
    { limit: Infinity, rate: 0.35 },
  ];
  let tax = 0;
  let remaining = pkp;
  let prev = 0;
  for (const b of brackets) {
    const band = Math.min(remaining, b.limit - prev);
    if (band <= 0) break;
    tax += band * b.rate;
    remaining -= band;
    prev = b.limit;
    if (remaining <= 0) break;
  }
  return Math.round(tax);
}

export async function fetchPPh21ExportRows(
  sequelize: any,
  period: string,
  tenantId?: string | null,
): Promise<PPh21ExportRow[]> {
  const [yr, mo] = period.split('-').map((x) => parseInt(x, 10));
  const tenantClause = tenantId ? 'AND e.tenant_id = :tenantId' : '';

  // Prefer payroll run items for the period
  try {
    const [payrollRows] = await sequelize.query(`
      SELECT e.name AS employee_name, e.nik, es.npwp, e.position, es.tax_status,
             pi.gross_salary, pi.total_tax AS pph21_monthly
      FROM payroll_items pi
      JOIN payroll_runs pr ON pi.payroll_run_id = pr.id
      JOIN employees e ON pi.employee_id = e.id
      LEFT JOIN employee_salaries es ON es.employee_id = e.id AND es.is_active = true
      WHERE pr.status IN ('calculated','approved','paid')
        AND EXTRACT(YEAR FROM pr.period_start) = :yr
        AND EXTRACT(MONTH FROM pr.period_start) = :mo
        ${tenantId ? 'AND pr.tenant_id = :tenantId' : ''}
      ORDER BY e.name
    `, { replacements: { yr, mo, tenantId } });

    if ((payrollRows as any[])?.length) {
      return (payrollRows as any[]).map((r) => {
        const grossMonthly = Number(r.gross_salary || 0);
        const grossAnnual = grossMonthly * 12;
        const status = r.tax_status || 'TK/0';
        const ptkp = getPTKP(status);
        const taxableIncome = Math.max(0, grossAnnual - ptkp);
        return {
          npwp: r.npwp || '',
          nik: r.nik || '',
          employeeName: r.employee_name,
          position: r.position || '',
          taxStatus: status,
          grossIncome: grossAnnual,
          ptkp,
          taxableIncome,
          pph21: Number(r.pph21_monthly || 0) * 12 || calculatePPh21(taxableIncome),
          period,
        };
      });
    }
  } catch { /* fall through to salary-based */ }

  const [rows] = await sequelize.query(`
    SELECT e.name, e.nik, e.position, es.npwp, es.tax_status,
           es.base_salary, ${ALLOWANCE_SUBQUERY} AS total_allowances
    FROM employees e
    LEFT JOIN employee_salaries es ON es.employee_id = e.id AND es.is_active = true
    WHERE ${ACTIVE_EMPLOYEE_FILTER} ${tenantClause}
    ORDER BY e.name
  `, { replacements: { tenantId } });

  return ((rows as any[]) || []).map((r) => {
    const grossAnnual = (Number(r.base_salary || 0) + Number(r.total_allowances || 0)) * 12;
    const status = r.tax_status || 'TK/0';
    const ptkp = getPTKP(status);
    const taxableIncome = Math.max(0, grossAnnual - ptkp);
    const pph21 = calculatePPh21(taxableIncome);
    return {
      npwp: r.npwp || '',
      nik: r.nik || '',
      employeeName: r.name,
      position: r.position || '',
      taxStatus: status,
      grossIncome: grossAnnual,
      ptkp,
      taxableIncome,
      pph21,
      period,
    };
  });
}

export async function fetchBPJSExportRows(
  sequelize: any,
  period: string,
  tenantId?: string | null,
): Promise<BPJSExportRow[]> {
  const tenantClause = tenantId ? 'AND e.tenant_id = :tenantId' : '';
  const CAP_KESEHATAN = 12000000;
  const CAP_JP = 10547400;

  const [rows] = await sequelize.query(`
    SELECT e.name, e.nik, es.base_salary,
           es.bpjs_kesehatan_number, es.bpjs_ketenagakerjaan_number
    FROM employees e
    LEFT JOIN employee_salaries es ON es.employee_id = e.id AND es.is_active = true
    WHERE ${ACTIVE_EMPLOYEE_FILTER} ${tenantClause}
    ORDER BY e.name
  `, { replacements: { tenantId } });

  return ((rows as any[]) || []).map((r) => {
    const base = Number(r.base_salary || 0);
    return {
      nik: r.nik || '',
      employeeName: r.name,
      bpjsKesNumber: r.bpjs_kesehatan_number || undefined,
      bpjsTkNumber: r.bpjs_ketenagakerjaan_number || undefined,
      baseSalary: base,
      bpjsKesEmployee: Math.round(Math.min(base, CAP_KESEHATAN) * 0.01),
      bpjsKesEmployer: Math.round(Math.min(base, CAP_KESEHATAN) * 0.04),
      jhtEmployee: Math.round(base * 0.02),
      jhtEmployer: Math.round(base * 0.037),
      jpEmployee: Math.round(Math.min(base, CAP_JP) * 0.01),
      jpEmployer: Math.round(Math.min(base, CAP_JP) * 0.02),
      jkkEmployer: Math.round(base * 0.0024),
      jkmEmployer: Math.round(base * 0.003),
      period,
    };
  });
}

export interface PayrollPreflightIssue {
  employeeId: string;
  employeeName: string;
  department?: string;
  missing: string[];
}

export async function runPayrollPreflight(
  sequelize: any,
  tenantId?: string | null,
): Promise<{ ready: boolean; totalActive: number; issues: PayrollPreflightIssue[] }> {
  const tenantClause = tenantId ? 'AND e.tenant_id = :tenantId' : '';
  const [rows] = await sequelize.query(`
    SELECT e.id, e.name, e.department, e.nik,
           es.base_salary, es.bank_account_number, es.bank_name,
           es.npwp, es.tax_status, es.bpjs_kesehatan_number, es.bpjs_ketenagakerjaan_number
    FROM employees e
    LEFT JOIN employee_salaries es ON es.employee_id = e.id AND es.is_active = true
    WHERE ${ACTIVE_EMPLOYEE_FILTER} ${tenantClause}
    ORDER BY e.name
  `, { replacements: { tenantId } });

  const issues: PayrollPreflightIssue[] = [];
  for (const r of (rows as any[]) || []) {
    const missing: string[] = [];
    if (!r.base_salary || Number(r.base_salary) <= 0) missing.push('Gaji pokok');
    if (!r.bank_account_number) missing.push('Rekening bank');
    if (!r.nik) missing.push('NIK');
    if (!r.npwp) missing.push('NPWP');
    if (!r.tax_status) missing.push('Status PTKP');
    if (!r.bpjs_kesehatan_number && !r.bpjs_ketenagakerjaan_number) missing.push('Nomor BPJS');
    if (missing.length) {
      issues.push({
        employeeId: r.id,
        employeeName: r.name,
        department: r.department,
        missing,
      });
    }
  }

  return {
    ready: issues.length === 0,
    totalActive: (rows as any[])?.length || 0,
    issues,
  };
}
