import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

let sequelize: any;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

let PayrollComponent: any, EmployeeSalary: any, PayrollRun: any;
try {
  PayrollComponent = require('../../../../models/PayrollComponent');
  EmployeeSalary = require('../../../../models/EmployeeSalary');
  PayrollRun = require('../../../../models/PayrollRun');
} catch (e) { console.warn('Payroll models not loaded:', e); }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { action } = req.query;

    switch (req.method) {
      case 'GET':
        if (action === 'components') return getComponents(req, res, session);
        if (action === 'employee-salary') return getEmployeeSalary(req, res, session);
        if (action === 'employee-salaries') return getEmployeeSalaries(req, res, session);
        if (action === 'runs') return getPayrollRuns(req, res, session);
        if (action === 'payslip') return getPayslip(req, res, session);
        if (action === 'thr') return getTHR(req, res, session);
        if (action === 'bpjs') return getBPJS(req, res, session);
        if (action === 'pph21') return getPPh21Report(req, res, session);
        if (action === 'lembur') return getLemburReport(req, res, session);
        if (action === 'laporan') return getLaporan(req, res, session);
        if (action === 'attendance-summary') return getAttendanceSummary(req, res, session);
        return getOverview(req, res, session);
      case 'POST':
        if (action === 'employee-salary') return upsertEmployeeSalary(req, res, session);
        if (action === 'run') return createPayrollRun(req, res, session);
        if (action === 'calculate') return calculatePayroll(req, res, session);
        if (action === 'approve') return approvePayroll(req, res, session);
        if (action === 'component') return createComponent(req, res, session);
        if (action === 'generate-from-attendance') return generatePayrollFromAttendance(req, res, session);
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
    console.error('Payroll API Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ===== GET: Overview =====
async function getOverview(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    const tenantId = session.user.tenantId;

    // Payroll components
    let components: any[] = [];
    if (PayrollComponent) {
      const where: any = { isActive: true };
      if (tenantId) where.tenantId = tenantId;
      components = await PayrollComponent.findAll({ where, order: [['sort_order', 'ASC']] });
    }
    if (components.length === 0) components = getMockComponents();

    // Recent payroll runs
    let runs: any[] = [];
    if (PayrollRun) {
      const where: any = {};
      if (tenantId) where.tenantId = tenantId;
      runs = await PayrollRun.findAll({ where, order: [['created_at', 'DESC']], limit: 10 });
    }

    // Employee salary configs count
    let salaryCount = 0;
    if (sequelize) {
      try {
        const [r] = await sequelize.query(`SELECT COUNT(*) as c FROM employee_salaries WHERE is_active = true`);
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

    if (sequelize) {
      try {
        const [empCount] = await sequelize.query(`SELECT COUNT(*) as c FROM employees WHERE status = 'ACTIVE'`);
        stats.totalEmployees = parseInt(empCount?.[0]?.c || '0');

        const [totalSalary] = await sequelize.query(`SELECT COALESCE(SUM(base_salary), 0) as total FROM employee_salaries WHERE is_active = true`);
        stats.monthlyPayroll = parseFloat(totalSalary?.[0]?.total || '0');
      } catch (e) {}
    }

    return res.json({
      success: true,
      components: components.map((c: any) => c.toJSON ? c.toJSON() : c),
      runs: runs.map((r: any) => r.toJSON ? r.toJSON() : r),
      stats
    });
  } catch (e: any) {
    return res.json({
      success: true,
      components: getMockComponents(),
      runs: [],
      stats: { totalEmployees: 8, configuredSalaries: 0, totalComponents: 15, lastPayrollRun: null, monthlyPayroll: 0 }
    });
  }
}

// ===== GET: Components =====
async function getComponents(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    if (!PayrollComponent) return res.json({ success: true, data: getMockComponents() });
    const components = await PayrollComponent.findAll({ order: [['sort_order', 'ASC']] });
    return res.json({ success: true, data: components.length > 0 ? components : getMockComponents() });
  } catch (e) {
    return res.json({ success: true, data: getMockComponents() });
  }
}

// ===== GET: Employee Salaries =====
async function getEmployeeSalaries(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    if (!sequelize) return res.json({ success: true, data: [] });
    const [rows] = await sequelize.query(`
      SELECT es.*, e.name as employee_name, e.position, e.department, e.employee_id as emp_code,
             b.name as branch_name
      FROM employee_salaries es
      JOIN employees e ON es.employee_id = e.id
      LEFT JOIN branches b ON e.branch_id = b.id
      WHERE es.is_active = true
      ORDER BY e.name
    `);
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
    bpjsKetenagakerjaanNumber, npwp, components } = req.body;

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
        bpjs_kesehatan_number, bpjs_ketenagakerjaan_number, npwp, is_active, created_at, updated_at)
      VALUES (uuid_generate_v4(), :tenantId, :empId, :payType, :baseSalary,
        :hourlyRate, :dailyRate, :weeklyHours, :otMult, :otHolidayMult,
        :taxStatus, :taxMethod, :bankName, :bankAccNum, :bankAccName,
        :bpjsKes, :bpjsTk, :npwp, true, NOW(), NOW())
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
        npwp: npwp || null
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
    if (!PayrollRun) return res.json({ success: true, data: [] });
    const runs = await PayrollRun.findAll({ order: [['created_at', 'DESC']], limit: 20 });
    return res.json({ success: true, data: runs });
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
        department: department || null, createdBy: session.user.id
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

  try {
    // Get the run
    const [runs] = await sequelize.query(`SELECT * FROM payroll_runs WHERE id = :id`, { replacements: { id: runId } });
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
    let empFilter = 'WHERE es.is_active = true AND e.status = \'ACTIVE\'';
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
      let payTypeMultiplier = 1;

      // Calculate base pay based on pay type
      let effectiveBaseSalary = baseSalary;
      if (emp.pay_type === 'hourly') {
        const hourlyRate = parseFloat(emp.hourly_rate) || (baseSalary / 173); // 173 = avg monthly hours
        effectiveBaseSalary = hourlyRate * (parseFloat(emp.weekly_hours) || 40) * 4.33;
      } else if (emp.pay_type === 'daily') {
        const dailyRate = parseFloat(emp.daily_rate) || (baseSalary / workingDays);
        effectiveBaseSalary = dailyRate * workingDays;
      } else if (emp.pay_type === 'weekly') {
        effectiveBaseSalary = baseSalary * 4.33;
      }

      // === ATTENDANCE INTEGRATION: Get attendance data for this employee in the period ===
      let attendanceData: any = { totalWorkHours: 0, totalOvertimeMinutes: 0, lateDays: 0, absentDays: 0, totalLateMinutes: 0 };
      try {
        const [attRows] = await sequelize.query(`
          SELECT
            COALESCE(SUM(work_hours), 0) AS total_work_hours,
            COALESCE(SUM(overtime_minutes), 0) AS total_overtime_minutes,
            COUNT(DISTINCT CASE WHEN status = 'late' THEN date END) AS late_days,
            COUNT(DISTINCT CASE WHEN status = 'absent' THEN date END) AS absent_days,
            COALESCE(SUM(late_minutes), 0) AS total_late_minutes
          FROM employee_attendance
          WHERE employee_id = :empId AND date BETWEEN :periodStart AND :periodEnd
        `, { replacements: { empId: emp.employee_id, periodStart: run.period_start, periodEnd: run.period_end } });
        if (attRows?.[0]) {
          attendanceData = attRows[0];
        }
      } catch (e) {} // Non-fatal if attendance table not available

      const totalOvertimeHours = Math.round((parseInt(attendanceData.total_overtime_minutes) || 0) / 60 * 100) / 100;
      const lateDays = parseInt(attendanceData.late_days) || 0;
      const absentDays = parseInt(attendanceData.absent_days) || 0;
      const totalLateMinutes = parseInt(attendanceData.total_late_minutes) || 0;

      // Calculate overtime pay from attendance
      const hourlyRateEmp = parseFloat(emp.hourly_rate) || (baseSalary > 0 ? baseSalary / 173 : 0);
      const overtimePay = totalOvertimeHours > 0 ? Math.round(totalOvertimeHours * hourlyRateEmp * 1.5) : 0;

      // Calculate attendance deductions
      const dailyRate = parseFloat(emp.daily_rate) || (baseSalary > 0 ? baseSalary / workingDays : 0);
      const absentDeduction = absentDays > 0 ? Math.round(absentDays * dailyRate) : 0;
      const lateDeduction = lateDays > 0 ? Math.round(totalLateMinutes * (baseSalary / 173 / 60)) : 0; // ~per-minute rate
      const attendanceDeduction = absentDeduction + lateDeduction;
      // ==========================================

      // Calculate earnings
      const earnings: any[] = [{ code: 'BASIC', name: 'Gaji Pokok', amount: effectiveBaseSalary }];
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

      // BPJS calculations
      const bpjsKesEmployee = effectiveBaseSalary * 0.01; // 1%
      const bpjsKesCompany = effectiveBaseSalary * 0.04; // 4%
      const bpjsJhtEmployee = effectiveBaseSalary * 0.02; // 2%
      const bpjsJhtCompany = effectiveBaseSalary * 0.037; // 3.7%
      const bpjsJpEmployee = Math.min(effectiveBaseSalary, 9559600) * 0.01; // 1% capped
      const bpjsJpCompany = Math.min(effectiveBaseSalary, 9559600) * 0.02; // 2% capped
      const bpjsJkk = effectiveBaseSalary * 0.0024; // 0.24%
      const bpjsJkm = effectiveBaseSalary * 0.003; // 0.3%

      deductions.push(
        { code: 'BPJS_KES', name: 'BPJS Kesehatan', amount: bpjsKesEmployee },
        { code: 'BPJS_JHT', name: 'BPJS JHT', amount: bpjsJhtEmployee },
        { code: 'BPJS_JP', name: 'BPJS JP', amount: bpjsJpEmployee }
      );

      // Simplified PPh21 calculation
      const taxableIncome = (totalEarnings - bpjsJhtEmployee - bpjsJpEmployee) * 12; // annualize
      const ptkp = getPTKP(emp.tax_status || 'TK/0');
      const pkp = Math.max(0, taxableIncome - ptkp);
      const annualTax = calculatePPh21(pkp);
      const monthlyTax = Math.round(annualTax / 12);

      deductions.push({ code: 'PPH21', name: 'PPh 21', amount: monthlyTax });

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

      // Calculate actual working days from attendance
      const actualDays = parseInt(attendanceData.total_work_hours) > 0
        ? Math.round(parseFloat(attendanceData.total_work_hours) / 8) // assuming 8-hour work days
        : 0;

      // Insert payroll item
      await sequelize.query(`
        INSERT INTO payroll_items (id, payroll_run_id, employee_id, employee_salary_id, employee_name,
          employee_position, department, branch_id, pay_type, working_days, actual_working_days,
          base_salary, earnings, deductions, total_earnings, total_deductions, gross_salary,
          tax_amount, bpjs_kes_employee, bpjs_kes_company, bpjs_tk_jht_employee, bpjs_tk_jht_company,
          bpjs_tk_jp_employee, bpjs_tk_jp_company, bpjs_tk_jkk, bpjs_tk_jkm, net_salary, status,
          created_at, updated_at)
        VALUES (uuid_generate_v4(), :runId, :empId, :salaryId, :empName, :empPos, :dept, :branchId,
          :payType, :workDays, :actualDays, :baseSalary, :earnings::jsonb, :deductions::jsonb,
          :totalEarnings, :totalDeductions, :grossSalary, :tax, :bpjsKesEmp, :bpjsKesCo,
          :bpjsJhtEmp, :bpjsJhtCo, :bpjsJpEmp, :bpjsJpCo, :bpjsJkk, :bpjsJkm, :netSalary,
          'calculated', NOW(), NOW())
      `, {
        replacements: {
          runId, empId: emp.employee_id, salaryId: emp.id, empName: emp.employee_name,
          empPos: emp.position, dept: emp.department, branchId: emp.branch_id,
          payType: emp.pay_type, workDays: workingDays, actualDays, baseSalary: effectiveBaseSalary,
          earnings: JSON.stringify(earnings), deductions: JSON.stringify(deductions),
          totalEarnings, totalDeductions: totalDeductionsAmt, grossSalary,
          tax: monthlyTax, bpjsKesEmp: bpjsKesEmployee, bpjsKesCo: bpjsKesCompany,
          bpjsJhtEmp: bpjsJhtEmployee, bpjsJhtCo: bpjsJhtCompany,
          bpjsJpEmp: bpjsJpEmployee, bpjsJpCo: bpjsJpCompany,
          bpjsJkk, bpjsJkm, netSalary
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
      WHERE id = :runId
    `, {
      replacements: {
        runId, empCount: (employees || []).length, gross: totalGross,
        deductions: totalDeductions, net: totalNet, tax: totalTax, bpjs: totalBpjs
      }
    });

    return res.json({
      success: true,
      message: `Payroll calculated for ${(employees || []).length} employees`,
      summary: { totalEmployees: (employees || []).length, totalGross, totalDeductions, totalNet, totalTax, totalBpjs }
    });
  } catch (e: any) {
    console.error('calculatePayroll error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== POST: Approve Payroll =====
async function approvePayroll(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { runId } = req.body;
  if (!runId || !sequelize) return res.status(400).json({ error: 'runId required' });
  try {
    await sequelize.query(`
      UPDATE payroll_runs SET status = 'approved', approved_by = :userId, approved_at = NOW(), updated_at = NOW()
      WHERE id = :runId
    `, { replacements: { runId, userId: session.user.id } });
    return res.json({ success: true, message: 'Payroll approved' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== PUT: Update Run Status =====
async function updateRunStatus(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { runId, status } = req.body;
  if (!runId || !status || !sequelize) return res.status(400).json({ error: 'runId and status required' });
  try {
    const updates: any = { status };
    if (status === 'paid') updates.paidAt = new Date();
    await sequelize.query(`
      UPDATE payroll_runs SET status = :status ${status === 'paid' ? ', paid_at = NOW()' : ''}, updated_at = NOW()
      WHERE id = :runId
    `, { replacements: { runId, status } });
    return res.json({ success: true, message: `Status updated to ${status}` });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== GET: Payslip =====
async function getPayslip(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { runId, employeeId } = req.query;
  if (!sequelize) return res.json({ success: true, data: [] });
  try {
    let where = 'WHERE 1=1';
    const replacements: any = {};
    if (runId) { where += ' AND pi.payroll_run_id = :runId'; replacements.runId = runId; }
    if (employeeId) { where += ' AND pi.employee_id = :empId'; replacements.empId = employeeId; }

    const [rows] = await sequelize.query(`
      SELECT pi.*, pr.run_code, pr.period_start, pr.period_end, pr.pay_date, pr.status as run_status
      FROM payroll_items pi
      JOIN payroll_runs pr ON pi.payroll_run_id = pr.id
      ${where}
      ORDER BY pr.period_start DESC, pi.employee_name
    `, { replacements });

    return res.json({ success: true, data: rows || [] });
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
  try {
    // Use raw SQL to handle all fields including snake_case
    const fields: string[] = [];
    const replacements: any = { id };
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
    await sequelize.query(`UPDATE payroll_components SET ${fields.join(', ')} WHERE id = :id`, { replacements });
    // Return updated row
    const [rows] = await sequelize.query(`SELECT * FROM payroll_components WHERE id = :id`, { replacements: { id } });
    return res.json({ success: true, data: rows?.[0] });
  } catch (e: any) {
    console.error('updateComponent error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== DELETE: Component =====
async function deleteComponent(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (!sequelize) return res.json({ success: true, message: 'Deleted (mock)' });
  try {
    await sequelize.query(`DELETE FROM payroll_components WHERE id = :id`, { replacements: { id } });
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
        AND e.status = 'ACTIVE'
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
        branchId: branchId || null, dept: department || null, createdBy: session.user.id
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
        AND e.status = 'ACTIVE'
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

      // Insert payroll item
      await sequelize.query(`
        INSERT INTO payroll_items (id, payroll_run_id, employee_id, employee_salary_id, employee_name,
          employee_position, department, branch_id, pay_type, working_days, actual_working_days,
          base_salary, earnings, deductions, total_earnings, total_deductions, gross_salary,
          net_salary, status, created_at, updated_at)
        VALUES (uuid_generate_v4(), :runId, :empId, :salaryId, :empName, :empPos, :dept, :branchId,
          :payType, :workDays, :actualDays, :baseSalary, :earnings::jsonb, :deductions::jsonb,
          :totalEarnings, :totalDeductions, :grossSalary, :netSalary, 'calculated', NOW(), NOW())
      `, {
        replacements: {
          runId: run.id, empId: empId, salaryId: salary?.id || null,
          empName, empPos: empPosition || null, dept: dept || null, branchId: branchId || null,
          payType: salary?.pay_type || 'monthly', workDays: workingDays, actualDays: emp.total_days_worked || 0,
          baseSalary: effectiveBaseSalary,
          earnings: JSON.stringify(earnings), deductions: JSON.stringify(deductions),
          totalEarnings, totalDeductions: totalDeductionsAmt, grossSalary, netSalary
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
    console.error('generatePayrollFromAttendance error:', e);
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
      SELECT e.id, e.employee_id, e.name, e.position, e.department, e.join_date,
             COALESCE(es.basic_salary, 0) AS basic_salary,
             COALESCE(es.transport_allowance, 0) + COALESCE(es.meal_allowance, 0) + COALESCE(es.position_allowance, 0) AS allowances
      FROM employees e
      LEFT JOIN employee_salaries es ON es.employee_id = e.id AND es.is_active = true
      WHERE e.status = 'active' ${tenantId ? 'AND e.tenant_id = :tenantId' : ''}
      ORDER BY e.name
    `, { replacements: { tenantId } });
    const items = (rows || []).map((r: any) => {
      const joinDate = new Date(r.join_date);
      const ref = new Date(refDate);
      const months = Math.max(0, Math.floor((ref.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const fullAmount = includeAllowances ? Number(r.basic_salary) + Number(r.allowances) : Number(r.basic_salary);
      let thr_amount = 0, status = 'not_eligible', calculation = `Belum memenuhi syarat (<${minimumMonths} bulan)`;
      if (months >= minimumMonths) {
        if (months >= 12) { thr_amount = fullAmount; status = 'eligible'; calculation = '1 bulan gaji (>12 bulan)'; }
        else { thr_amount = Math.round(fullAmount * months / 12); status = 'prorata'; calculation = `Prorata ${months}/12 bulan`; }
      }
      return {
        id: r.id, employee_id: r.employee_id || r.id, employee_name: r.name,
        position: r.position, department: r.department, join_date: r.join_date,
        months_worked: months, base_salary: Number(r.basic_salary), allowances: Number(r.allowances),
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
      SELECT e.id, e.employee_id, e.name, e.position, e.department,
             es.basic_salary, es.bpjs_kesehatan_number, es.bpjs_ketenagakerjaan_number
      FROM employees e
      LEFT JOIN employee_salaries es ON es.employee_id = e.id AND es.is_active = true
      WHERE e.status = 'active' ${tenantId ? 'AND e.tenant_id = :tenantId' : ''}
      ORDER BY e.name
    `, { replacements: { tenantId } });
    const CAP_KESEHATAN = 12000000;
    const CAP_JP = 10547400;
    const items = (rows || []).map((r: any) => {
      const base = Number(r.basic_salary || 0);
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
      SELECT e.id, e.employee_id, e.name, e.position, e.department,
             es.basic_salary, COALESCE(es.transport_allowance,0)+COALESCE(es.meal_allowance,0)+COALESCE(es.position_allowance,0) AS total_allowances,
             es.tax_status, es.npwp_number
      FROM employees e
      LEFT JOIN employee_salaries es ON es.employee_id = e.id AND es.is_active = true
      WHERE e.status = 'active' ${tenantId ? 'AND e.tenant_id = :tenantId' : ''}
      ORDER BY e.name
    `, { replacements: { tenantId } });
    const items = (rows || []).map((r: any) => {
      const gross = (Number(r.basic_salary || 0) + Number(r.total_allowances || 0)) * 12;
      const biayaJabatan = Math.min(gross * 0.05, 6000000);
      const netto = gross - biayaJabatan;
      const status = r.tax_status || 'TK/0';
      const ptkp = getPTKP(status);
      const pkp = Math.max(0, netto - ptkp);
      const tax = calculatePPh21(pkp);
      return {
        id: r.id, employee_id: r.employee_id || r.id, employee_name: r.name,
        position: r.position, department: r.department, npwp: r.npwp_number,
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
      SELECT e.id, e.employee_id, e.name, e.position, e.department,
             es.basic_salary,
             COALESCE(SUM(ea.overtime_minutes),0) AS total_minutes,
             COUNT(DISTINCT CASE WHEN ea.overtime_minutes>0 THEN ea.date END) AS days_worked
      FROM employees e
      LEFT JOIN employee_salaries es ON es.employee_id = e.id AND es.is_active = true
      LEFT JOIN employee_attendance ea ON ea.employee_id = e.id
        AND EXTRACT(YEAR FROM ea.date) = :yr AND EXTRACT(MONTH FROM ea.date) = :mo
      WHERE e.status = 'active' ${tenantId ? 'AND e.tenant_id = :tenantId' : ''}
      GROUP BY e.id, es.basic_salary
      ORDER BY total_minutes DESC
    `, { replacements: { tenantId, yr, mo } });
    const items = (rows || []).map((r: any) => {
      const hours = Number(r.total_minutes || 0) / 60;
      const base = Number(r.basic_salary || 0);
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
             SUM(COALESCE(es.basic_salary,0)) AS total_basic
      FROM employees e
      LEFT JOIN employee_salaries es ON es.employee_id = e.id AND es.is_active = true
      WHERE e.status = 'active' ${tenantId ? 'AND e.tenant_id = :tenantId' : ''}
      GROUP BY e.department ORDER BY total_basic DESC
    `, { replacements: { tenantId } });
    // Salary distribution buckets
    const [distRows] = await sequelize.query(`
      SELECT
        CASE
          WHEN basic_salary < 5000000 THEN '<5jt'
          WHEN basic_salary < 10000000 THEN '5-10jt'
          WHEN basic_salary < 15000000 THEN '10-15jt'
          WHEN basic_salary < 25000000 THEN '15-25jt'
          ELSE '>25jt'
        END AS bucket,
        COUNT(*) AS c
      FROM employee_salaries WHERE is_active = true
      GROUP BY bucket ORDER BY bucket
    `);
    return res.json({
      success: true,
      monthly: (monthlyRows || []).reverse(),
      byDepartment: deptRows || [],
      distribution: distRows || [],
    });
  } catch (e: any) {
    return res.json({ success: true, monthly: [], byDepartment: [], distribution: [], error: e.message });
  }
}

// ===== Mock Components =====
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
