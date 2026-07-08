#!/usr/bin/env node
/**
 * Migrasi: tenaga kerja harian lepas, buruh, borongan & penggajian fleksibel
 * Run: npm run db:casual-workforce-migrate
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } },
});

async function addCol(table, col, type) {
  try {
    await sequelize.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    console.log(`  ✓ ${table}.${col}`);
  } catch (e) {
    console.warn(`  ⚠ ${table}.${col}:`, e.message);
  }
}

async function migrate() {
  await sequelize.authenticate();
  console.log('Connected — casual workforce migration\n');

  // --- employees: kategori hubungan kerja ---
  await addCol('employees', 'employment_category', "VARCHAR(30) DEFAULT 'permanent'");
  await addCol('employees', 'salary_type', "VARCHAR(20) DEFAULT 'monthly'");

  // --- employee_salaries: skema penggajian fleksibel ---
  await addCol('employee_salaries', 'project_rate', 'DECIMAL(15,2) DEFAULT 0');
  await addCol('employee_salaries', 'piece_rate', 'DECIMAL(15,2) DEFAULT 0');
  await addCol('employee_salaries', 'piece_unit', "VARCHAR(50) DEFAULT 'unit'");
  await addCol('employee_salaries', 'bpjs_eligible', 'BOOLEAN DEFAULT true');
  await addCol('employee_salaries', 'tax_eligible', 'BOOLEAN DEFAULT true');
  await addCol('employee_salaries', 'project_id', 'UUID');

  // --- piecework_entries: pencatatan borongan ---
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS piecework_entries (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id UUID NOT NULL,
      project_id UUID,
      work_date DATE NOT NULL,
      description VARCHAR(500),
      work_type VARCHAR(100),
      quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
      unit VARCHAR(50) DEFAULT 'unit',
      unit_rate DECIMAL(15,2) NOT NULL DEFAULT 0,
      total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending',
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      payroll_run_id UUID,
      payroll_item_id UUID,
      notes TEXT,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('  ✓ piecework_entries table');

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_piecework_employee_date
      ON piecework_entries(employee_id, work_date);
  `).catch(() => {});
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_piecework_tenant_status
      ON piecework_entries(tenant_id, status);
  `).catch(() => {});

  // --- work_assignments: penugasan harian lepas ke lokasi/proyek ---
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS work_assignments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id UUID NOT NULL,
      project_id UUID,
      assignment_date DATE NOT NULL,
      location VARCHAR(200),
      role VARCHAR(100),
      pay_type VARCHAR(20) DEFAULT 'daily',
      daily_rate DECIMAL(15,2) DEFAULT 0,
      hourly_rate DECIMAL(15,2) DEFAULT 0,
      expected_hours DECIMAL(5,1) DEFAULT 8,
      status VARCHAR(20) DEFAULT 'scheduled',
      attendance_id UUID,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('  ✓ work_assignments table');

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_work_assign_emp_date
      ON work_assignments(employee_id, assignment_date);
  `).catch(() => {});

  console.log('\n✅ Casual workforce migration complete');
  await sequelize.close();
}

migrate().catch((e) => { console.error(e); process.exit(1); });
