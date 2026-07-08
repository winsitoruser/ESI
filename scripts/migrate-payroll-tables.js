#!/usr/bin/env node
/**
 * Create payroll tables for HRIS (UUID employee_id — matches live employees schema).
 * Safe to run multiple times.
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres', logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } }
});

async function run() {
  await sequelize.authenticate();
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS payroll_components (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID, code VARCHAR(30) NOT NULL, name VARCHAR(100) NOT NULL,
      description TEXT, type VARCHAR(20) NOT NULL DEFAULT 'earning',
      category VARCHAR(30) DEFAULT 'fixed', calculation_type VARCHAR(20) DEFAULT 'fixed',
      default_amount DECIMAL(15,2) DEFAULT 0, percentage_base VARCHAR(50),
      percentage_value DECIMAL(8,4) DEFAULT 0, formula TEXT,
      is_taxable BOOLEAN DEFAULT true, is_mandatory BOOLEAN DEFAULT false,
      applies_to_pay_types JSONB DEFAULT '["monthly"]'::jsonb,
      applicable_departments JSONB DEFAULT '[]'::jsonb,
      sort_order INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_salaries (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      pay_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
      base_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
      hourly_rate DECIMAL(15,2) DEFAULT 0, daily_rate DECIMAL(15,2) DEFAULT 0,
      weekly_hours DECIMAL(5,1) DEFAULT 40,
      overtime_rate_multiplier DECIMAL(5,2) DEFAULT 1.5,
      overtime_holiday_multiplier DECIMAL(5,2) DEFAULT 2.0,
      tax_status VARCHAR(20) DEFAULT 'TK/0', tax_method VARCHAR(20) DEFAULT 'gross_up',
      bank_name VARCHAR(50), bank_account_number VARCHAR(50), bank_account_name VARCHAR(100),
      bpjs_kesehatan_number VARCHAR(30), bpjs_ketenagakerjaan_number VARCHAR(30),
      bpjs_kesehatan_class INTEGER DEFAULT 1, npwp VARCHAR(30),
      effective_date DATE DEFAULT CURRENT_DATE, end_date DATE,
      is_active BOOLEAN DEFAULT true, notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_salary_components (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      employee_salary_id UUID NOT NULL REFERENCES employee_salaries(id) ON DELETE CASCADE,
      component_id UUID NOT NULL REFERENCES payroll_components(id) ON DELETE CASCADE,
      amount DECIMAL(15,2) DEFAULT 0, percentage DECIMAL(8,4),
      is_active BOOLEAN DEFAULT true, notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS payroll_runs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID, run_code VARCHAR(30) NOT NULL, name VARCHAR(100),
      period_start DATE NOT NULL, period_end DATE NOT NULL, pay_date DATE,
      pay_type VARCHAR(20) DEFAULT 'monthly', branch_id UUID, department VARCHAR(50),
      total_employees INTEGER DEFAULT 0, total_gross DECIMAL(18,2) DEFAULT 0,
      total_deductions DECIMAL(18,2) DEFAULT 0, total_net DECIMAL(18,2) DEFAULT 0,
      total_tax DECIMAL(18,2) DEFAULT 0, total_bpjs DECIMAL(18,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'draft', created_by UUID, approved_by UUID,
      approved_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS payroll_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
      employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
      employee_salary_id UUID, working_days INTEGER DEFAULT 0, present_days INTEGER DEFAULT 0,
      absent_days INTEGER DEFAULT 0, overtime_hours DECIMAL(6,2) DEFAULT 0,
      base_salary DECIMAL(15,2) DEFAULT 0, total_allowances DECIMAL(15,2) DEFAULT 0,
      total_deductions DECIMAL(15,2) DEFAULT 0, overtime_amount DECIMAL(15,2) DEFAULT 0,
      gross_salary DECIMAL(15,2) DEFAULT 0, tax_amount DECIMAL(15,2) DEFAULT 0,
      net_salary DECIMAL(15,2) DEFAULT 0, components JSONB DEFAULT '[]'::jsonb,
      status VARCHAR(20) DEFAULT 'calculated', notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const [cnt] = await sequelize.query('SELECT COUNT(*)::int AS c FROM payroll_components');
  if (cnt[0].c === 0) {
    const seeds = [
      ['GAPOK', 'Gaji Pokok', 'earning', 'fixed', 'fixed', 0, true, 1],
      ['TUNJ_JABATAN', 'Tunjangan Jabatan', 'earning', 'fixed', 'fixed', 500000, false, 2],
      ['TUNJ_MAKAN', 'Tunjangan Makan', 'earning', 'fixed', 'fixed', 750000, false, 3],
      ['BPJS_KES', 'BPJS Kesehatan', 'deduction', 'statutory', 'percentage', 0, true, 5],
      ['PPH21', 'PPh 21', 'deduction', 'tax', 'formula', 0, true, 7],
    ];
    for (const [code, name, type, cat, calc, amt, mand, sort] of seeds) {
      await sequelize.query(
        'INSERT INTO payroll_components (code,name,type,category,calculation_type,default_amount,is_mandatory,sort_order,is_active) VALUES (:code,:name,:type,:cat,:calc,:amt,:mand,:sort,true)',
        { replacements: { code, name, type, cat, calc, amt, mand, sort } }
      );
    }
    console.log('✓ Seeded default payroll components');
  }

  console.log('✅ Payroll tables ready');
  await sequelize.close();
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
