#!/usr/bin/env node
/**
 * HRIS Leave Management + Payroll System - Migration & Seed
 * Creates tables: leave_types, leave_balances, leave_approval_configs,
 *   leave_approval_steps, payroll_components, employee_salaries,
 *   employee_salary_components, payroll_runs, payroll_items
 */
const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '.env.development' });

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('No DATABASE_URL'); process.exit(1); }

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres', logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } }
});

async function run() {
  await sequelize.authenticate();
  console.log('Connected to DB');

  // ========================================
  // 1. LEAVE TYPES - configurable per tenant/department
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS leave_types (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      code VARCHAR(30) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      category VARCHAR(30) DEFAULT 'regular',
      max_days_per_year INTEGER DEFAULT 12,
      min_days_per_request INTEGER DEFAULT 1,
      max_days_per_request INTEGER DEFAULT 14,
      carry_forward BOOLEAN DEFAULT false,
      max_carry_forward_days INTEGER DEFAULT 0,
      requires_attachment BOOLEAN DEFAULT false,
      requires_medical_cert BOOLEAN DEFAULT false,
      is_paid BOOLEAN DEFAULT true,
      salary_deduction_percent DECIMAL(5,2) DEFAULT 0,
      applicable_gender VARCHAR(10),
      min_service_months INTEGER DEFAULT 0,
      applicable_departments JSONB DEFAULT '[]'::jsonb,
      applicable_positions JSONB DEFAULT '[]'::jsonb,
      color VARCHAR(20) DEFAULT '#3B82F6',
      icon VARCHAR(30) DEFAULT 'calendar',
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, code)
    );
  `);
  console.log('✓ leave_types');

  // ========================================
  // 2. LEAVE BALANCES - per employee per year
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS leave_balances (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id UUID NOT NULL,
      leave_type_id UUID NOT NULL REFERENCES leave_types(id),
      year INTEGER NOT NULL,
      entitled_days DECIMAL(5,1) DEFAULT 0,
      used_days DECIMAL(5,1) DEFAULT 0,
      pending_days DECIMAL(5,1) DEFAULT 0,
      carried_forward_days DECIMAL(5,1) DEFAULT 0,
      adjustment_days DECIMAL(5,1) DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(employee_id, leave_type_id, year)
    );
  `);
  console.log('✓ leave_balances');

  // ========================================
  // 3. LEAVE APPROVAL CONFIGS - multi-level per department
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS leave_approval_configs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      department VARCHAR(50),
      division VARCHAR(50),
      branch_id UUID,
      leave_type_code VARCHAR(30),
      min_days_trigger INTEGER DEFAULT 1,
      max_auto_approve_days INTEGER DEFAULT 0,
      approval_levels JSONB NOT NULL DEFAULT '[]'::jsonb,
      escalation_hours INTEGER DEFAULT 48,
      notify_hr BOOLEAN DEFAULT true,
      notify_manager BOOLEAN DEFAULT true,
      is_active BOOLEAN DEFAULT true,
      priority INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✓ leave_approval_configs');

  // Create leave_requests table if not exists
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      employee_id UUID NOT NULL,
      branch_id UUID,
      leave_type VARCHAR(30) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      total_days INTEGER NOT NULL DEFAULT 1,
      reason TEXT,
      attachment_url VARCHAR(500),
      status VARCHAR(20) DEFAULT 'pending',
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      rejection_reason TEXT,
      delegate_to UUID,
      tenant_id UUID,
      approval_config_id UUID,
      current_approval_step INTEGER DEFAULT 1,
      total_approval_steps INTEGER DEFAULT 1,
      leave_type_id UUID,
      half_day BOOLEAN DEFAULT false,
      half_day_type VARCHAR(10),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✓ leave_requests');

  // ========================================
  // 4. LEAVE APPROVAL STEPS - tracks each approval step
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS leave_approval_steps (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      leave_request_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL DEFAULT 1,
      approver_role VARCHAR(50),
      approver_id UUID,
      approver_name VARCHAR(100),
      status VARCHAR(20) DEFAULT 'pending',
      action_date TIMESTAMPTZ,
      comments TEXT,
      delegated_from UUID,
      delegated_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✓ leave_approval_steps');

  // Add new columns to leave_requests if missing
  const addColIfMissing = async (table, col, type) => {
    try {
      await sequelize.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    } catch (e) { /* column exists */ }
  };
  await addColIfMissing('leave_requests', 'approval_config_id', 'UUID');
  await addColIfMissing('leave_requests', 'current_approval_step', 'INTEGER DEFAULT 1');
  await addColIfMissing('leave_requests', 'total_approval_steps', 'INTEGER DEFAULT 1');
  await addColIfMissing('leave_requests', 'leave_type_id', 'UUID');
  await addColIfMissing('leave_requests', 'half_day', 'BOOLEAN DEFAULT false');
  await addColIfMissing('leave_requests', 'half_day_type', "VARCHAR(10)");
  console.log('✓ leave_requests enhanced');

  // ========================================
  // 5. PAYROLL COMPONENTS - master salary components
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS payroll_components (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      code VARCHAR(30) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      type VARCHAR(20) NOT NULL DEFAULT 'allowance',
      category VARCHAR(30) DEFAULT 'fixed',
      calculation_type VARCHAR(20) DEFAULT 'fixed',
      default_amount DECIMAL(15,2) DEFAULT 0,
      percentage_base VARCHAR(50),
      percentage_value DECIMAL(8,4) DEFAULT 0,
      formula TEXT,
      is_taxable BOOLEAN DEFAULT true,
      is_mandatory BOOLEAN DEFAULT false,
      applies_to_pay_types JSONB DEFAULT '["monthly"]'::jsonb,
      applicable_departments JSONB DEFAULT '[]'::jsonb,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, code)
    );
  `);
  console.log('✓ payroll_components');

  // ========================================
  // 6. EMPLOYEE SALARIES - per-employee salary config
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_salaries (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id UUID NOT NULL,
      pay_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
      base_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
      hourly_rate DECIMAL(15,2) DEFAULT 0,
      daily_rate DECIMAL(15,2) DEFAULT 0,
      weekly_hours DECIMAL(5,1) DEFAULT 40,
      overtime_rate_multiplier DECIMAL(5,2) DEFAULT 1.5,
      overtime_holiday_multiplier DECIMAL(5,2) DEFAULT 2.0,
      tax_status VARCHAR(20) DEFAULT 'TK/0',
      tax_method VARCHAR(20) DEFAULT 'gross_up',
      bank_name VARCHAR(50),
      bank_account_number VARCHAR(50),
      bank_account_name VARCHAR(100),
      bpjs_kesehatan_number VARCHAR(30),
      bpjs_ketenagakerjaan_number VARCHAR(30),
      bpjs_kesehatan_class INTEGER DEFAULT 1,
      npwp VARCHAR(30),
      effective_date DATE DEFAULT CURRENT_DATE,
      end_date DATE,
      is_active BOOLEAN DEFAULT true,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(employee_id, effective_date)
    );
  `);
  console.log('✓ employee_salaries');

  // ========================================
  // 7. EMPLOYEE SALARY COMPONENTS - assigned components
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_salary_components (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      employee_salary_id UUID NOT NULL REFERENCES employee_salaries(id) ON DELETE CASCADE,
      component_id UUID NOT NULL REFERENCES payroll_components(id),
      amount DECIMAL(15,2) DEFAULT 0,
      percentage DECIMAL(8,4),
      is_active BOOLEAN DEFAULT true,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✓ employee_salary_components');

  // ========================================
  // 8. PAYROLL RUNS - execution records
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS payroll_runs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      run_code VARCHAR(30) NOT NULL,
      name VARCHAR(100),
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      pay_date DATE,
      pay_type VARCHAR(20) DEFAULT 'monthly',
      branch_id UUID,
      department VARCHAR(50),
      total_employees INTEGER DEFAULT 0,
      total_gross DECIMAL(18,2) DEFAULT 0,
      total_deductions DECIMAL(18,2) DEFAULT 0,
      total_net DECIMAL(18,2) DEFAULT 0,
      total_tax DECIMAL(18,2) DEFAULT 0,
      total_bpjs DECIMAL(18,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'draft',
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      notes TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, run_code)
    );
  `);
  console.log('✓ payroll_runs');

  // ========================================
  // 9. PAYROLL ITEMS - individual payslip per employee per run
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS payroll_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
      employee_id UUID NOT NULL,
      employee_salary_id UUID,
      employee_name VARCHAR(100),
      employee_position VARCHAR(100),
      department VARCHAR(50),
      branch_id UUID,
      pay_type VARCHAR(20) DEFAULT 'monthly',
      working_days INTEGER DEFAULT 0,
      actual_working_days INTEGER DEFAULT 0,
      overtime_hours DECIMAL(8,2) DEFAULT 0,
      overtime_holiday_hours DECIMAL(8,2) DEFAULT 0,
      late_minutes INTEGER DEFAULT 0,
      absent_days INTEGER DEFAULT 0,
      leave_days INTEGER DEFAULT 0,
      base_salary DECIMAL(15,2) DEFAULT 0,
      earnings JSONB DEFAULT '[]'::jsonb,
      deductions JSONB DEFAULT '[]'::jsonb,
      total_earnings DECIMAL(15,2) DEFAULT 0,
      total_deductions DECIMAL(15,2) DEFAULT 0,
      gross_salary DECIMAL(15,2) DEFAULT 0,
      tax_amount DECIMAL(15,2) DEFAULT 0,
      bpjs_kes_employee DECIMAL(15,2) DEFAULT 0,
      bpjs_kes_company DECIMAL(15,2) DEFAULT 0,
      bpjs_tk_jht_employee DECIMAL(15,2) DEFAULT 0,
      bpjs_tk_jht_company DECIMAL(15,2) DEFAULT 0,
      bpjs_tk_jp_employee DECIMAL(15,2) DEFAULT 0,
      bpjs_tk_jp_company DECIMAL(15,2) DEFAULT 0,
      bpjs_tk_jkk DECIMAL(15,2) DEFAULT 0,
      bpjs_tk_jkm DECIMAL(15,2) DEFAULT 0,
      net_salary DECIMAL(15,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'calculated',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✓ payroll_items');

  // ========================================
  // SEED: Leave Types
  // ========================================
  const [ltCount] = await sequelize.query(`SELECT COUNT(*) as c FROM leave_types`);
  if (parseInt(ltCount[0].c) === 0) {
    const leaveTypes = [
      ['annual', 'Cuti Tahunan', 'Cuti tahunan sesuai UU Ketenagakerjaan', 'regular', 12, false, true, '#3B82F6', 'calendar', 1],
      ['sick', 'Sakit', 'Cuti sakit dengan surat keterangan dokter', 'medical', 14, false, true, '#EF4444', 'heart', 2],
      ['maternity', 'Melahirkan', 'Cuti melahirkan 3 bulan', 'special', 90, true, true, '#EC4899', 'baby', 3],
      ['paternity', 'Cuti Ayah', 'Cuti kelahiran anak untuk ayah', 'special', 2, false, true, '#8B5CF6', 'baby', 4],
      ['marriage', 'Pernikahan', 'Cuti pernikahan karyawan', 'special', 3, false, true, '#F43F5E', 'heart', 5],
      ['bereavement', 'Duka Cita', 'Cuti kedukaan keluarga inti', 'special', 3, false, true, '#6B7280', 'heart', 6],
      ['unpaid', 'Tanpa Gaji', 'Cuti tanpa gaji/potong gaji', 'unpaid', 30, false, false, '#9CA3AF', 'user-x', 7],
      ['personal', 'Keperluan Pribadi', 'Cuti untuk keperluan pribadi', 'regular', 3, false, true, '#F59E0B', 'coffee', 8],
      ['religious', 'Keagamaan', 'Cuti hari besar keagamaan', 'special', 2, false, true, '#10B981', 'calendar', 9],
      ['comp_off', 'Pengganti Libur', 'Pengganti hari kerja di hari libur', 'compensatory', 0, false, true, '#06B6D4', 'clock', 10],
    ];
    for (const lt of leaveTypes) {
      await sequelize.query(`
        INSERT INTO leave_types (id, code, name, description, category, max_days_per_year, requires_medical_cert, is_paid, color, icon, sort_order)
        VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT DO NOTHING
      `, { bind: lt });
    }
    console.log('+ Seeded 10 leave types');
  }

  // ========================================
  // SEED: Leave Approval Configs (sample)
  // ========================================
  const [lacCount] = await sequelize.query(`SELECT COUNT(*) as c FROM leave_approval_configs`);
  if (parseInt(lacCount[0].c) === 0) {
    // Default 2-level approval: Supervisor → Manager
    await sequelize.query(`
      INSERT INTO leave_approval_configs (id, name, description, approval_levels, escalation_hours, is_active, priority)
      VALUES (
        uuid_generate_v4(),
        'Default 2-Level Approval',
        'Approval berjenjang: Supervisor → Manager',
        $1::jsonb,
        48, true, 0
      )
    `, { bind: [JSON.stringify([
      { level: 1, role: 'SUPERVISOR', title: 'Supervisor/Atasan Langsung', required: true, can_delegate: true },
      { level: 2, role: 'MANAGER', title: 'Manager/Kepala Departemen', required: true, can_delegate: true }
    ])] });

    // 3-level for long leaves
    await sequelize.query(`
      INSERT INTO leave_approval_configs (id, name, description, min_days_trigger, approval_levels, escalation_hours, is_active, priority)
      VALUES (
        uuid_generate_v4(),
        '3-Level Approval (Cuti Panjang)',
        'Untuk cuti > 5 hari: Supervisor → Manager → HR Director',
        5,
        $1::jsonb,
        24, true, 10
      )
    `, { bind: [JSON.stringify([
      { level: 1, role: 'SUPERVISOR', title: 'Supervisor/Atasan Langsung', required: true, can_delegate: true },
      { level: 2, role: 'MANAGER', title: 'Manager Departemen', required: true, can_delegate: true },
      { level: 3, role: 'HR_DIRECTOR', title: 'HR Director', required: true, can_delegate: false }
    ])] });

    // Operations dept specific
    await sequelize.query(`
      INSERT INTO leave_approval_configs (id, name, description, department, approval_levels, is_active, priority)
      VALUES (
        uuid_generate_v4(),
        'Operations Department',
        'Approval khusus dept Operations: Shift Lead → Store Manager → Area Manager',
        'OPERATIONS',
        $1::jsonb,
        true, 20
      )
    `, { bind: [JSON.stringify([
      { level: 1, role: 'SUPERVISOR', title: 'Shift Leader', required: true, can_delegate: true },
      { level: 2, role: 'MANAGER', title: 'Store Manager', required: true, can_delegate: true },
      { level: 3, role: 'AREA_MANAGER', title: 'Area Manager', required: false, can_delegate: false }
    ])] });

    console.log('+ Seeded 3 approval configs');
  }

  // ========================================
  // SEED: Payroll Components
  // ========================================
  const [pcCount] = await sequelize.query(`SELECT COUNT(*) as c FROM payroll_components`);
  if (parseInt(pcCount[0].c) === 0) {
    const components = [
      // Earnings
      ['BASIC', 'Gaji Pokok', 'Gaji pokok karyawan', 'earning', 'fixed', 'fixed', 0, true, true, 1],
      ['TRANSPORT', 'Tunjangan Transportasi', 'Tunjangan transport bulanan', 'allowance', 'fixed', 'fixed', 500000, false, false, 2],
      ['MEAL', 'Tunjangan Makan', 'Tunjangan makan per hari kerja', 'allowance', 'daily', 'per_day', 35000, false, false, 3],
      ['POSITION', 'Tunjangan Jabatan', 'Tunjangan berdasarkan jabatan', 'allowance', 'fixed', 'fixed', 0, true, false, 4],
      ['PERFORMANCE', 'Bonus Kinerja', 'Bonus berdasarkan KPI achievement', 'bonus', 'variable', 'percentage', 0, true, false, 5],
      ['OVERTIME', 'Lembur', 'Pembayaran jam lembur', 'overtime', 'variable', 'formula', 0, true, false, 6],
      ['COMMISSION', 'Komisi Sales', 'Komisi dari penjualan', 'commission', 'variable', 'percentage', 0, true, false, 7],
      ['THR', 'THR', 'Tunjangan Hari Raya', 'bonus', 'annual', 'fixed', 0, true, false, 8],
      // Deductions
      ['PPH21', 'PPh 21', 'Pajak penghasilan pasal 21', 'tax', 'calculated', 'formula', 0, true, true, 20],
      ['BPJS_KES', 'BPJS Kesehatan', 'Iuran BPJS Kesehatan karyawan (1%)', 'bpjs', 'calculated', 'percentage', 0, false, true, 21],
      ['BPJS_JHT', 'BPJS JHT', 'Iuran Jaminan Hari Tua karyawan (2%)', 'bpjs', 'calculated', 'percentage', 0, false, true, 22],
      ['BPJS_JP', 'BPJS JP', 'Iuran Jaminan Pensiun karyawan (1%)', 'bpjs', 'calculated', 'percentage', 0, false, true, 23],
      ['LATE_DEDUCT', 'Potongan Keterlambatan', 'Potongan per menit terlambat', 'deduction', 'variable', 'formula', 0, false, false, 30],
      ['ABSENCE_DEDUCT', 'Potongan Absen', 'Potongan per hari tidak masuk', 'deduction', 'variable', 'per_day', 0, false, false, 31],
      ['LOAN', 'Potongan Pinjaman', 'Cicilan pinjaman karyawan', 'deduction', 'fixed', 'fixed', 0, false, false, 32],
    ];
    for (const c of components) {
      const isDeduction = ['tax', 'bpjs', 'deduction'].includes(c[3]);
      await sequelize.query(`
        INSERT INTO payroll_components (id, code, name, description, type, category, calculation_type, default_amount, is_taxable, is_mandatory, sort_order)
        VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT DO NOTHING
      `, { bind: [c[0], c[1], c[2], isDeduction ? 'deduction' : 'earning', c[4], c[5], c[6], c[7], c[8], c[9]] });
    }
    console.log('+ Seeded 15 payroll components');
  }

  // Print summary
  const tables = ['leave_types', 'leave_balances', 'leave_approval_configs', 'leave_approval_steps',
    'payroll_components', 'employee_salaries', 'employee_salary_components', 'payroll_runs', 'payroll_items'];
  for (const t of tables) {
    const [r] = await sequelize.query(`SELECT COUNT(*) as c FROM ${t}`);
    console.log(`  ${t}: ${r[0].c} rows`);
  }

  console.log('\n=== DONE ===');
  await sequelize.close();
}

run().catch(e => { console.error(e); process.exit(1); });
