import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { allowHrMockFallback, resolveDataSource } from '@/lib/hris/data-source';
import { withObservability } from '@/lib/observability';
import { ensureTenantDbContext } from '@/lib/saas/ensure-tenant-db-context';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch (e) {}

let PayrollComponent: any, EmployeeSalary: any, PayrollRun: any;
try {
  PayrollComponent = require('../../../models/PayrollComponent');
  EmployeeSalary = require('../../../models/EmployeeSalary');
  PayrollRun = require('../../../models/PayrollRun');
} catch (e) { console.warn('Payroll models not loaded:', e); }

function isUuid(v: any) {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function toSnakeComponent(row: any) {
  const p = row?.toJSON ? row.toJSON() : row;
  return {
    id: p.id, code: p.code, name: p.name, description: p.description, type: p.type, category: p.category,
    calculation_type: p.calculationType || p.calculation_type,
    default_amount: Number(p.defaultAmount ?? p.default_amount ?? 0),
    percentage_base: p.percentageBase || p.percentage_base,
    percentage_value: Number(p.percentageValue ?? p.percentage_value ?? 0),
    formula: p.formula, is_taxable: p.isTaxable ?? p.is_taxable ?? true,
    is_mandatory: p.isMandatory ?? p.is_mandatory ?? false, is_active: p.isActive ?? p.is_active ?? true,
    applies_to_pay_types: p.appliesToPayTypes || p.applies_to_pay_types,
    applicable_departments: p.applicableDepartments || p.applicable_departments,
    sort_order: p.sortOrder ?? p.sort_order ?? 0,
  };
}

function toSnakeRun(row: any) {
  const p = row?.toJSON ? row.toJSON() : row;
  return {
    id: p.id, run_code: p.runCode || p.run_code, name: p.name,
    period_start: p.periodStart || p.period_start, period_end: p.periodEnd || p.period_end,
    pay_date: p.payDate || p.pay_date, pay_type: p.payType || p.pay_type,
    total_employees: Number(p.totalEmployees ?? p.total_employees ?? 0),
    total_gross: Number(p.totalGross ?? p.total_gross ?? 0),
    total_deductions: Number(p.totalDeductions ?? p.total_deductions ?? 0),
    total_net: Number(p.totalNet ?? p.total_net ?? 0),
    total_tax: Number(p.totalTax ?? p.total_tax ?? 0), status: p.status,
  };
}

function mapPayslipRow(row: any) {
  let comps = row.components;
  if (typeof comps === 'string') { try { comps = JSON.parse(comps); } catch { comps = {}; } }
  const earnings = row.earnings
    ? (typeof row.earnings === 'string' ? JSON.parse(row.earnings) : row.earnings)
    : (comps?.earnings || []);
  const deductions = row.deductions
    ? (typeof row.deductions === 'string' ? JSON.parse(row.deductions) : row.deductions)
    : (comps?.deductions || []);
  return {
    ...row, employee_name: row.employee_name, employee_position: row.employee_position || row.position,
    earnings, deductions,
    total_earnings: Number(row.total_earnings ?? row.gross_salary ?? 0),
    total_deductions: Number(row.total_deductions ?? 0),
    tax_amount: Number(row.tax_amount ?? 0), net_salary: Number(row.net_salary ?? 0),
    base_salary: Number(row.base_salary ?? 0),
  };
}

const ACTIVE_EMPLOYEE_FILTER = `(LOWER(COALESCE(e.status, 'active')) = 'active' OR e.is_active = true)`;

const ALLOWANCE_SUBQUERY = `COALESCE((
  SELECT SUM(COALESCE(esc.amount, pc.default_amount, 0))
  FROM employee_salary_components esc
  JOIN payroll_components pc ON esc.component_id = pc.id
  WHERE esc.employee_salary_id = es.id AND esc.is_active = true
    AND pc.type = 'earning' AND pc.code NOT IN ('BASIC', 'OVERTIME')
), 0)`;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  let ctxSet = false;
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    await ensureTenantDbContext(session);
    ctxSet = true;

    const { assertHumanifyFeature } = await import('@/lib/saas/assert-feature');
    if (!(await assertHumanifyFeature(req, res, {
      tenantId: (session.user as any).tenantId,
      role: (session.user as any).role,
      feature: 'payroll',
      path: '/api/humanify/payroll',
    }))) return;

    const { action } = req.query;

    switch (req.method) {
      case 'GET':
        if (action === 'components') return getComponents(req, res, session);
        if (action === 'employee-salary') return getEmployeeSalary(req, res, session);
        if (action === 'employee-salaries') return getEmployeeSalaries(req, res, session);
        if (action === 'runs') return getPayrollRuns(req, res, session);
        if (action === 'payslip') return getPayslip(req, res, session);
        if (action === 'payslip-gate') return getPayslipGate(req, res);
        if (action === 'thr') return getTHR(req, res, session);
        if (action === 'bpjs') return getBPJS(req, res, session);
        if (action === 'pph21') return getPPh21Report(req, res, session);
        if (action === 'lembur') return getLemburReport(req, res, session);
        if (action === 'laporan') return getLaporan(req, res, session);
        if (action === 'attendance-summary') return getAttendanceSummary(req, res, session);
        if (action === 'export') return exportPayrollData(req, res, session);
        if (action === 'frequency') return getFrequencyOptions(req, res);
        if (action === 'preflight') return getPayrollPreflight(req, res, session);
        if (action === 'disbursement-preview') return res.json({ success: true, redirect: '/api/humanify/disbursement?action=preview' });
        if (action === 'fiscal-signoff') return getFiscalSignoff(req, res, session);
        if (action === 'payroll-audit') return getPayrollAudit(req, res, session);
        return getOverview(req, res, session);
      case 'POST':
        if (action === 'employee-salary') return upsertEmployeeSalary(req, res, session);
        if (action === 'run') return createPayrollRun(req, res, session);
        if (action === 'calculate') return calculatePayroll(req, res, session);
        if (action === 'approve') return approvePayroll(req, res, session);
        if (action === 'component') return createComponent(req, res, session);
        if (action === 'generate-from-attendance') return generatePayrollFromAttendance(req, res, session);
        if (action === 'sync-overtime') return syncOvertimeToAttendance(req, res, session);
        if (action === 'payslip-unlock') return unlockPayslip(req, res, session);
        return res.status(400).json({ error: 'Unknown action' });
      case 'PUT':
        if (action === 'component') return updateComponent(req, res, session);
        if (action === 'run-status') return updateRunStatus(req, res, session);
        return res.status(400).json({ error: 'Unknown action' });
      case 'DELETE':
        if (action === 'component') return deleteComponent(req, res, session);
        return res.status(400).json({ error: 'Unknown action' });
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.warn('Payroll API Error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  } finally {
    if (ctxSet) {
      try {
        const { releaseTenantDbContext } = await import('@/lib/saas/ensure-tenant-db-context');
        await releaseTenantDbContext();
      } catch { /* ignore */ }
    }
  }
}

export default withObservability(handler, 'humanify/payroll');

// ===== GET: Overview =====
async function getOverview(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    const tenantId = session.user.tenantId;

    // Payroll components
    let components: any[] = [];
    let usedMock = false;
    if (PayrollComponent) {
      const where: any = { isActive: true };
      if (tenantId) where.tenantId = tenantId;
      components = await PayrollComponent.findAll({ where, order: [['sort_order', 'ASC']] });
    }
    if (components.length === 0 && allowHrMockFallback()) {
      components = getMockComponents();
      usedMock = true;
    }

    // Recent payroll runs
    let runs: any[] = [];
    if (sequelize) {
      try {
        let where = 'WHERE 1=1';
        const replacements: any = {};
        if (tenantId) { where += ' AND tenant_id = :tenantId'; replacements.tenantId = tenantId; }
        const [rows] = await sequelize.query(`
          SELECT * FROM payroll_runs ${where} ORDER BY created_at DESC LIMIT 10
        `, { replacements });
        runs = rows || [];
      } catch (e) {}
    }

    // Employee salary configs count
    let salaryCount = 0;
    if (sequelize && tenantId) {
      try {
        const [r] = await sequelize.query(
          `SELECT COUNT(*) as c FROM employee_salaries WHERE is_active = true AND tenant_id = :tid`,
          { replacements: { tid: tenantId } }
        );
        salaryCount = parseInt(r?.[0]?.c || '0');
      } catch (e) {}
    }

    // Summary stats
    let stats = {
      totalEmployees: 0,
      configuredSalaries: salaryCount,
      totalComponents: components.length,
      lastPayrollRun: runs.length > 0 ? runs[0] : null,
      monthlyPayroll: 0
    };

    if (sequelize && tenantId) {
      try {
        const [empCount] = await sequelize.query(
          `SELECT COUNT(*) as c FROM employees WHERE ${ACTIVE_EMPLOYEE_FILTER.replace(/e\./g, '')} AND tenant_id = :tid`,
          { replacements: { tid: tenantId } }
        );
        stats.totalEmployees = parseInt(empCount?.[0]?.c || '0');

        const [totalSalary] = await sequelize.query(
          `SELECT COALESCE(SUM(base_salary), 0) as total FROM employee_salaries WHERE is_active = true AND tenant_id = :tid`,
          { replacements: { tid: tenantId } }
        );
        stats.monthlyPayroll = parseFloat(totalSalary?.[0]?.total || '0');
      } catch (e) {}
    }

    const hasLiveRows = stats.totalEmployees > 0 || runs.length > 0 || salaryCount > 0 || (components.length > 0 && !usedMock);

    return res.json({
      success: true,
      components: components.map((c: any) => toSnakeComponent(c)),
      runs: runs.map((r: any) => toSnakeRun(r)),
      stats,
      dataSource: resolveDataSource(hasLiveRows, usedMock),
    });
  } catch (e: any) {
    const usedMock = allowHrMockFallback();
    return res.json({
      success: true,
      components: usedMock ? getMockComponents() : [],
      runs: [],
      stats: { totalEmployees: 0, configuredSalaries: 0, totalComponents: 0, lastPayrollRun: null, monthlyPayroll: 0 },
      dataSource: resolveDataSource(false, usedMock),
    });
  }
}

// ===== GET: Components =====
async function getComponents(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    if (!PayrollComponent) return res.json({ success: true, data: allowHrMockFallback() ? getMockComponents() : [] });
    const components = await PayrollComponent.findAll({ order: [['sort_order', 'ASC']] });
    const data = components.length > 0 ? components.map(toSnakeComponent) : (allowHrMockFallback() ? getMockComponents() : []);
    return res.json({ success: true, data });
  } catch (e) {
    return res.json({ success: true, data: allowHrMockFallback() ? getMockComponents() : [] });
  }
}

// ===== GET: Employee Salaries =====
async function getEmployeeSalaries(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    if (!sequelize) return res.json({ success: true, data: [] });
    const tenantId = session?.user?.tenantId || null;
    if (!tenantId) return res.json({ success: true, data: [] });
    const [rows] = await sequelize.query(`
      SELECT es.*, e.name as employee_name, e.position, e.department, e.employee_code as emp_code,
             b.name as branch_name
      FROM employee_salaries es
      JOIN employees e ON es.employee_id = e.id
      LEFT JOIN branches b ON e.branch_id = b.id
      WHERE es.is_active = true
        AND (es.tenant_id = :tid OR e.tenant_id = :tid)
      ORDER BY e.name
    `, { replacements: { tid: tenantId } });
    return res.json({ success: true, data: rows || [] });
  } catch (e: any) {
    return res.json({ success: true, data: [] });
  }
}

