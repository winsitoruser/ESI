#!/usr/bin/env node
/**
 * Seed payroll demo data — salaries, components, runs, payslips (3 bulan)
 * Idempotent. Run: npm run db:payroll-seed
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres', logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } },
});

const SALARY_BY_DEPT = {
  MANAGEMENT: 25000000, OPERATIONS: 18000000, FINANCE: 20000000,
  SALES: 12000000, WAREHOUSE: 8000000, HR: 15000000, KITCHEN: 9000000,
  IT: 14000000, default: 8000000,
};

const TAX_STATUSES = ['TK/0', 'K/0', 'K/1', 'K/2', 'TK/1'];
const BANKS = ['BCA', 'BRI', 'Mandiri', 'BNI'];

function getPTKP(status) {
  const m = { 'TK/0': 54000000, 'TK/1': 58500000, 'TK/2': 63000000, 'TK/3': 67500000,
    'K/0': 58500000, 'K/1': 63000000, 'K/2': 67500000, 'K/3': 72000000 };
  return m[status] || 54000000;
}

function calcPPh21(pkp) {
  if (pkp <= 0) return 0;
  let tax = 0, p = pkp;
  if (p > 5000000000) { tax += (p - 5000000000) * 0.35; p = 5000000000; }
  if (p > 500000000) { tax += (p - 500000000) * 0.30; p = 500000000; }
  if (p > 250000000) { tax += (p - 250000000) * 0.25; p = 250000000; }
  if (p > 60000000) { tax += (p - 60000000) * 0.15; p = 60000000; }
  tax += p * 0.05;
  return Math.round(tax);
}

function buildPayslip(base, tunjJabatan, tunjMakan, taxStatus) {
  const earnings = [
    { code: 'BASIC', name: 'Gaji Pokok', amount: base },
    { code: 'TUNJ_JABATAN', name: 'Tunjangan Jabatan', amount: tunjJabatan },
    { code: 'TUNJ_MAKAN', name: 'Tunjangan Makan', amount: tunjMakan },
  ];
  const totalEarnings = base + tunjJabatan + tunjMakan;
  const bpjsKes = Math.round(Math.min(base, 12000000) * 0.01);
  const bpjsJht = Math.round(base * 0.02);
  const bpjsJp = Math.round(Math.min(base, 10547400) * 0.01);
  const taxable = (totalEarnings - bpjsJht - bpjsJp) * 12;
  const pkp = Math.max(0, taxable - getPTKP(taxStatus));
  const monthlyTax = Math.round(calcPPh21(pkp) / 12);
  const deductions = [
    { code: 'BPJS_KES', name: 'BPJS Kesehatan', amount: bpjsKes },
    { code: 'BPJS_JHT', name: 'BPJS JHT', amount: bpjsJht },
    { code: 'BPJS_JP', name: 'BPJS JP', amount: bpjsJp },
  ];
  if (monthlyTax > 0) deductions.push({ code: 'PPH21', name: 'PPh 21', amount: monthlyTax });
  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  return {
    earnings, deductions, totalEarnings, totalDeductions, monthlyTax,
    net: totalEarnings - totalDeductions,
    bpjs: bpjsKes + bpjsJht + bpjsJp,
  };
}

function monthRange(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0);
  const end = endDate.toISOString().split('T')[0];
  return { start, end };
}

async function run() {
  await sequelize.authenticate();
  console.log('🌱 Seeding payroll demo data...\n');

  const [tenants] = await sequelize.query('SELECT id FROM tenants ORDER BY created_at LIMIT 1');
  const tenantId = tenants[0]?.id || null;

  // Ensure tables + columns
  require('child_process').execSync('node scripts/migrate-payroll-tables.js', { stdio: 'inherit' });
  require('child_process').execSync('node scripts/migrate-payroll-enhance.js', { stdio: 'inherit' });

  // Components
  const [compRows] = await sequelize.query(`SELECT id, code, default_amount FROM payroll_components WHERE is_active = true`);
  const compMap = Object.fromEntries(compRows.map((c) => [c.code, c]));

  if (!compMap.GAPOK) {
    await sequelize.query(`
      INSERT INTO payroll_components (code, name, type, category, calculation_type, default_amount, is_mandatory, sort_order, is_active)
      VALUES ('GAPOK','Gaji Pokok','earning','fixed','fixed',0,true,1,true),
             ('TUNJ_JABATAN','Tunjangan Jabatan','earning','fixed','fixed',500000,false,2,true),
             ('TUNJ_MAKAN','Tunjangan Makan','earning','fixed','fixed',750000,false,3,true),
             ('BPJS_KES','BPJS Kesehatan','deduction','statutory','percentage',0,true,5,true),
             ('PPH21','PPh 21','deduction','tax','formula',0,true,7,true)
      ON CONFLICT DO NOTHING
    `).catch(() => {});
    const [c2] = await sequelize.query(`SELECT id, code, default_amount FROM payroll_components WHERE is_active = true`);
    Object.assign(compMap, Object.fromEntries(c2.map((c) => [c.code, c])));
  }

  const [employees] = await sequelize.query(`
    SELECT e.id, e.name, e.position, e.department, e.employee_code,
           COALESCE(e.hire_date, e.created_at::date, CURRENT_DATE - INTERVAL '2 years') AS hire_date
    FROM employees e
    WHERE LOWER(COALESCE(e.status, 'active')) = 'active' OR e.is_active = true
    ORDER BY e.name LIMIT 50
  `);

  if (employees.length === 0) {
    console.log('  ⚠ No active employees — run npm run db:hris-seed first');
    await sequelize.close();
    process.exit(0);
  }

  let salaryCount = 0;
  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const dept = (emp.department || '').toUpperCase();
    const base = SALARY_BY_DEPT[dept] || SALARY_BY_DEPT.default;
    const taxStatus = TAX_STATUSES[i % TAX_STATUSES.length];
    const bank = BANKS[i % BANKS.length];

    const [existing] = await sequelize.query(
      `SELECT id FROM employee_salaries WHERE employee_id = :eid AND is_active = true LIMIT 1`,
      { replacements: { eid: emp.id } }
    );

    let salaryId;
    if (existing.length > 0) {
      salaryId = existing[0].id;
      await sequelize.query(`
        UPDATE employee_salaries SET
          base_salary = :base, tax_status = :taxStatus,
          bank_name = :bank, bank_account_number = :accNum, bank_account_name = :accName,
          bpjs_kesehatan_number = :bpjsKes, bpjs_ketenagakerjaan_number = :bpjsTk,
          npwp = :npwp, updated_at = NOW()
        WHERE id = :id
      `, {
        replacements: {
          id: salaryId, base, taxStatus, bank,
          accNum: String(1000000000 + i), accName: emp.name,
          bpjsKes: `0001234567${String(i).padStart(3, '0')}`,
          bpjsTk: `1980011500${String(i).padStart(2, '0')}`,
          npwp: i % 3 === 0 ? `${10 + i}.234.567.8-901.000` : null,
        },
      });
    } else {
      const [ins] = await sequelize.query(`
        INSERT INTO employee_salaries (id, tenant_id, employee_id, pay_type, base_salary, tax_status, tax_method,
          bank_name, bank_account_number, bank_account_name,
          bpjs_kesehatan_number, bpjs_ketenagakerjaan_number, npwp,
          is_active, effective_date, created_at, updated_at)
        VALUES (uuid_generate_v4(), :tid, :eid, 'monthly', :base, :taxStatus, 'gross_up',
          :bank, :accNum, :accName, :bpjsKes, :bpjsTk, :npwp,
          true, CURRENT_DATE, NOW(), NOW())
        RETURNING id
      `, {
        replacements: {
          tid: tenantId, eid: emp.id, base, taxStatus, bank,
          accNum: String(1000000000 + i), accName: emp.name,
          bpjsKes: `0001234567${String(i).padStart(3, '0')}`,
          bpjsTk: `1980011500${String(i).padStart(2, '0')}`,
          npwp: i % 3 === 0 ? `${10 + i}.234.567.8-901.000` : null,
        },
      });
      salaryId = ins[0].id;
      salaryCount++;
    }

    // Assign tunjangan components
    for (const [code, amt] of [['TUNJ_JABATAN', dept === 'MANAGEMENT' || dept === 'FINANCE' ? 1500000 : 500000], ['TUNJ_MAKAN', 750000]]) {
      const comp = compMap[code];
      if (!comp) continue;
      const [has] = await sequelize.query(
        `SELECT id FROM employee_salary_components WHERE employee_salary_id = :sid AND component_id = :cid LIMIT 1`,
        { replacements: { sid: salaryId, cid: comp.id } }
      );
      if (has.length === 0) {
        await sequelize.query(`
          INSERT INTO employee_salary_components (id, employee_salary_id, component_id, amount, is_active, created_at, updated_at)
          VALUES (uuid_generate_v4(), :sid, :cid, :amt, true, NOW(), NOW())
        `, { replacements: { sid: salaryId, cid: comp.id, amt } });
      }
    }
  }
  console.log(`  ✓ ${employees.length} konfigurasi gaji (${salaryCount} baru)`);

  // Payroll runs — last 3 months
  const now = new Date();
  let runsCreated = 0;
  let itemsCreated = 0;

  for (let m = 2; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const { start, end } = monthRange(year, month);
    const runCode = `PAY-${year}-${String(month).padStart(2, '0')}`;

    const [existingRun] = await sequelize.query(
      `SELECT id FROM payroll_runs WHERE run_code = :code LIMIT 1`,
      { replacements: { code: runCode } }
    );
    if (existingRun.length > 0) continue;

    let totalGross = 0, totalDeductions = 0, totalNet = 0, totalTax = 0, totalBpjs = 0;

    const [runIns] = await sequelize.query(`
      INSERT INTO payroll_runs (id, tenant_id, run_code, name, period_start, period_end, pay_date,
        pay_type, status, created_at, updated_at)
      VALUES (uuid_generate_v4(), :tid, :code, :name, :start, :end, :end, 'monthly', 'paid', NOW(), NOW())
      RETURNING id
    `, {
      replacements: {
        tid: tenantId, code: runCode,
        name: `Payroll ${start} s/d ${end}`, start, end,
      },
    });
    const runId = runIns[0].id;
    runsCreated++;

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const dept = (emp.department || '').toUpperCase();
      const base = SALARY_BY_DEPT[dept] || SALARY_BY_DEPT.default;
      const tunjJabatan = dept === 'MANAGEMENT' || dept === 'FINANCE' ? 1500000 : 500000;
      const tunjMakan = 750000;
      const taxStatus = TAX_STATUSES[i % TAX_STATUSES.length];
      const slip = buildPayslip(base, tunjJabatan, tunjMakan, taxStatus);

      const [salRow] = await sequelize.query(
        `SELECT id FROM employee_salaries WHERE employee_id = :eid AND is_active = true LIMIT 1`,
        { replacements: { eid: emp.id } }
      );

      await sequelize.query(`
        INSERT INTO payroll_items (
          id, payroll_run_id, employee_id, employee_salary_id,
          working_days, present_days, absent_days, overtime_hours,
          base_salary, total_allowances, total_deductions, gross_salary,
          tax_amount, net_salary, components, status,
          employee_name, employee_position, department, pay_type,
          actual_working_days, earnings, deductions, total_earnings,
          created_at, updated_at
        ) VALUES (
          uuid_generate_v4(), :runId, :empId, :salaryId,
          22, 22, 0, 0,
          :base, :allowances, :totalDeductionsAmt, :gross,
          :tax, :net, :components::jsonb, 'paid',
          :empName, :empPos, :dept, 'monthly',
          22, :earnings::jsonb, :deductionsJson::jsonb, :totalEarnings,
          NOW(), NOW()
        )
      `, {
        replacements: {
          runId, empId: emp.id, salaryId: salRow[0]?.id || null,
          base, allowances: tunjJabatan + tunjMakan, totalDeductionsAmt: slip.totalDeductions,
          gross: slip.totalEarnings, tax: slip.monthlyTax, net: slip.net,
          components: JSON.stringify({ earnings: slip.earnings, deductions: slip.deductions }),
          empName: emp.name, empPos: emp.position, dept: emp.department,
          earnings: JSON.stringify(slip.earnings), deductionsJson: JSON.stringify(slip.deductions),
          totalEarnings: slip.totalEarnings,
        },
      });

      totalGross += slip.totalEarnings;
      totalDeductions += slip.totalDeductions;
      totalNet += slip.net;
      totalTax += slip.monthlyTax;
      totalBpjs += slip.bpjs;
      itemsCreated++;
    }

    await sequelize.query(`
      UPDATE payroll_runs SET
        total_employees = :cnt, total_gross = :gross, total_deductions = :ded,
        total_net = :net, total_tax = :tax, total_bpjs = :bpjs,
        approved_at = NOW(), paid_at = NOW(), status = 'paid', updated_at = NOW()
      WHERE id = :runId
    `, {
      replacements: {
        runId, cnt: employees.length, gross: totalGross, ded: totalDeductions,
        net: totalNet, tax: totalTax, bpjs: totalBpjs,
      },
    });
  }

  console.log(`  ✓ ${runsCreated} payroll runs dibuat`);
  console.log(`  ✓ ${itemsCreated} slip gaji (payroll_items)`);

  const [summary] = await sequelize.query(`
    SELECT
      (SELECT COUNT(*)::int FROM employee_salaries WHERE is_active=true) AS salaries,
      (SELECT COUNT(*)::int FROM payroll_runs) AS runs,
      (SELECT COUNT(*)::int FROM payroll_items) AS items
  `);
  console.log(`\n📊 Ringkasan: ${summary[0].salaries} gaji aktif, ${summary[0].runs} runs, ${summary[0].items} slip`);

  await sequelize.close();
  console.log('\n✅ Payroll demo seed complete');
}

run().catch((e) => { console.error('❌', e.message); process.exit(1); });
