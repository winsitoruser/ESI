/**
 * Workforce Analytics — headcount_plans, manpower_budgets, termination_requests + demo seed
 * Run: npm run db:workforce-analytics-migrate
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } },
});

async function migrate() {
  await sequelize.authenticate();
  console.log('Connected to database\n');

  await sequelize.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS headcount_plans (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      name VARCHAR(200) NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      department VARCHAR(100),
      branch_id UUID,
      current_headcount INTEGER DEFAULT 0,
      planned_headcount INTEGER DEFAULT 0,
      approved_headcount INTEGER,
      budget_amount DECIMAL(15,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'draft',
      justification TEXT,
      approved_by INTEGER,
      approved_at TIMESTAMPTZ,
      details JSONB DEFAULT '[]',
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ headcount_plans');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS manpower_budgets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      fiscal_year INTEGER NOT NULL,
      department VARCHAR(100),
      branch_id UUID,
      budget_category VARCHAR(50) DEFAULT 'salary',
      planned_amount DECIMAL(15,2) DEFAULT 0,
      actual_amount DECIMAL(15,2) DEFAULT 0,
      variance DECIMAL(15,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'IDR',
      status VARCHAR(20) DEFAULT 'draft',
      approved_by INTEGER,
      approved_at TIMESTAMPTZ,
      notes TEXT,
      breakdown JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ manpower_budgets');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS termination_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id UUID,
      termination_type VARCHAR(30) NOT NULL DEFAULT 'resignation',
      reason TEXT,
      effective_date DATE,
      notice_date DATE,
      notice_period_days INTEGER DEFAULT 30,
      last_working_day DATE,
      severance_amount DECIMAL(15,2) DEFAULT 0,
      compensation_details JSONB DEFAULT '{}',
      status VARCHAR(20) DEFAULT 'draft',
      requested_by INTEGER,
      approved_by INTEGER,
      approved_at TIMESTAMPTZ,
      exit_interview_done BOOLEAN DEFAULT false,
      exit_interview_notes TEXT,
      exit_interview_date DATE,
      clearance_status JSONB DEFAULT '{"it": false, "finance": false, "hr": false, "assets": false, "admin": false}',
      final_settlement JSONB DEFAULT '{}',
      related_warning_ids JSONB DEFAULT '[]',
      related_case_id UUID,
      attachments JSONB DEFAULT '[]',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ termination_requests');

  // Ensure UUID defaults on tables created earlier without defaults
  await sequelize.query(`ALTER TABLE headcount_plans ALTER COLUMN id SET DEFAULT uuid_generate_v4()`).catch(() => {});
  await sequelize.query(`ALTER TABLE manpower_budgets ALTER COLUMN id SET DEFAULT uuid_generate_v4()`).catch(() => {});
  await sequelize.query(`ALTER TABLE termination_requests ALTER COLUMN id SET DEFAULT uuid_generate_v4()`).catch(() => {});
  for (const t of ['headcount_plans', 'manpower_budgets', 'termination_requests']) {
    await sequelize.query(`ALTER TABLE ${t} ALTER COLUMN created_at SET DEFAULT NOW()`).catch(() => {});
    await sequelize.query(`ALTER TABLE ${t} ALTER COLUMN updated_at SET DEFAULT NOW()`).catch(() => {});
  }

  const [tenants] = await sequelize.query('SELECT id FROM tenants ORDER BY created_at LIMIT 1');
  const tenantId = tenants[0]?.id || null;
  const [emps] = await sequelize.query('SELECT id FROM employees ORDER BY created_at LIMIT 1');
  const empId = emps[0]?.id || null;

  const [hpCount] = await sequelize.query('SELECT COUNT(*)::int c FROM headcount_plans');
  if (hpCount[0].c === 0) {
    await sequelize.query(`
      INSERT INTO headcount_plans (id, tenant_id, name, period_start, period_end, department, current_headcount, planned_headcount, approved_headcount, budget_amount, status, justification)
      VALUES
        (uuid_generate_v4(), :tid, 'Ekspansi Q2 2026', '2026-04-01', '2026-06-30', 'OPERATIONS', 5, 8, 7, 1200000000, 'approved', 'Ekspansi tim operasional cabang baru'),
        (uuid_generate_v4(), :tid, 'IT Team Scale-up', '2026-04-01', '2026-09-30', 'HR', 1, 3, 2, 800000000, 'submitted', 'Penguatan tim HR & sistem digital')
    `, { replacements: { tid: tenantId } });
    console.log('  ✓ seeded headcount_plans');
  }

  const [mbCount] = await sequelize.query('SELECT COUNT(*)::int c FROM manpower_budgets');
  if (mbCount[0].c === 0) {
    await sequelize.query(`
      INSERT INTO manpower_budgets (id, tenant_id, fiscal_year, department, budget_category, planned_amount, actual_amount, variance, status, notes)
      VALUES
        (uuid_generate_v4(), :tid, 2026, 'OPERATIONS', 'salary', 3200000000, 2100000000, 1100000000, 'active', 'Anggaran gaji operasional'),
        (uuid_generate_v4(), :tid, 2026, 'FINANCE', 'salary', 1800000000, 1200000000, 600000000, 'active', 'Anggaran gaji finance'),
        (uuid_generate_v4(), :tid, 2026, 'SALES', 'recruitment', 500000000, 150000000, 350000000, 'active', 'Rekrutmen sales')
    `, { replacements: { tid: tenantId } });
    console.log('  ✓ seeded manpower_budgets');
  }

  const [trCount] = await sequelize.query('SELECT COUNT(*)::int c FROM termination_requests');
  if (trCount[0].c === 0 && empId) {
    await sequelize.query(`
      INSERT INTO termination_requests (id, tenant_id, employee_id, termination_type, reason, status, created_at)
      VALUES
        (uuid_generate_v4(), :tid, :eid, 'resignation', 'Better opportunity', 'completed', NOW() - INTERVAL '45 days'),
        (uuid_generate_v4(), :tid, :eid, 'resignation', 'Relocation', 'completed', NOW() - INTERVAL '90 days'),
        (uuid_generate_v4(), :tid, :eid, 'termination', 'Performance issue', 'approved', NOW() - INTERVAL '120 days')
    `, { replacements: { tid: tenantId, eid: empId } });
    console.log('  ✓ seeded termination_requests');
  }

  for (const t of ['headcount_plans', 'manpower_budgets', 'termination_requests']) {
    const [r] = await sequelize.query(`SELECT COUNT(*)::int c FROM ${t}`);
    console.log(`  ${t}: ${r[0].c} rows`);
  }

  await sequelize.close();
  console.log('\nWorkforce analytics migration complete.');
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