// ===== GET: Single Employee Salary =====
async function getEmployeeSalary(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { employeeId } = req.query;
  if (!employeeId) return res.status(400).json({ error: 'employeeId required' });
  try {
    if (!sequelize) return res.json({ success: true, data: null });
    const [rows] = await sequelize.query(`
      SELECT es.*, e.name as employee_name, e.position, e.department
      FROM employee_salaries es
      JOIN employees e ON es.employee_id = e.id
      WHERE es.employee_id = :empId AND es.is_active = true
      ORDER BY es.effective_date DESC LIMIT 1
    `, { replacements: { empId: employeeId } });

    // Get assigned components
    let components: any[] = [];
    if (rows?.[0]) {
      const [comps] = await sequelize.query(`
        SELECT esc.*, pc.code, pc.name, pc.type, pc.category, pc.calculation_type
        FROM employee_salary_components esc
        JOIN payroll_components pc ON esc.component_id = pc.id
        WHERE esc.employee_salary_id = :salaryId AND esc.is_active = true
        ORDER BY pc.sort_order
      `, { replacements: { salaryId: rows[0].id } });
      components = comps || [];
    }

    return res.json({ success: true, data: rows?.[0] || null, components });
  } catch (e: any) {
    return res.json({ success: true, data: null, components: [] });
  }
}

