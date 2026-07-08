#!/usr/bin/env node
/**
 * Payroll schema enhancements — paid_at, metadata, extended columns
 * Run: npm run db:payroll-enhance-migrate
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

async function addCol(table, column, spec) {
  try {
    await sequelize.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${spec}`);
    console.log(`  ✓ ${table}.${column}`);
  } catch (e) {
    console.warn(`  ⚠ skip ${table}.${column}:`, e.message);
  }
}

async function run() {
  await sequelize.authenticate();
  console.log('Payroll enhance migration...\n');

  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // payroll_runs — approval & payment tracking
  await addCol('payroll_runs', 'paid_at', 'TIMESTAMPTZ');
  await addCol('payroll_runs', 'approved_at', 'TIMESTAMPTZ');
  await addCol('payroll_runs', 'approved_by', 'UUID');
  await addCol('payroll_runs', 'metadata', "JSONB DEFAULT '{}'::jsonb");
  await addCol('payroll_runs', 'notes', 'TEXT');
  await addCol('payroll_runs', 'total_bpjs', 'DECIMAL(18,2) DEFAULT 0');

  // employee_salaries — casual workforce columns (idempotent)
  await addCol('employee_salaries', 'project_rate', 'DECIMAL(15,2) DEFAULT 0');
  await addCol('employee_salaries', 'piece_rate', 'DECIMAL(15,2) DEFAULT 0');
  await addCol('employee_salaries', 'piece_unit', "VARCHAR(50) DEFAULT 'unit'");
  await addCol('employee_salaries', 'bpjs_eligible', 'BOOLEAN DEFAULT true');
  await addCol('employee_salaries', 'tax_eligible', 'BOOLEAN DEFAULT true');
  await addCol('employee_salaries', 'project_id', 'UUID');
  await addCol('employee_salaries', 'effective_date', 'DATE DEFAULT CURRENT_DATE');

  // payroll_items — extended payslip columns
  const itemCols = [
    ['employee_name', 'VARCHAR(200)'],
    ['employee_position', 'VARCHAR(100)'],
    ['department', 'VARCHAR(100)'],
    ['branch_id', 'UUID'],
    ['pay_type', 'VARCHAR(20)'],
    ['actual_working_days', 'INTEGER DEFAULT 0'],
    ['earnings', "JSONB DEFAULT '[]'::jsonb"],
    ['deductions', "JSONB DEFAULT '[]'::jsonb"],
    ['total_earnings', 'DECIMAL(15,2) DEFAULT 0'],
    ['employee_salary_id', 'UUID'],
  ];
  for (const [col, spec] of itemCols) {
    await addCol('payroll_items', col, spec);
  }

  // employees — ensure hire_date alias works
  await addCol('employees', 'hire_date', 'DATE');
  try {
    await sequelize.query(`
      UPDATE employees SET hire_date = COALESCE(hire_date, created_at::date, CURRENT_DATE - INTERVAL '1 year')
      WHERE hire_date IS NULL
    `);
    console.log('  ✓ employees.hire_date backfilled');
  } catch (e) {
    console.warn('  ⚠ hire_date backfill skipped:', e.message);
  }

  await sequelize.close();
  console.log('\n✅ Payroll enhance migration complete');
}

run().catch((e) => { console.error('❌', e.message); process.exit(1); });