// ===== POST: Upsert Employee Salary =====
async function upsertEmployeeSalary(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { employeeId, payType, baseSalary, hourlyRate, dailyRate, weeklyHours,
    overtimeRateMultiplier, overtimeHolidayMultiplier, taxStatus, taxMethod,
    bankName, bankAccountNumber, bankAccountName, bpjsKesehatanNumber,
    bpjsKetenagakerjaanNumber, npwp, components,
    projectRate, pieceRate, pieceUnit, bpjsEligible, taxEligible, projectId } = req.body;

  if (!employeeId || !payType || baseSalary === undefined) {
    return res.status(400).json({ success: false, error: 'employeeId, payType, baseSalary required' });
  }

  if (!sequelize) return res.json({ success: true, message: 'Saved (mock)' });

  try {
    // Deactivate old salary config
    await sequelize.query(`
      UPDATE employee_salaries SET is_active = false, end_date = CURRENT_DATE, updated_at = NOW()
      WHERE employee_id = :empId AND is_active = true
    `, { replacements: { empId: employeeId } });

    // Create new salary config
    const [result] = await sequelize.query(`
      INSERT INTO employee_salaries (id, tenant_id, employee_id, pay_type, base_salary,
        hourly_rate, daily_rate, weekly_hours, overtime_rate_multiplier, overtime_holiday_multiplier,
        tax_status, tax_method, bank_name, bank_account_number, bank_account_name,
        bpjs_kesehatan_number, bpjs_ketenagakerjaan_number, npwp,
        project_rate, piece_rate, piece_unit, bpjs_eligible, tax_eligible, project_id,
        is_active, created_at, updated_at)
      VALUES (uuid_generate_v4(), :tenantId, :empId, :payType, :baseSalary,
        :hourlyRate, :dailyRate, :weeklyHours, :otMult, :otHolidayMult,
        :taxStatus, :taxMethod, :bankName, :bankAccNum, :bankAccName,
        :bpjsKes, :bpjsTk, :npwp,
        :projectRate, :pieceRate, :pieceUnit, :bpjsEligible, :taxEligible, :projectId,
        true, NOW(), NOW())
      RETURNING *
    `, {
      replacements: {
        tenantId: session.user.tenantId, empId: employeeId, payType,
        baseSalary: baseSalary || 0, hourlyRate: hourlyRate || 0, dailyRate: dailyRate || 0,
        weeklyHours: weeklyHours || 40, otMult: overtimeRateMultiplier || 1.5,
        otHolidayMult: overtimeHolidayMultiplier || 2.0, taxStatus: taxStatus || 'TK/0',
        taxMethod: taxMethod || 'gross_up', bankName: bankName || null,
        bankAccNum: bankAccountNumber || null, bankAccName: bankAccountName || null,
        bpjsKes: bpjsKesehatanNumber || null, bpjsTk: bpjsKetenagakerjaanNumber || null,
        npwp: npwp || null,
        projectRate: projectRate || 0, pieceRate: pieceRate || 0, pieceUnit: pieceUnit || 'unit',
        bpjsEligible: bpjsEligible !== false, taxEligible: taxEligible !== false,
        projectId: projectId || null,
      }
    });

    const salary = result?.[0];

    // Assign components
    if (salary && components && Array.isArray(components)) {
      for (const comp of components) {
        await sequelize.query(`
          INSERT INTO employee_salary_components (id, employee_salary_id, component_id, amount, percentage, is_active, created_at, updated_at)
          VALUES (uuid_generate_v4(), :salaryId, :compId, :amount, :pct, true, NOW(), NOW())
        `, {
          replacements: {
            salaryId: salary.id, compId: comp.componentId,
            amount: comp.amount || 0, pct: comp.percentage || null
          }
        });
      }
    }

    return res.status(201).json({ success: true, message: 'Konfigurasi gaji berhasil disimpan', data: salary });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== GET: Payroll Runs =====
async function getPayrollRuns(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    if (!sequelize) return res.json({ success: true, data: [] });
    const tenantId = session.user.tenantId;
    let where = 'WHERE 1=1';
    const replacements: any = {};
    if (tenantId) { where += ' AND tenant_id = :tenantId'; replacements.tenantId = tenantId; }
    const [rows] = await sequelize.query(`
      SELECT * FROM payroll_runs ${where} ORDER BY created_at DESC LIMIT 20
    `, { replacements });
    return res.json({ success: true, data: (rows || []).map(toSnakeRun) });
  } catch (e) {
    return res.json({ success: true, data: [] });
  }
}

// ===== POST: Create Payroll Run =====
async function createPayrollRun(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { periodStart, periodEnd, payDate, payType, branchId, department, name } = req.body;
  if (!periodStart || !periodEnd) {
    return res.status(400).json({ success: false, error: 'periodStart and periodEnd required' });
  }
  if (!sequelize) return res.json({ success: true, message: 'Created (mock)' });

  try {
    const runCode = `PR-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString(36).toUpperCase()}`;
    const [result] = await sequelize.query(`
      INSERT INTO payroll_runs (id, tenant_id, run_code, name, period_start, period_end, pay_date,
        pay_type, branch_id, department, status, created_by, created_at, updated_at)
      VALUES (uuid_generate_v4(), :tenantId, :runCode, :name, :periodStart, :periodEnd, :payDate,
        :payType, :branchId, :department, 'draft', :createdBy, NOW(), NOW())
      RETURNING *
    `, {
      replacements: {
        tenantId: session.user.tenantId, runCode,
        name: name || `Payroll ${periodStart} - ${periodEnd}`,
        periodStart, periodEnd, payDate: payDate || periodEnd,
        payType: payType || 'monthly', branchId: branchId || null,
        department: department || null,
        createdBy: isUuid(session.user.id) ? session.user.id : null
      }
    });

    return res.status(201).json({ success: true, data: result?.[0] });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== POST: Calculate Payroll =====
async function calculatePayroll(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { runId } = req.body;
  if (!runId) return res.status(400).json({ success: false, error: 'runId required' });
  if (!sequelize) return res.json({ success: true, message: 'Calculated (mock)' });
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });

  try {
    // Get the run (tenant-scoped)
    const [runs] = await sequelize.query(
      `SELECT * FROM payroll_runs WHERE id = :id AND tenant_id = :tenantId`,
      { replacements: { id: runId, tenantId } },
    );
    const run = runs?.[0];
    if (!run) return res.status(404).json({ success: false, error: 'Payroll run not found' });

    // Calculate working days in period
    const start = new Date(run.period_start);
    const end = new Date(run.period_end);
    let workingDays = 0;
    const d = new Date(start);
    while (d <= end) {
      if (d.getDay() !== 0 && d.getDay() !== 6) workingDays++;
      d.setDate(d.getDate() + 1);
    }

    // Get employees with active salary configs
    let empFilter = `WHERE es.is_active = true AND ${ACTIVE_EMPLOYEE_FILTER}`;
    const replacements: any = { runId };
    if (run.branch_id) { empFilter += ' AND e.branch_id = :branchId'; replacements.branchId = run.branch_id; }
    if (run.department) { empFilter += ' AND e.department = :dept'; replacements.dept = run.department; }

    const [employees] = await sequelize.query(`
      SELECT es.*, e.name as employee_name, e.position, e.department, e.branch_id
      FROM employee_salaries es
      JOIN employees e ON es.employee_id = e.id
      ${empFilter}
      ORDER BY e.name
    `, { replacements });

    // Get components
    const [allComponents] = await sequelize.query(`SELECT * FROM payroll_components WHERE is_active = true ORDER BY sort_order`);

    let totalGross = 0, totalDeductions = 0, totalNet = 0, totalTax = 0, totalBpjs = 0;

    // Delete old items for this run
    await sequelize.query(`DELETE FROM payroll_items WHERE payroll_run_id = :runId`, { replacements: { runId } });

    for (const emp of (employees || [])) {
      // Get employee-specific components
      const [empComps] = await sequelize.query(`
        SELECT esc.*, pc.code, pc.name, pc.type, pc.category, pc.calculation_type, pc.default_amount
        FROM employee_salary_components esc
        JOIN payroll_components pc ON esc.component_id = pc.id
        WHERE esc.employee_salary_id = :salaryId AND esc.is_active = true
      `, { replacements: { salaryId: emp.id } });

      const baseSalary = parseFloat(emp.base_salary) || 0;
      const bpjsEligible = emp.bpjs_eligible !== false;
      const taxEligible = emp.tax_eligible !== false;
      const otMultiplier = parseFloat(emp.overtime_rate_multiplier) || 1.5;

      // === ATTENDANCE INTEGRATION ===
      let attendanceData: any = { total_work_hours: 0, total_overtime_minutes: 0, late_days: 0, absent_days: 0, total_late_minutes: 0, present_days: 0 };
      try {
        const [attRows] = await sequelize.query(`
          SELECT
            COALESCE(SUM(work_hours), 0) AS total_work_hours,
            COALESCE(SUM(overtime_minutes), 0) AS total_overtime_minutes,
            COUNT(DISTINCT CASE WHEN status = 'late' THEN date END) AS late_days,
            COUNT(DISTINCT CASE WHEN status = 'absent' THEN date END) AS absent_days,
            COALESCE(SUM(late_minutes), 0) AS total_late_minutes,
            COUNT(DISTINCT CASE WHEN status IN ('present', 'late', 'work_from_home') THEN date END) AS present_days
          FROM employee_attendance
          WHERE employee_id = :empId AND date BETWEEN :periodStart AND :periodEnd
        `, { replacements: { empId: emp.employee_id, periodStart: run.period_start, periodEnd: run.period_end } });
        if (attRows?.[0]) attendanceData = attRows[0];
      } catch (e) {}

      const actualWorkHours = parseFloat(attendanceData.total_work_hours) || 0;
      const presentDays = parseInt(attendanceData.present_days) || 0;
      const totalOvertimeHours = Math.round((parseInt(attendanceData.total_overtime_minutes) || 0) / 60 * 100) / 100;
      const lateDays = parseInt(attendanceData.late_days) || 0;
      const absentDays = parseInt(attendanceData.absent_days) || 0;
      const totalLateMinutes = parseInt(attendanceData.total_late_minutes) || 0;

      const hourlyRateEmp = parseFloat(emp.hourly_rate) || (baseSalary > 0 ? baseSalary / 173 : 0);
      const dailyRate = parseFloat(emp.daily_rate) || (baseSalary > 0 && workingDays > 0 ? baseSalary / workingDays : 0);

      // Calculate base pay based on pay type (attendance-driven for casual workers)
      let effectiveBaseSalary = baseSalary;
      let basicLabel = 'Gaji Pokok';

      if (emp.pay_type === 'hourly') {
        const hours = actualWorkHours > 0 ? actualWorkHours : (parseFloat(emp.weekly_hours) || 40) * 4.33;
        effectiveBaseSalary = Math.round(hourlyRateEmp * hours);
        basicLabel = `Upah ${hours} jam × Rp ${hourlyRateEmp.toLocaleString('id-ID')}`;
      } else if (emp.pay_type === 'daily') {
        const days = presentDays > 0 ? presentDays : workingDays;
        effectiveBaseSalary = Math.round(dailyRate * days);
        basicLabel = `Upah ${days} hari × Rp ${dailyRate.toLocaleString('id-ID')}`;
      } else if (emp.pay_type === 'weekly') {
        effectiveBaseSalary = baseSalary * 4.33;
      } else if (emp.pay_type === 'piecework') {
        try {
          const [pwRows] = await sequelize.query(`
            SELECT COALESCE(SUM(total_amount), 0) AS total, COUNT(*) AS cnt
            FROM piecework_entries
            WHERE employee_id = :empId AND status = 'approved'
              AND work_date BETWEEN :periodStart AND :periodEnd
              AND payroll_run_id IS NULL
          `, { replacements: { empId: emp.employee_id, periodStart: run.period_start, periodEnd: run.period_end } });
          effectiveBaseSalary = Math.round(parseFloat(pwRows?.[0]?.total || '0'));
          const cnt = parseInt(pwRows?.[0]?.cnt || '0');
          basicLabel = `Borongan ${cnt} entri`;
        } catch (e) {
          effectiveBaseSalary = 0;
          basicLabel = 'Borongan (belum ada data)';
        }
      } else if (emp.pay_type === 'project') {
        try {
          const [projRows] = await sequelize.query(`
            SELECT COALESCE(SUM(pp.gross_amount), 0) AS total, COUNT(*) AS cnt
            FROM project_payroll pp
            WHERE pp.employee_id::text = :empId::text
              AND pp.period_start >= :periodStart AND pp.period_end <= :periodEnd
              AND pp.status IN ('calculated', 'approved', 'paid')
          `, { replacements: { empId: emp.employee_id, periodStart: run.period_start, periodEnd: run.period_end } });
          let projectTotal = parseFloat(projRows?.[0]?.total || '0');
          if (projectTotal === 0) {
            const [tsRows] = await sequelize.query(`
              SELECT
                COUNT(DISTINCT pt.timesheet_date) AS days_worked,
                COALESCE(SUM(pt.hours_worked), 0) AS total_hours
              FROM pjm_timesheets pt
              WHERE pt.employee_id::text = :empId::text
                AND pt.status = 'approved'
                AND pt.timesheet_date BETWEEN :periodStart AND :periodEnd
            `, { replacements: { empId: emp.employee_id, periodStart: run.period_start, periodEnd: run.period_end } });
            const projRate = parseFloat(emp.project_rate) || dailyRate || hourlyRateEmp;
            const daysWorked = parseInt(tsRows?.[0]?.days_worked || '0');
            const totalHours = parseFloat(tsRows?.[0]?.total_hours || '0');
            projectTotal = dailyRate > 0 ? daysWorked * dailyRate : totalHours * hourlyRateEmp;
          }
          effectiveBaseSalary = Math.round(projectTotal);
          basicLabel = `Upah Proyek`;
        } catch (e) {
          effectiveBaseSalary = parseFloat(emp.project_rate) || baseSalary;
          basicLabel = 'Upah Proyek (flat)';
        }
      } else if (emp.pay_type === 'commission' || emp.pay_type === 'base_plus_commission') {
        try {
          const [commRows] = await sequelize.query(`
            SELECT COALESCE(SUM(commission_amount), 0) AS total, COUNT(*) AS cnt
            FROM mf_agent_commissions
            WHERE employee_id = :empId AND status = 'approved'
              AND period_month = to_char(:periodStart::date, 'YYYY-MM')
              AND payroll_run_id IS NULL
          `, { replacements: { empId: emp.employee_id || emp.id, periodStart } });
          const commTotal = parseFloat(commRows?.[0]?.total || '0');
          if (emp.pay_type === 'commission') {
            effectiveBaseSalary = Math.round(commTotal);
            basicLabel = `Komisi (${commRows?.[0]?.cnt || 0} transaksi)`;
          } else {
            effectiveBaseSalary = Math.round(baseSalary + commTotal);
            basicLabel = `Gaji Pokok + Komisi (Rp ${commTotal.toLocaleString('id-ID')})`;
          }
        } catch (e) {
          effectiveBaseSalary = emp.pay_type === 'commission' ? 0 : baseSalary;
          basicLabel = emp.pay_type === 'commission' ? 'Komisi' : 'Gaji Pokok + Komisi';
        }
      }

      const overtimePay = totalOvertimeHours > 0
        ? Math.round(totalOvertimeHours * hourlyRateEmp * otMultiplier) : 0;

      const absentDeduction = (emp.pay_type === 'monthly' || emp.pay_type === 'weekly') && absentDays > 0
        ? Math.round(absentDays * dailyRate) : 0;
      const lateDeduction = (emp.pay_type === 'monthly' || emp.pay_type === 'weekly') && lateDays > 0
        ? Math.round(totalLateMinutes * (hourlyRateEmp / 60)) : 0;

      // Calculate earnings
      const earnings: any[] = [{ code: 'BASIC', name: basicLabel, amount: effectiveBaseSalary }];
      const deductions: any[] = [];

      // Process assigned components
      for (const comp of (empComps || [])) {
        const amount = parseFloat(comp.amount) || parseFloat(comp.default_amount) || 0;
        if (comp.type === 'earning') {
          if (comp.calculation_type === 'per_day') {
            earnings.push({ code: comp.code, name: comp.name, amount: amount * workingDays });
          } else if (comp.calculation_type === 'percentage') {
            earnings.push({ code: comp.code, name: comp.name, amount: effectiveBaseSalary * (parseFloat(comp.percentage || comp.percentage_value) || 0) / 100 });
          } else {
            earnings.push({ code: comp.code, name: comp.name, amount });
          }
        } else if (comp.type === 'deduction') {
          deductions.push({ code: comp.code, name: comp.name, amount });
        }
      }

      // Also add default mandatory components not already assigned
      const assignedCodes = new Set([...(empComps || []).map((c: any) => c.code), 'BASIC']);
      for (const comp of (allComponents || [])) {
        if (assignedCodes.has(comp.code)) continue;
        if (!comp.is_mandatory) continue;
        const amt = parseFloat(comp.default_amount) || 0;
        if (comp.type === 'earning' && amt > 0) {
          earnings.push({ code: comp.code, name: comp.name, amount: amt });
        }
      }

      // Add attendance-based overtime earnings
      if (overtimePay > 0) {
        earnings.push({ code: 'OVERTIME', name: `Lembur ${totalOvertimeHours} jam`, amount: overtimePay });
      }

      const totalEarnings = earnings.reduce((s, e) => s + e.amount, 0);

      // BPJS & PPh21 — skip for casual workers unless explicitly eligible
      let bpjsKesEmployee = 0, bpjsJhtEmployee = 0, bpjsJpEmployee = 0, monthlyTax = 0;

      if (bpjsEligible) {
        bpjsKesEmployee = effectiveBaseSalary * 0.01;
        bpjsJhtEmployee = effectiveBaseSalary * 0.02;
        bpjsJpEmployee = Math.min(effectiveBaseSalary, 9559600) * 0.01;
        deductions.push(
          { code: 'BPJS_KES', name: 'BPJS Kesehatan', amount: bpjsKesEmployee },
          { code: 'BPJS_JHT', name: 'BPJS JHT', amount: bpjsJhtEmployee },
          { code: 'BPJS_JP', name: 'BPJS JP', amount: bpjsJpEmployee }
        );
      }

      if (taxEligible) {
        const taxableIncome = (totalEarnings - bpjsJhtEmployee - bpjsJpEmployee) * 12;
        const ptkp = getPTKP(emp.tax_status || 'TK/0');
        const pkp = Math.max(0, taxableIncome - ptkp);
        const annualTax = calculatePPh21(pkp);
        monthlyTax = Math.round(annualTax / 12);
        if (monthlyTax > 0) {
          deductions.push({ code: 'PPH21', name: 'PPh 21', amount: monthlyTax });
        }
      }

      // Add attendance-based deductions (late/absent)
      if (lateDeduction > 0) {
        deductions.push({ code: 'LATE', name: `Terlambat ${lateDays} hari (${totalLateMinutes} menit)`, amount: lateDeduction });
      }
      if (absentDeduction > 0) {
        deductions.push({ code: 'ABSENT', name: `Tidak Hadir ${absentDays} hari`, amount: absentDeduction });
      }

      const totalDeductionsAmt = deductions.reduce((s, d) => s + d.amount, 0);
      const grossSalary = totalEarnings;
      const netSalary = grossSalary - totalDeductionsAmt;
      const empBpjs = bpjsKesEmployee + bpjsJhtEmployee + bpjsJpEmployee;

      const actualDays = presentDays > 0 ? presentDays
        : (actualWorkHours > 0 ? Math.round(actualWorkHours / 8) : 0);

      // Mark piecework entries as linked to this payroll run
      if (emp.pay_type === 'piecework') {
        try {
          await sequelize.query(`
            UPDATE piecework_entries SET payroll_run_id = :runId, updated_at = NOW()
            WHERE employee_id = :empId AND status = 'approved'
              AND work_date BETWEEN :periodStart AND :periodEnd
              AND payroll_run_id IS NULL
          `, { replacements: { runId, empId: emp.employee_id, periodStart: run.period_start, periodEnd: run.period_end } });
        } catch (e) {}
      }

      if (emp.pay_type === 'commission' || emp.pay_type === 'base_plus_commission') {
        try {
          await sequelize.query(`
            UPDATE mf_agent_commissions SET payroll_run_id = :runId, updated_at = NOW()
            WHERE employee_id = :empId AND status = 'approved'
              AND period_month = to_char(:periodStart::date, 'YYYY-MM')
              AND payroll_run_id IS NULL
          `, { replacements: { runId, empId: emp.employee_id || emp.id, periodStart: run.period_start } });
        } catch (e) {}
      }

      // Insert payroll item (compatible with base + extended columns)
      const totalAllowances = Math.max(0, totalEarnings - effectiveBaseSalary);
      const componentsJson = JSON.stringify({ earnings, deductions });

      await sequelize.query(`
        INSERT INTO payroll_items (
          id, payroll_run_id, employee_id, employee_salary_id,
          working_days, present_days, absent_days, overtime_hours,
          base_salary, total_allowances, total_deductions, overtime_amount,
          gross_salary, tax_amount, net_salary, components, status,
          employee_name, employee_position, department, branch_id, pay_type,
          actual_working_days, earnings, deductions, total_earnings,
          created_at, updated_at
        ) VALUES (
          uuid_generate_v4(), :runId, :empId, :salaryId,
          :workDays, :presentDays, :absentDays, :overtimeHours,
          :baseSalary, :totalAllowances, :totalDeductionsAmt, :overtimePay,
          :grossSalary, :tax, :netSalary, :components::jsonb, 'calculated',
          :empName, :empPos, :dept, :branchId, :payType,
          :actualDays, :earnings::jsonb, :deductions::jsonb, :totalEarnings,
          NOW(), NOW()
        )
      `, {
        replacements: {
          runId, empId: emp.employee_id, salaryId: emp.id, empName: emp.employee_name,
          empPos: emp.position, dept: emp.department, branchId: emp.branch_id,
          payType: emp.pay_type, workDays: workingDays, presentDays: Math.max(0, workingDays - absentDays),
          absentDays, overtimeHours: totalOvertimeHours, actualDays,
          baseSalary: effectiveBaseSalary, totalAllowances, totalDeductionsAmt,
          overtimePay, grossSalary, tax: monthlyTax, netSalary,
          earnings: JSON.stringify(earnings), deductions: JSON.stringify(deductions),
          components: componentsJson, totalEarnings,
        }
      });

      totalGross += grossSalary;
      totalDeductions += totalDeductionsAmt;
      totalNet += netSalary;
      totalTax += monthlyTax;
      totalBpjs += empBpjs;
    }

    // Update run totals
    await sequelize.query(`
      UPDATE payroll_runs SET total_employees = :empCount, total_gross = :gross,
        total_deductions = :deductions, total_net = :net, total_tax = :tax,
        total_bpjs = :bpjs, status = 'calculated', updated_at = NOW()
      WHERE id = :runId AND tenant_id = :tenantId
    `, {
      replacements: {
        runId, tenantId, empCount: (employees || []).length, gross: totalGross,
        deductions: totalDeductions, net: totalNet, tax: totalTax, bpjs: totalBpjs
      }
    });

    return res.json({
      success: true,
      message: `Payroll calculated for ${(employees || []).length} employees`,
      summary: { totalEmployees: (employees || []).length, totalGross, totalDeductions, totalNet, totalTax, totalBpjs }
    });
  } catch (e: any) {
    console.warn('calculatePayroll error: (table may not exist):', (e as any)?.message || e);
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== POST: Approve Payroll =====
async function approvePayroll(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { runId } = req.body;
  if (!runId || !sequelize) return res.status(400).json({ error: 'runId required' });
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
  try {
    const [, meta] = await sequelize.query(`
      UPDATE payroll_runs SET status = 'approved', approved_by = :userId, approved_at = NOW(), updated_at = NOW()
      WHERE id = :runId AND tenant_id = :tenantId
    `, { replacements: { runId, tenantId, userId: isUuid(session.user.id) ? session.user.id : null } });
    if ((meta as any)?.rowCount === 0) return res.status(404).json({ success: false, error: 'Payroll run not found' });

    try {
      const { logPayrollAudit, FISCAL_ENGINE } = await import('@/lib/hris/payroll-audit');
      let snapshot: Record<string, unknown> = { status: 'approved' };
      try {
        const [agg] = await sequelize.query(
          `SELECT COUNT(*)::int AS items,
                  COALESCE(SUM(gross_salary),0)::float AS gross_total,
                  COALESCE(SUM(net_salary),0)::float AS net_total,
                  COALESCE(SUM(tax_amount),0)::float AS tax_total
           FROM payroll_items WHERE payroll_run_id = :runId`,
          { replacements: { runId } },
        );
        const a = (agg as any[])?.[0] || {};
        snapshot = {
          status: 'approved',
          engineVersion: FISCAL_ENGINE.version,
          items: a.items || 0,
          grossTotal: a.gross_total || 0,
          netTotal: a.net_total || 0,
          taxTotal: a.tax_total || 0,
        };
      } catch { /* columns may vary — keep minimal snapshot */ }
      await logPayrollAudit({
        tenantId,
        runId,
        eventType: 'approved',
        actorId: session.user?.id,
        actorName: session.user?.name,
        actorEmail: session.user?.email,
        details: snapshot,
        db: sequelize,
      });
    } catch { /* audit best-effort */ }

    return res.json({ success: true, message: 'Payroll approved' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== PUT: Update Run Status =====
async function updateRunStatus(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { runId, status, notifyEmployees } = req.body;
  if (!runId || !status || !sequelize) return res.status(400).json({ error: 'runId and status required' });
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
  try {
    const [beforeRows] = await sequelize.query(
      `SELECT id, status, run_code, period_start, period_end FROM payroll_runs WHERE id = :runId AND tenant_id = :tenantId`,
      { replacements: { runId, tenantId } }
    );
    const before = (beforeRows as any[])?.[0];
    if (!before) return res.status(404).json({ success: false, error: 'Payroll run not found' });

    const [, meta] = await sequelize.query(`
      UPDATE payroll_runs SET status = :status, updated_at = NOW()
      WHERE id = :runId AND tenant_id = :tenantId
    `, { replacements: { runId, status, tenantId } });
    if ((meta as any)?.rowCount === 0) return res.status(404).json({ success: false, error: 'Payroll run not found' });
    if (status === 'paid') {
      try {
        await sequelize.query(
          `UPDATE payroll_runs SET paid_at = NOW() WHERE id = :runId AND tenant_id = :tenantId`,
          { replacements: { runId, tenantId } },
        );
      } catch { /* paid_at column may not exist on older schemas */ }
    }

    try {
      const { logPayrollAudit } = await import('@/lib/hris/payroll-audit');
      const eventType = status === 'paid' ? 'paid' : status === 'released' ? 'released' : 'status_change';
      await logPayrollAudit({
        tenantId,
        runId,
        eventType: eventType as any,
        actorId: session.user?.id,
        actorName: session.user?.name,
        actorEmail: session.user?.email,
        details: { from: before.status, to: status, run_code: before.run_code },
        db: sequelize,
      });
    } catch { /* audit best-effort */ }

    // Optional branded notice when payslips released/paid
    const shouldNotify =
      notifyEmployees === true ||
      String(process.env.PAYROLL_NOTIFY_EMPLOYEES || '').toLowerCase() === 'true';
    if (shouldNotify && (status === 'paid' || status === 'released')) {
      try {
        const { humanifyPayslipReleasedEmail, humanifyEmployeePayslipEmail } = await import('@/lib/email/humanify-mails');
        const { sendEmail } = await import('@/lib/email/sender');
        const base = (process.env.NEXTAUTH_URL || 'https://humanify.id').replace(/\/$/, '');
        const periodLabel = `${before.period_start || ''} s/d ${before.period_end || ''}`;
        const slipUrl = `${base}/employee`;
        const opsSlipUrl = `${base}/humanify/payroll/slip-gaji`;

        // Ops / payroll alias
        const opsTo = process.env.PAYROLL_RELEASE_NOTIFY_EMAIL || process.env.OBS_ALERT_EMAIL;
        if (opsTo) {
          const mail = humanifyPayslipReleasedEmail({
            periodLabel,
            runCode: before.run_code || runId,
            status,
            slipUrl: opsSlipUrl,
          });
          await sendEmail({ to: opsTo, subject: mail.subject, html: mail.html, text: mail.text });
        }

        // Employees on this run (cap 200)
        const [emps] = await sequelize.query(
          `SELECT DISTINCT e.email AS email, COALESCE(e.name, pi.employee_name) AS name
           FROM payroll_items pi
           LEFT JOIN employees e ON pi.employee_id::text = e.id::text
           WHERE pi.payroll_run_id = :runId
             AND e.email IS NOT NULL AND e.email <> ''
           LIMIT 200`,
          { replacements: { runId } },
        );
        let sent = 0;
        for (const row of emps || []) {
          const to = String(row.email || '').trim();
          if (!to || !to.includes('@')) continue;
          const mail = humanifyEmployeePayslipEmail({
            employeeName: row.name || 'Karyawan',
            periodLabel,
            runCode: before.run_code || runId,
            status,
            slipUrl,
          });
          try {
            await sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text });
            sent++;
          } catch { /* per-recipient best-effort */ }
        }
        try {
          const { logPayrollAudit } = await import('@/lib/hris/payroll-audit');
          await logPayrollAudit({
            tenantId,
            runId,
            eventType: 'status_change',
            actorId: session.user?.id,
            actorName: session.user?.name,
            actorEmail: session.user?.email,
            details: { notify: true, employeeEmailsSent: sent, status },
            db: sequelize,
          });
        } catch { /* */ }
      } catch { /* email best-effort */ }
    }

    return res.json({ success: true, message: `Status updated to ${status}` });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== GET: Payslip gate status =====
async function getPayslipGate(_req: NextApiRequest, res: NextApiResponse) {
  const { isPayslipPasswordGateEnabled, getPayslipUnlockTtlMs } = await import('@/lib/hris/payslip-view-gate');
  return res.json({
    success: true,
    data: {
      required: isPayslipPasswordGateEnabled(),
      ttlMinutes: Math.round(getPayslipUnlockTtlMs() / 60_000),
    },
  });
}

// ===== POST: Unlock payslip amounts (password re-auth) =====
async function unlockPayslip(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { isPayslipPasswordGateEnabled, mintPayslipUnlockToken, getPayslipUnlockTtlMs } = await import('@/lib/hris/payslip-view-gate');
  if (!isPayslipPasswordGateEnabled()) {
    return res.json({ success: true, data: { required: false, unlockToken: null } });
  }
  const password = String(req.body?.password || '').trim();
  if (!password) return res.status(400).json({ success: false, error: 'password required', code: 'PAYSLIP_PASSWORD_REQUIRED' });

  const tenantId = session?.user?.tenantId;
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!tenantId || !userId) return res.status(403).json({ success: false, error: 'NO_TENANT', code: 'NO_TENANT' });

  try {
    const bcrypt = await import('bcryptjs');
    let User: any;
    try { User = require('../../../models/User'); } catch { /* */ }
    if (!User) return res.status(500).json({ success: false, error: 'User model unavailable' });

    const user = await User.findOne({ where: email ? { email } : { id: userId } });
    if (!user?.password) return res.status(400).json({ success: false, error: 'Akun tidak mendukung unlock password', code: 'PAYSLIP_UNLOCK_UNAVAILABLE' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, error: 'Password salah', code: 'PAYSLIP_PASSWORD_INVALID' });

    const unlockToken = mintPayslipUnlockToken({ userId: String(userId), tenantId: String(tenantId) });
    try {
      const { logPayrollAudit } = await import('@/lib/hris/payroll-audit');
      await logPayrollAudit({
        tenantId: String(tenantId),
        runId: 'payslip-unlock',
        eventType: 'payslip_unlock',
        actorId: String(userId),
        actorName: session?.user?.name || null,
        actorEmail: email || null,
        details: { ttlMinutes: Math.round(getPayslipUnlockTtlMs() / 60_000) },
      });
    } catch { /* non-blocking */ }

    return res.json({
      success: true,
      data: {
        unlockToken,
        expiresInMs: getPayslipUnlockTtlMs(),
      },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Unlock failed' });
  }
}

// ===== GET: Payslip =====
async function getPayslip(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { runId, employeeId } = req.query;
  if (!sequelize) return res.json({ success: true, data: [] });
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return res.json({ success: true, data: [] });
  try {
    const {
      isPayslipPasswordGateEnabled,
      verifyPayslipUnlockToken,
      maskPayslipRow,
    } = await import('@/lib/hris/payslip-view-gate');

    const gateOn = isPayslipPasswordGateEnabled();
    const unlockHeader = String(req.headers['x-payslip-unlock'] || req.query.unlock || '').trim();
    const unlocked = !gateOn || verifyPayslipUnlockToken(unlockHeader, {
      userId: String(session?.user?.id || ''),
      tenantId: String(tenantId),
    });

    let where = 'WHERE pr.tenant_id = :tenantId';
    const replacements: any = { tenantId };
    if (runId) { where += ' AND pi.payroll_run_id = :runId'; replacements.runId = runId; }
    if (employeeId) { where += ' AND pi.employee_id = :empId'; replacements.empId = employeeId; }

    const [rows] = await sequelize.query(`
      SELECT pi.*, e.name as employee_name, e.position as employee_position, e.department,
             pr.run_code, pr.period_start, pr.period_end, pr.pay_date, pr.status as run_status
      FROM payroll_items pi
      JOIN payroll_runs pr ON pi.payroll_run_id = pr.id
      LEFT JOIN employees e ON pi.employee_id = e.id
      ${where}
      ORDER BY pr.period_start DESC, COALESCE(pi.employee_name, e.name)
    `, { replacements });

    let data = (rows || []).map(mapPayslipRow);
    if (!unlocked) {
      data = data.map((row: any) => maskPayslipRow(row));
    }

    // Audit payslip opens when scoped to a run or employee (HRS-3) — only when unlocked
    if (unlocked && data.length && (runId || employeeId)) {
      try {
        const { logPayrollAudit } = await import('@/lib/hris/payroll-audit');
        await logPayrollAudit({
          tenantId: String(tenantId),
          runId: String(runId || data[0]?.payroll_run_id || data[0]?.payrollRunId || 'unknown'),
          eventType: 'payslip_view',
          actorId: session?.user?.id != null ? String(session.user.id) : null,
          actorName: session?.user?.name || null,
          actorEmail: session?.user?.email || null,
          details: {
            employeeId: employeeId || null,
            count: data.length,
          },
        });
      } catch { /* non-blocking */ }
    }

    return res.json({
      success: true,
      data,
      locked: gateOn && !unlocked,
      gateRequired: gateOn,
    });
  } catch (e: any) {
    return res.json({ success: true, data: [] });
  }
}

// ===== POST: Create Component =====
async function createComponent(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!PayrollComponent) return res.json({ success: true, message: 'Created (mock)' });
  try {
    const comp = await PayrollComponent.create({ ...req.body, tenantId: session.user.tenantId });
    return res.status(201).json({ success: true, data: comp });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== PUT: Update Component =====
async function updateComponent(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, ...data } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (!sequelize) return res.json({ success: true, message: 'Updated (mock)' });
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
  try {
    // Use raw SQL to handle all fields including snake_case
    const fields: string[] = [];
    const replacements: any = { id, tenantId };
    const fieldMap: Record<string, string> = {
      code: 'code', name: 'name', description: 'description', type: 'type',
      category: 'category', calculationType: 'calculation_type', calculation_type: 'calculation_type',
      defaultAmount: 'default_amount', default_amount: 'default_amount',
      percentageBase: 'percentage_base', percentage_base: 'percentage_base',
      percentageValue: 'percentage_value', percentage_value: 'percentage_value',
      formula: 'formula', isTaxable: 'is_taxable', is_taxable: 'is_taxable',
      isMandatory: 'is_mandatory', is_mandatory: 'is_mandatory',
      appliesToPayTypes: 'applies_to_pay_types', applies_to_pay_types: 'applies_to_pay_types',
      applicableDepartments: 'applicable_departments', applicable_departments: 'applicable_departments',
      sortOrder: 'sort_order', sort_order: 'sort_order',
      isActive: 'is_active', is_active: 'is_active',
    };
    for (const [key, val] of Object.entries(data)) {
      const col = fieldMap[key];
      if (!col) continue;
      const paramName = col.replace(/\./g, '_');
      if (typeof val === 'object' && val !== null) {
        fields.push(`${col} = :${paramName}::jsonb`);
        replacements[paramName] = JSON.stringify(val);
      } else {
        fields.push(`${col} = :${paramName}`);
        replacements[paramName] = val;
      }
    }
    if (fields.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });
    fields.push('updated_at = NOW()');
    const [, meta] = await sequelize.query(
      `UPDATE payroll_components SET ${fields.join(', ')} WHERE id = :id AND tenant_id = :tenantId`,
      { replacements },
    );
    if ((meta as any)?.rowCount === 0) return res.status(404).json({ success: false, error: 'Component not found' });
    const [rows] = await sequelize.query(
      `SELECT * FROM payroll_components WHERE id = :id AND tenant_id = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return res.json({ success: true, data: rows?.[0] });
  } catch (e: any) {
    console.warn('updateComponent error: (table may not exist):', (e as any)?.message || e);
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== DELETE: Component =====
async function deleteComponent(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (!sequelize) return res.json({ success: true, message: 'Deleted (mock)' });
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
  try {
    const [, meta] = await sequelize.query(
      `DELETE FROM payroll_components WHERE id = :id AND tenant_id = :tenantId`,
      { replacements: { id, tenantId } },
    );
    if ((meta as any)?.rowCount === 0) return res.status(404).json({ success: false, error: 'Component not found' });
    return res.json({ success: true, message: 'Component deleted' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== GET: Attendance Summary for Payroll Preview =====
async function getAttendanceSummary(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { periodStart, periodEnd, branchId } = req.query;
  if (!periodStart || !periodEnd) {
    return res.status(400).json({ success: false, error: 'periodStart and periodEnd required' });
  }
  if (!sequelize) return res.json({ success: true, data: [], summary: {} });

  try {
    let empFilter = '';
    const replacements: any = { periodStart, periodEnd };
    if (branchId) { empFilter += ' AND ea.branch_id = :branchId'; replacements.branchId = branchId; }

    const [rows] = await sequelize.query(`
      SELECT
        ea.employee_id,
        e.name AS employee_name,
        e.position,
        e.department,
        e.branch_id,
        COUNT(DISTINCT ea.date) AS total_days_worked,
        COALESCE(SUM(ea.work_hours), 0) AS total_work_hours,
        ROUND(CAST(COALESCE(SUM(ea.overtime_minutes), 0) AS NUMERIC) / 60, 2) AS total_overtime_hours,
        COUNT(DISTINCT CASE WHEN ea.status = 'late' THEN ea.date END) AS late_days,
        COUNT(DISTINCT CASE WHEN ea.status = 'absent' THEN ea.date END) AS absent_days,
        COALESCE(SUM(ea.late_minutes), 0) AS total_late_minutes,
        COALESCE(SUM(ea.early_leave_minutes), 0) AS total_early_leave_minutes,
        AVG(ea.work_hours) FILTER (WHERE ea.work_hours > 0) AS avg_daily_hours,
        -- Get salary base if available
        es.base_salary,
        es.pay_type
      FROM employee_attendance ea
      JOIN employees e ON ea.employee_id = e.id
      LEFT JOIN employee_salaries es ON es.employee_id = e.id AND es.is_active = true
      WHERE ea.date BETWEEN :periodStart AND :periodEnd
        AND ${ACTIVE_EMPLOYEE_FILTER}
        ${empFilter}
      GROUP BY ea.employee_id, e.name, e.position, e.department, e.branch_id, es.base_salary, es.pay_type
      ORDER BY e.name
    `, { replacements });

    // Calculate working days in period
    const start = new Date(periodStart as string);
    const end = new Date(periodEnd as string);
    let workingDays = 0;
    const d = new Date(start);
    while (d <= end) {
      if (d.getDay() !== 0 && d.getDay() !== 6) workingDays++;
      d.setDate(d.getDate() + 1);
    }

    // Get attendance settings for deduction rates
    const [settings] = await sequelize.query(`SELECT * FROM attendance_settings WHERE setting_key IN ('late_policy', 'overtime')`);
    const latePolicy: any = {};
    (settings || []).forEach((s: any) => {
      try {
        const val = typeof s.setting_value === 'string' ? JSON.parse(s.setting_value) : s.setting_value;
        if (s.setting_key === 'late_policy') Object.assign(latePolicy, val);
      } catch (e) {}
    });
    const lateDeductionPerMinute = parseFloat(latePolicy.deduction_per_late) || 0;

    const summary = {
      totalEmployees: rows?.length || 0,
      totalWorkHours: (rows || []).reduce((s: number, r: any) => s + parseFloat(r.total_work_hours || 0), 0),
      totalOvertimeHours: (rows || []).reduce((s: number, r: any) => s + parseFloat(r.total_overtime_hours || 0), 0),
      totalLateDays: (rows || []).reduce((s: number, r: any) => s + parseInt(r.late_days || 0), 0),
      totalAbsentDays: (rows || []).reduce((s: number, r: any) => s + parseInt(r.absent_days || 0), 0),
      workingDays
    };

    return res.json({ success: true, data: rows || [], summary });
  } catch (e: any) {
    return res.json({ success: true, data: [], summary: {}, error: e.message });
  }
}

// ===== POST: Generate Payroll from Attendance =====
async function generatePayrollFromAttendance(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { periodStart, periodEnd, payDate, branchId, department, name, hourlyRate } = req.body;
  if (!periodStart || !periodEnd) {
    return res.status(400).json({ success: false, error: 'periodStart and periodEnd required' });
  }
  if (!sequelize) return res.json({ success: true, message: 'Generated (mock)' });

  try {
    const tenantId = session.user.tenantId;
    const runCode = `PR-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString(36).toUpperCase()}`;

    // Create payroll run
    const [runResult] = await sequelize.query(`
      INSERT INTO payroll_runs (id, tenant_id, run_code, name, period_start, period_end, pay_date,
        pay_type, branch_id, department, status, created_by, created_at, updated_at)
      VALUES (uuid_generate_v4(), :tenantId, :runCode, :name, :periodStart, :periodEnd, :payDate,
        'monthly', :branchId, :dept, 'draft', :createdBy, NOW(), NOW())
      RETURNING *
    `, {
      replacements: {
        tenantId, runCode,
        name: name || `Payroll (Attendance) ${periodStart} - ${periodEnd}`,
        periodStart, periodEnd, payDate: payDate || periodEnd,
        branchId: branchId || null, dept: department || null,
        createdBy: isUuid(session.user.id) ? session.user.id : null
      }
    });
    const run = runResult?.[0];
    if (!run) return res.status(500).json({ success: false, error: 'Failed to create payroll run' });

    // Get attendance summary per employee for the period
    let empFilter = '';
    const replacements: any = { periodStart, periodEnd };
    if (branchId) { empFilter += ' AND ea.branch_id = :branchId'; replacements.branchId = branchId; }

    const [attendanceSummary] = await sequelize.query(`
      SELECT
        ea.employee_id,
        e.name AS employee_name,
        e.position,
        e.department,
        e.branch_id,
        COUNT(DISTINCT ea.date) AS total_days_worked,
        COUNT(DISTINCT CASE WHEN ea.date IS NOT NULL THEN ea.date END) AS total_attendance_days,
        COALESCE(SUM(EXTRACT(EPOCH FROM (ea.clock_out - ea.clock_in)) / 3600), 0) AS total_raw_hours,
        COALESCE(SUM(ea.work_hours), 0) AS total_work_hours,
        COALESCE(SUM(ea.overtime_minutes), 0) AS total_overtime_minutes,
        COUNT(DISTINCT CASE WHEN ea.status = 'late' THEN ea.date END) AS late_days,
        COUNT(DISTINCT CASE WHEN ea.status = 'absent' THEN ea.date END) AS absent_days,
        COALESCE(SUM(ea.late_minutes), 0) AS total_late_minutes,
        COALESCE(SUM(ea.early_leave_minutes), 0) AS total_early_leave_minutes
      FROM employee_attendance ea
      JOIN employees e ON ea.employee_id = e.id
      WHERE ea.date BETWEEN :periodStart AND :periodEnd
        AND ${ACTIVE_EMPLOYEE_FILTER}
        ${empFilter}
      GROUP BY ea.employee_id, e.name, e.position, e.department, e.branch_id
      ORDER BY e.name
    `, { replacements });

    if (!attendanceSummary || attendanceSummary.length === 0) {
      return res.status(400).json({ success: false, error: 'No attendance records found for the period' });
    }

    // Calculate working days in period
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    let workingDays = 0;
    const d = new Date(start);
    while (d <= end) {
      if (d.getDay() !== 0 && d.getDay() !== 6) workingDays++;
      d.setDate(d.getDate() + 1);
    }

    let totalGross = 0, totalDeductions = 0, totalNet = 0, totalAttendanceDeductions = 0;

    // Delete old items for this run (clean slate)
    await sequelize.query(`DELETE FROM payroll_items WHERE payroll_run_id = :runId`, { replacements: { runId: run.id } });

    // Get company attendance settings for deduction rates
    const [settings] = await sequelize.query(`SELECT * FROM attendance_settings WHERE setting_key IN ('late_policy', 'overtime')`);
    const latePolicy: any = {};
    const overtimeSetting: any = {};
    (settings || []).forEach((s: any) => {
      try {
        const val = typeof s.setting_value === 'string' ? JSON.parse(s.setting_value) : s.setting_value;
        if (s.setting_key === 'late_policy') Object.assign(latePolicy, val);
        if (s.setting_key === 'overtime') Object.assign(overtimeSetting, val);
      } catch (e) {}
    });
    const lateDeductionPerMinute = parseFloat(latePolicy.deduction_per_late) || 0;
    const overtimeMultiplier = parseFloat(overtimeSetting.weekday_multiplier) || 1.5;

    for (const emp of attendanceSummary) {
      const empId = emp.employee_id;
      const empName = emp.employee_name;
      const empPosition = emp.position;
      const dept = emp.department;
      const branchId = emp.branch_id;

      const totalWorkHours = parseFloat(emp.total_work_hours) || 0;
      const totalOvertimeMinutes = parseInt(emp.total_overtime_minutes) || 0;
      const totalOvertimeHours = Math.round(totalOvertimeMinutes / 60 * 100) / 100;
      const lateDays = parseInt(emp.late_days) || 0;
      const absentDays = parseInt(emp.absent_days) || 0;
      const totalLateMinutes = parseInt(emp.total_late_minutes) || 0;

      // Get employee salary config
      const [salaryRows] = await sequelize.query(`
        SELECT es.* FROM employee_salaries es
        WHERE es.employee_id = :empId AND es.is_active = true
        ORDER BY es.effective_date DESC LIMIT 1
      `, { replacements: { empId } });
      const salary = salaryRows?.[0];
      const baseSalary = salary ? parseFloat(salary.base_salary) || 0 : 0;

      // Calculate effective base pay
      let effectiveBaseSalary = baseSalary;
      if (salary) {
        if (salary.pay_type === 'hourly') {
          const hourRate = parseFloat(salary.hourly_rate) || (baseSalary / 173);
          effectiveBaseSalary = hourRate * (parseFloat(salary.weekly_hours) || 40) * 4.33;
        } else if (salary.pay_type === 'daily') {
          const dayRate = parseFloat(salary.daily_rate) || (baseSalary / workingDays);
          effectiveBaseSalary = dayRate * workingDays;
        } else if (salary.pay_type === 'weekly') {
          effectiveBaseSalary = baseSalary * 4.33;
        }
      }

      // Calculate overtime pay
      const hourlyRateCalc = salary ? (parseFloat(salary.hourly_rate) || (baseSalary > 0 ? baseSalary / 173 : (hourlyRate || 15000))) : (hourlyRate || 15000);
      const overtimePay = Math.round(totalOvertimeHours * hourlyRateCalc * overtimeMultiplier);

      // Calculate attendance-based deductions
      // Late deduction: per-minute deduction from base salary
      const lateDeduction = lateDeductionPerMinute > 0
        ? Math.round(totalLateMinutes * lateDeductionPerMinute)
        : 0;

      // Absent deduction: for each absent day, deduct 1 day's worth of salary
      const dailyRateCalc = salary
        ? (parseFloat(salary.daily_rate) || (baseSalary > 0 ? baseSalary / workingDays : 0))
        : (baseSalary > 0 ? baseSalary / workingDays : 0);
      const absentDeduction = Math.round(absentDays * dailyRateCalc);

      // Attendance deduction total
      const attendanceDeduction = lateDeduction + absentDeduction;

      // Build earnings and deductions arrays
      const earnings = [
        { code: 'BASIC', name: 'Gaji Pokok', amount: Math.round(effectiveBaseSalary) },
        { code: 'HADIR', name: `Hadir ${emp.total_days_worked} hari`, amount: 0 },
      ];
      const deductions: any[] = [];

      if (totalOvertimeHours > 0) {
        earnings.push({ code: 'OVERTIME', name: `Lembur ${totalOvertimeHours} jam`, amount: overtimePay });
      }

      if (lateDays > 0) {
        deductions.push({ code: 'LATE', name: `Terlambat ${lateDays} hari (${totalLateMinutes} menit)`, amount: lateDeduction });
      }

      if (absentDays > 0) {
        deductions.push({ code: 'ABSENT', name: `Tidak Hadir ${absentDays} hari`, amount: absentDeduction });
      }

      const totalEarnings = earnings.reduce((s, e) => s + e.amount, 0);
      const totalDeductionsAmt = deductions.reduce((s, d) => s + d.amount, 0);
      const grossSalary = totalEarnings;
      const netSalary = Math.max(0, grossSalary - totalDeductionsAmt);

      // Insert payroll item (compatible with base + extended columns)
      const totalAllowances = Math.max(0, totalEarnings - effectiveBaseSalary);
      const componentsJson = JSON.stringify({ earnings, deductions });
      const absentDaysEmp = parseInt(emp.absent_days) || 0;
      const totalOvertimeHoursEmp = Math.round((parseInt(emp.total_overtime_minutes) || 0) / 60 * 100) / 100;

      await sequelize.query(`
        INSERT INTO payroll_items (
          id, payroll_run_id, employee_id, employee_salary_id,
          working_days, present_days, absent_days, overtime_hours,
          base_salary, total_allowances, total_deductions, overtime_amount,
          gross_salary, tax_amount, net_salary, components, status,
          employee_name, employee_position, department, branch_id, pay_type,
          actual_working_days, earnings, deductions, total_earnings,
          created_at, updated_at
        ) VALUES (
          uuid_generate_v4(), :runId, :empId, :salaryId,
          :workDays, :presentDays, :absentDays, :overtimeHours,
          :baseSalary, :totalAllowances, :totalDeductionsAmt, :overtimePay,
          :grossSalary, 0, :netSalary, :components::jsonb, 'calculated',
          :empName, :empPos, :dept, :branchId, :payType,
          :actualDays, :earnings::jsonb, :deductions::jsonb, :totalEarnings,
          NOW(), NOW()
        )
      `, {
        replacements: {
          runId: run.id, empId, salaryId: salary?.id || null, empName, empPos: empPosition || null,
          dept: dept || null, branchId: branchId || null, payType: salary?.pay_type || 'monthly',
          workDays: workingDays, presentDays: Math.max(0, (emp.total_days_worked || 0)),
          absentDays: absentDaysEmp, overtimeHours: totalOvertimeHoursEmp,
          actualDays: emp.total_days_worked || 0, baseSalary: effectiveBaseSalary,
          totalAllowances, totalDeductionsAmt, overtimePay, grossSalary, netSalary,
          earnings: JSON.stringify(earnings), deductions: JSON.stringify(deductions),
          components: componentsJson, totalEarnings,
        }
      });

      totalGross += grossSalary;
      totalDeductions += totalDeductionsAmt;
      totalNet += netSalary;
      totalAttendanceDeductions += attendanceDeduction;
    }

    // Update run totals
    await sequelize.query(`
      UPDATE payroll_runs SET total_employees = :empCount, total_gross = :gross,
        total_deductions = :deductions, total_net = :net, status = 'calculated', updated_at = NOW()
      WHERE id = :runId
    `, {
      replacements: {
        runId: run.id, empCount: attendanceSummary.length,
        gross: totalGross, deductions: totalDeductions, net: totalNet
      }
    });

    return res.json({
      success: true,
      message: `Payroll generated from attendance for ${attendanceSummary.length} employees`,
      data: run,
      summary: {
        totalEmployees: attendanceSummary.length,
        totalGross, totalDeductions, totalNet,
        totalAttendanceDeductions,
        details: attendanceSummary.map((emp: any) => ({
          employee: emp.employee_name,
          totalWorkHours: parseFloat(emp.total_work_hours) || 0,
          overtimeHours: Math.round(parseInt(emp.total_overtime_minutes) / 60 * 100) / 100,
          lateDays: parseInt(emp.late_days) || 0,
          absentDays: parseInt(emp.absent_days) || 0,
        }))
      }
    });
  } catch (e: any) {
    console.warn('generatePayrollFromAttendance error: (table may not exist):', (e as any)?.message || e);
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== GET: Payroll preflight validation =====
async function getPayrollPreflight(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) {
    return res.json({ success: true, ready: false, totalActive: 0, issues: [], message: 'Database tidak tersedia' });
  }
  try {
    const { runPayrollPreflight } = await import('@/lib/hris/compliance-data');
    const result = await runPayrollPreflight(sequelize, session.user.tenantId);
    return res.json({ success: true, ...result });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== POST: Sync approved overtime → attendance for payroll =====
async function syncOvertimeToAttendance(req: NextApiRequest, res: NextApiResponse, session: any) {
  const period = String(req.body?.period || new Date().toISOString().slice(0, 7));
  const [yr, mo] = period.split('-').map((x: string) => parseInt(x, 10));
  if (!sequelize) return res.status(503).json({ success: false, error: 'Database tidak tersedia' });

  const tenantId = session.user.tenantId;
  try {
    const [approved] = await sequelize.query(`
      SELECT o.employee_id, o.date,
             COALESCE(o.duration_hours, EXTRACT(EPOCH FROM (o.end_time::time - o.start_time::time)) / 3600, 0) AS hours
      FROM overtime_requests o
      WHERE o.status = 'approved'
        AND EXTRACT(YEAR FROM o.date) = :yr AND EXTRACT(MONTH FROM o.date) = :mo
        ${tenantId ? 'AND o.tenant_id = :tenantId' : ''}
    `, { replacements: { yr, mo, tenantId } });

    let synced = 0;
    for (const row of (approved as any[]) || []) {
      const minutes = Math.round(Number(row.hours || 0) * 60);
      if (minutes <= 0) continue;
      await sequelize.query(`
        INSERT INTO employee_attendance (id, employee_id, date, status, overtime_minutes, created_at, updated_at)
        VALUES (uuid_generate_v4(), :empId, :date, 'present', :minutes, NOW(), NOW())
        ON CONFLICT (employee_id, date) DO UPDATE SET
          overtime_minutes = GREATEST(COALESCE(employee_attendance.overtime_minutes, 0), :minutes),
          updated_at = NOW()
      `, { replacements: { empId: row.employee_id, date: row.date, minutes } }).catch(async () => {
        await sequelize.query(`
          UPDATE employee_attendance SET overtime_minutes = GREATEST(COALESCE(overtime_minutes, 0), :minutes), updated_at = NOW()
          WHERE employee_id = :empId AND date = :date
        `, { replacements: { empId: row.employee_id, date: row.date, minutes } });
      });
      synced++;
    }

    return res.json({
      success: true,
      message: `${synced} record lembur disinkronkan ke absensi untuk periode ${period}`,
      synced,
      period,
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== Helper: PTKP (Tax-free income) =====
function getPTKP(status: string): number {
  const ptkpMap: Record<string, number> = {
    'TK/0': 54000000, 'TK/1': 58500000, 'TK/2': 63000000, 'TK/3': 67500000,
    'K/0': 58500000, 'K/1': 63000000, 'K/2': 67500000, 'K/3': 72000000,
  };
  return ptkpMap[status] || 54000000;
}

// ===== Helper: PPh21 Calculation =====
function calculatePPh21(pkp: number): number {
  if (pkp <= 0) return 0;
  let tax = 0;
  // Progressive tax brackets (2024 Indonesia)
  if (pkp > 5000000000) { tax += (pkp - 5000000000) * 0.35; pkp = 5000000000; }
  if (pkp > 500000000) { tax += (pkp - 500000000) * 0.30; pkp = 500000000; }
  if (pkp > 250000000) { tax += (pkp - 250000000) * 0.25; pkp = 250000000; }
  if (pkp > 60000000) { tax += (pkp - 60000000) * 0.15; pkp = 60000000; }
  tax += pkp * 0.05;
  return Math.round(tax);
}

// ===== GET: THR Report =====
async function getTHR(req: NextApiRequest, res: NextApiResponse, session: any) {
  const tenantId = session.user.tenantId;
  const year = parseInt(String(req.query.year || new Date().getFullYear()));
  const minimumMonths = parseInt(String(req.query.minimumMonths || 1));
  const includeAllowances = String(req.query.includeAllowances || 'true') === 'true';
  const refDate = String(req.query.refDate || `${year}-06-01`);
  try {
    if (!sequelize) return res.json({ success: true, data: [] });
    const [rows] = await sequelize.query(`
      SELECT e.id, COALESCE(e.employee_code, e.employee_id::text, e.id::text) AS employee_id,
             e.name, e.position, e.department,
             COALESCE(e.hire_date, e.created_at::date, CURRENT_DATE - INTERVAL '1 year') AS join_date,
             COALESCE(es.base_salary, 0) AS base_salary,
             ${ALLOWANCE_SUBQUERY} AS allowances
      FROM employees e
      LEFT JOIN employee_salaries es ON es.employee_id = e.id AND es.is_active = true
      WHERE ${ACTIVE_EMPLOYEE_FILTER} ${tenantId ? 'AND e.tenant_id = :tenantId' : ''}
      ORDER BY e.name
    `, { replacements: { tenantId } });
    const items = (rows || []).map((r: any) => {
      const joinDate = new Date(r.join_date);
      const ref = new Date(refDate);
      const months = Math.max(0, Math.floor((ref.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const fullAmount = includeAllowances ? Number(r.base_salary) + Number(r.allowances) : Number(r.base_salary);
      let thr_amount = 0, status = 'not_eligible', calculation = `Belum memenuhi syarat (<${minimumMonths} bulan)`;
      if (months >= minimumMonths) {
        if (months >= 12) { thr_amount = fullAmount; status = 'eligible'; calculation = '1 bulan gaji (>12 bulan)'; }
        else { thr_amount = Math.round(fullAmount * months / 12); status = 'prorata'; calculation = `Prorata ${months}/12 bulan`; }
      }
      return {
        id: r.id, employee_id: r.employee_id || r.id, employee_name: r.name,
        position: r.position, department: r.department, join_date: r.join_date,
        months_worked: months, base_salary: Number(r.base_salary), allowances: Number(r.allowances),
        thr_amount, calculation, status
      };
    });
    return res.json({ success: true, data: items });
  } catch (e: any) {
    return res.json({ success: true, data: [], error: e.message });
  }
}

// ===== GET: BPJS Report =====
async function getBPJS(req: NextApiRequest, res: NextApiResponse, session: any) {
  const tenantId = session.user.tenantId;
  try {
    if (!sequelize) return res.json({ success: true, data: [] });
    const [rows] = await sequelize.query(`
      SELECT e.id, COALESCE(e.employee_code, e.employee_id::text, e.id::text) AS employee_id,
             e.name, e.position, e.department,
             es.base_salary, es.bpjs_kesehatan_number, es.bpjs_ketenagakerjaan_number
      FROM employees e
      LEFT JOIN employee_salaries es ON es.employee_id = e.id AND es.is_active = true
      WHERE ${ACTIVE_EMPLOYEE_FILTER} ${tenantId ? 'AND e.tenant_id = :tenantId' : ''}
      ORDER BY e.name
    `, { replacements: { tenantId } });
    const CAP_KESEHATAN = 12000000;
    const CAP_JP = 10547400;
    const items = (rows || []).map((r: any) => {
      const base = Number(r.base_salary || 0);
      const bpjsKesEmployee = Math.round(Math.min(base, CAP_KESEHATAN) * 0.01);
      const bpjsKesEmployer = Math.round(Math.min(base, CAP_KESEHATAN) * 0.04);
      const jhtEmployee = Math.round(base * 0.02);
      const jhtEmployer = Math.round(base * 0.037);
      const jkk = Math.round(base * 0.0024);
      const jkm = Math.round(base * 0.003);
      const jpEmployee = Math.round(Math.min(base, CAP_JP) * 0.01);
      const jpEmployer = Math.round(Math.min(base, CAP_JP) * 0.02);
      const employeeTotal = bpjsKesEmployee + jhtEmployee + jpEmployee;
      const employerTotal = bpjsKesEmployer + jhtEmployer + jkk + jkm + jpEmployer;
      return {
        id: r.id, employee_id: r.employee_id || r.id, employee_name: r.name,
        position: r.position, department: r.department, base_salary: base,
        bpjs_kesehatan_number: r.bpjs_kesehatan_number, bpjs_tk_number: r.bpjs_ketenagakerjaan_number,
        bpjs_kesehatan_employee: bpjsKesEmployee, bpjs_kesehatan_employer: bpjsKesEmployer,
        jht_employee: jhtEmployee, jht_employer: jhtEmployer,
        jkk, jkm, jp_employee: jpEmployee, jp_employer: jpEmployer,
        employee_total: employeeTotal, employer_total: employerTotal, grand_total: employeeTotal + employerTotal
      };
    });
    return res.json({ success: true, data: items });
  } catch (e: any) {
    return res.json({ success: true, data: [], error: e.message });
  }
}

// ===== GET: PPh21 Report =====
async function getPPh21Report(req: NextApiRequest, res: NextApiResponse, session: any) {
  const tenantId = session.user.tenantId;
  try {
    if (!sequelize) return res.json({ success: true, data: [] });
    const [rows] = await sequelize.query(`
      SELECT e.id, COALESCE(e.employee_code, e.employee_id::text, e.id::text) AS employee_id,
             e.name, e.position, e.department,
             es.base_salary, ${ALLOWANCE_SUBQUERY} AS total_allowances,
             es.tax_status, es.npwp
      FROM employees e
      LEFT JOIN employee_salaries es ON es.employee_id = e.id AND es.is_active = true
      WHERE ${ACTIVE_EMPLOYEE_FILTER} ${tenantId ? 'AND e.tenant_id = :tenantId' : ''}
      ORDER BY e.name
    `, { replacements: { tenantId } });
    const items = (rows || []).map((r: any) => {
      const gross = (Number(r.base_salary || 0) + Number(r.total_allowances || 0)) * 12;
      const biayaJabatan = Math.min(gross * 0.05, 6000000);
      const netto = gross - biayaJabatan;
      const status = r.tax_status || 'TK/0';
      const ptkp = getPTKP(status);
      const pkp = Math.max(0, netto - ptkp);
      const tax = calculatePPh21(pkp);
      return {
        id: r.id, employee_id: r.employee_id || r.id, employee_name: r.name,
        position: r.position, department: r.department, npwp: r.npwp,
        tax_status: status, gross_income: gross, biaya_jabatan: biayaJabatan,
        netto_income: netto, ptkp, pkp, pph21_annual: tax, pph21_monthly: Math.round(tax / 12)
      };
    });
    return res.json({ success: true, data: items });
  } catch (e: any) {
    return res.json({ success: true, data: [], error: e.message });
  }
}

// ===== GET: Lembur Report =====
async function getLemburReport(req: NextApiRequest, res: NextApiResponse, session: any) {
  const tenantId = session.user.tenantId;
  const period = String(req.query.period || new Date().toISOString().slice(0, 7));
  const [yr, mo] = period.split('-').map((x) => parseInt(x));
  try {
    if (!sequelize) return res.json({ success: true, data: [], summary: {} });
    const [rows] = await sequelize.query(`
      SELECT e.id, COALESCE(e.employee_code, e.employee_id::text, e.id::text) AS employee_id,
             e.name, e.position, e.department,
             es.base_salary,
             COALESCE(SUM(ea.overtime_minutes),0) AS total_minutes,
             COUNT(DISTINCT CASE WHEN ea.overtime_minutes>0 THEN ea.date END) AS days_worked
      FROM employees e
      LEFT JOIN employee_salaries es ON es.employee_id = e.id AND es.is_active = true
      LEFT JOIN employee_attendance ea ON ea.employee_id = e.id
        AND EXTRACT(YEAR FROM ea.date) = :yr AND EXTRACT(MONTH FROM ea.date) = :mo
      WHERE ${ACTIVE_EMPLOYEE_FILTER} ${tenantId ? 'AND e.tenant_id = :tenantId' : ''}
      GROUP BY e.id, e.employee_code, e.employee_id, e.name, e.position, e.department, es.base_salary
      ORDER BY total_minutes DESC
    `, { replacements: { tenantId, yr, mo } });
    const items = (rows || []).map((r: any) => {
      const hours = Number(r.total_minutes || 0) / 60;
      const base = Number(r.base_salary || 0);
      const hourlyRate = base / 173;
      const amount = Math.round(hours * hourlyRate * 1.5);
      return {
        id: r.id, employee_id: r.employee_id || r.id, employee_name: r.name,
        position: r.position, department: r.department,
        hours: Math.round(hours * 10) / 10, days_worked: Number(r.days_worked || 0),
        hourly_rate: Math.round(hourlyRate), amount, status: 'approved', period
      };
    }).filter((it: any) => it.hours > 0);
    const summary = {
      totalEmployees: items.length,
      totalHours: items.reduce((s: number, x: any) => s + x.hours, 0),
      totalAmount: items.reduce((s: number, x: any) => s + x.amount, 0),
    };
    return res.json({ success: true, data: items, summary });
  } catch (e: any) {
    return res.json({ success: true, data: [], summary: {}, error: e.message });
  }
}

// ===== GET: Laporan (Payroll Analytics) =====
async function getLaporan(req: NextApiRequest, res: NextApiResponse, session: any) {
  const tenantId = session.user.tenantId;
  try {
    if (!sequelize) return res.json({ success: true, monthly: [], byDepartment: [], distribution: [] });
    // Monthly from payroll_runs
    const [monthlyRows] = await sequelize.query(`
      SELECT TO_CHAR(period_start, 'YYYY-MM') AS month,
             SUM(total_gross) AS gross, SUM(total_net) AS net,
             SUM(total_tax) AS tax, SUM(total_bpjs) AS bpjs
      FROM payroll_runs
      WHERE status IN ('paid','approved','calculated') ${tenantId ? 'AND tenant_id = :tenantId' : ''}
      GROUP BY 1 ORDER BY 1 DESC LIMIT 12
    `, { replacements: { tenantId } });
    // Department breakdown
    const [deptRows] = await sequelize.query(`
      SELECT e.department, COUNT(DISTINCT e.id) AS employees,
             SUM(COALESCE(es.base_salary,0)) AS total_basic
      FROM employees e
      LEFT JOIN employee_salaries es ON es.employee_id = e.id AND es.is_active = true
      WHERE ${ACTIVE_EMPLOYEE_FILTER} ${tenantId ? 'AND e.tenant_id = :tenantId' : ''}
      GROUP BY e.department ORDER BY total_basic DESC
    `, { replacements: { tenantId } });
    // Salary distribution buckets
    const [distRows] = await sequelize.query(`
      SELECT
        CASE
          WHEN base_salary < 5000000 THEN '<5jt'
          WHEN base_salary < 10000000 THEN '5-10jt'
          WHEN base_salary < 15000000 THEN '10-15jt'
          WHEN base_salary < 25000000 THEN '15-25jt'
          ELSE '>25jt'
        END AS bucket,
        COUNT(*) AS c
      FROM employee_salaries WHERE is_active = true
      GROUP BY bucket ORDER BY bucket
    `);
    const hasLive = (monthlyRows?.length || 0) > 0 || (deptRows?.length || 0) > 0 || (distRows?.length || 0) > 0;
    return res.json({
      success: true,
      monthly: (monthlyRows || []).reverse(),
      byDepartment: deptRows || [],
      distribution: distRows || [],
      dataSource: hasLive ? 'live' : 'empty',
    });
  } catch (e: any) {
    return res.json({ success: true, monthly: [], byDepartment: [], distribution: [], error: e.message });
  }
}

// ===== GET: Export CSV =====
async function exportPayrollData(req: NextApiRequest, res: NextApiResponse, session: any) {
  const type = String(req.query.type || 'payslip');
  const BOM = '\uFEFF';

  const captureJson = async (fn: (req: NextApiRequest, res: NextApiResponse, session: any) => Promise<any>) => {
    let payload: any = null;
    const mockRes = {
      json: (data: any) => { payload = data; return mockRes; },
      status: () => mockRes,
    } as unknown as NextApiResponse;
    await fn(req, mockRes, session);
    return payload;
  };

  const sendCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    let csv = BOM + headers.map(h => `"${h}"`).join(',') + '\n';
    for (const row of rows) {
      csv += row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  };

  try {
    if (type === 'thr') {
      const year = parseInt(String(req.query.year || new Date().getFullYear()));
      const payload = await captureJson(getTHR);
      const data = payload?.data || [];
      return sendCsv(`thr_${year}.csv`,
        ['Kode', 'Nama', 'Jabatan', 'Departemen', 'Masa Kerja (bln)', 'Gaji Pokok', 'Tunjangan', 'THR', 'Status', 'Perhitungan'],
        data.map((r: any) => [r.employee_id, r.employee_name, r.position, r.department, r.months_worked, r.base_salary, r.allowances, r.thr_amount, r.status, r.calculation])
      );
    }

    if (type === 'bpjs') {
      const payload = await captureJson(getBPJS);
      const data = payload?.data || [];
      return sendCsv(`bpjs_${new Date().toISOString().slice(0, 7)}.csv`,
        ['Nama', 'Jabatan', 'Departemen', 'Gaji Pokok', 'BPJS Kes (Karyawan)', 'BPJS Kes (Perusahaan)', 'JHT (Karyawan)', 'JHT (Perusahaan)', 'JP (Karyawan)', 'JP (Perusahaan)', 'JKK', 'JKM', 'Total Karyawan', 'Total Perusahaan'],
        data.map((r: any) => [r.employee_name, r.position, r.department, r.base_salary, r.bpjs_kesehatan_employee, r.bpjs_kesehatan_employer, r.jht_employee, r.jht_employer, r.jp_employee, r.jp_employer, r.jkk, r.jkm, r.employee_total, r.employer_total])
      );
    }

    if (type === 'pph21') {
      const payload = await captureJson(getPPh21Report);
      const data = payload?.data || [];
      return sendCsv(`pph21_${new Date().getFullYear()}.csv`,
        ['Nama', 'Jabatan', 'Departemen', 'NPWP', 'Status PTKP', 'Penghasilan Bruto/Tahun', 'Biaya Jabatan', 'Penghasilan Neto', 'PTKP', 'PKP', 'PPh21/Tahun', 'PPh21/Bulan'],
        data.map((r: any) => [r.employee_name, r.position, r.department, r.npwp || '-', r.tax_status, r.gross_income, r.biaya_jabatan, r.netto_income, r.ptkp, r.pkp, r.pph21_annual, r.pph21_monthly])
      );
    }

    if (type === 'payslip') {
      const payload = await captureJson(getPayslip);
      const data = payload?.data || [];
      return sendCsv(`slip_gaji_${new Date().toISOString().slice(0, 7)}.csv`,
        ['Nama', 'Jabatan', 'Departemen', 'Periode', 'Gaji Kotor', 'Potongan', 'Pajak', 'Gaji Bersih', 'Status'],
        data.map((r: any) => [r.employee_name, r.employee_position, r.department, `${r.period_start} - ${r.period_end}`, r.total_earnings, r.total_deductions, r.tax_amount, r.net_salary, r.run_status])
      );
    }

    if (type === 'salaries') {
      const payload = await captureJson(getEmployeeSalaries);
      const data = payload?.data || [];
      return sendCsv(`konfigurasi_gaji_${new Date().toISOString().slice(0, 7)}.csv`,
        ['Kode', 'Nama', 'Jabatan', 'Departemen', 'Tipe Gaji', 'Gaji Pokok', 'Bank', 'No Rekening', 'Status PTKP'],
        data.map((r: any) => [r.emp_code || r.employee_id, r.employee_name, r.position, r.department, r.pay_type, r.base_salary, r.bank_name || '-', r.bank_account_number || '-', r.tax_status || 'TK/0'])
      );
    }

    return res.status(400).json({ success: false, error: 'Unknown export type. Use: thr, bpjs, pph21, payslip, salaries' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== Mock Components =====
async function getFrequencyOptions(_req: NextApiRequest, res: NextApiResponse) {
  const { getFrequencyOptions: getOpts, getFrequencyPeriod, generateRunCode } = await import('@/lib/hris/payroll-frequency');
  const frequencies = getOpts();
  const current = {
    daily: getFrequencyPeriod('daily'),
    weekly: getFrequencyPeriod('weekly'),
    monthly: getFrequencyPeriod('monthly'),
  };
  const runCodes = {
    daily: generateRunCode('daily'),
    weekly: generateRunCode('weekly'),
    monthly: generateRunCode('monthly'),
  };
  return res.json({ success: true, data: { frequencies, current, runCodes } });
}

function getMockComponents() {
  return [
    { id: '1', code: 'BASIC', name: 'Gaji Pokok', type: 'earning', category: 'fixed', calculation_type: 'fixed', default_amount: 0, is_taxable: true, is_mandatory: true },
    { id: '2', code: 'TRANSPORT', name: 'Tunjangan Transportasi', type: 'earning', category: 'fixed', calculation_type: 'fixed', default_amount: 500000, is_taxable: false },
    { id: '3', code: 'MEAL', name: 'Tunjangan Makan', type: 'earning', category: 'daily', calculation_type: 'per_day', default_amount: 35000, is_taxable: false },
    { id: '4', code: 'OVERTIME', name: 'Lembur', type: 'earning', category: 'variable', calculation_type: 'formula', default_amount: 0, is_taxable: true },
    { id: '5', code: 'PPH21', name: 'PPh 21', type: 'deduction', category: 'calculated', calculation_type: 'formula', default_amount: 0, is_taxable: true, is_mandatory: true },
    { id: '6', code: 'BPJS_KES', name: 'BPJS Kesehatan', type: 'deduction', category: 'calculated', calculation_type: 'percentage', default_amount: 0, is_mandatory: true },
    { id: '7', code: 'BPJS_JHT', name: 'BPJS JHT', type: 'deduction', category: 'calculated', calculation_type: 'percentage', default_amount: 0, is_mandatory: true },
  ];
}

async function getFiscalSignoff(_req: NextApiRequest, res: NextApiResponse, session: any) {
  const { FISCAL_ENGINE, ensurePayrollAuditTable } = await import('@/lib/hris/payroll-audit');
  const { getPTKP, calculatePPh21Annual } = await import('@/lib/hris/pph21-calc');
  const tenantId = session?.user?.tenantId || null;
  await ensurePayrollAuditTable(sequelize);

  let lastApproved: any = null;
  let auditCount = 0;
  if (sequelize && tenantId) {
    try {
      const [runs] = await sequelize.query(
        `SELECT id, run_code, status, approved_at, paid_at, period_start, period_end
         FROM payroll_runs WHERE tenant_id = :tid AND status IN ('approved','paid','released')
         ORDER BY COALESCE(approved_at, updated_at) DESC NULLS LAST LIMIT 1`,
        { replacements: { tid: tenantId } }
      );
      lastApproved = (runs as any[])?.[0] || null;
    } catch { /* */ }
    try {
      const [c] = await sequelize.query(
        `SELECT COUNT(*)::int AS c FROM payroll_audit_events WHERE tenant_id = :tid`,
        { replacements: { tid: tenantId } }
      );
      auditCount = (c as any[])?.[0]?.c || 0;
    } catch { /* */ }
  }

  const sampleTax = calculatePPh21Annual(100_000_000);
  const signedOff = String(process.env.HUMANIFY_FISCAL_SIGNED_OFF || '').toLowerCase() === 'true';

  return res.json({
    success: true,
    data: {
      engine: FISCAL_ENGINE,
      signedOff,
      sample: { ptkpTK0: getPTKP('TK/0'), pkp100MTax: sampleTax },
      lastApprovedRun: lastApproved,
      auditEventCount: auditCount,
      checklistPath: 'docs/humanify-payroll-fiscal-signoff.md',
    },
  });
}

async function getPayrollAudit(req: NextApiRequest, res: NextApiResponse, session: any) {
  const tenantId = session?.user?.tenantId;
  if (!tenantId || !sequelize) return res.json({ success: true, data: [] });
  const { ensurePayrollAuditTable } = await import('@/lib/hris/payroll-audit');
  await ensurePayrollAuditTable(sequelize);
  const limit = Math.min(100, parseInt(String(req.query.limit || '30'), 10) || 30);
  const runId = req.query.runId as string | undefined;
  try {
    let sql = `SELECT * FROM payroll_audit_events WHERE tenant_id = :tid`;
    const replacements: any = { tid: tenantId, lim: limit };
    if (runId) {
      sql += ` AND payroll_run_id = :runId`;
      replacements.runId = runId;
    }
    sql += ` ORDER BY created_at DESC LIMIT :lim`;
    const [rows] = await sequelize.query(sql, { replacements });
    return res.json({ success: true, data: rows || [] });
  } catch (e: any) {
    return res.json({ success: true, data: [], warning: e.message });
  }
}
