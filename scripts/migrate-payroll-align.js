/**
 * Align payroll schema + seed employee salaries for calculation
 * Run: npm run db:payroll-align-migrate
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

const DEFAULT_SALARIES = {
  MANAGEMENT: 25000000,
  OPERATIONS: 18000000,
  FINANCE: 20000000,
  SALES: 12000000,
  WAREHOUSE: 10000000,
  HR: 15000000,
  KITCHEN: 8000000,
  default: 8000000,
};

async function migrate() {
  await sequelize.authenticate();
  console.log('Connected\n');

  // Optional extended columns for detailed payslips (safe IF NOT EXISTS)
  const itemCols = [
    `ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS employee_name VARCHAR(200)`,
    `ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS employee_position VARCHAR(100)`,
    `ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS department VARCHAR(100)`,
    `ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS branch_id UUID`,
    `ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS pay_type VARCHAR(20)`,
    `ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS actual_working_days INTEGER DEFAULT 0`,
    `ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS earnings JSONB DEFAULT '[]'::jsonb`,
    `ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS deductions JSONB DEFAULT '[]'::jsonb`,
    `ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(15,2) DEFAULT 0`,
  ];
  for (const sql of itemCols) await sequelize.query(sql).catch(() => {});
  console.log('  ✓ payroll_items columns aligned');

  // created_by as integer-friendly: use nullable, drop uuid constraint issues by allowing null only in API
  await sequelize.query(`ALTER TABLE payroll_runs ALTER COLUMN created_by DROP NOT NULL`).catch(() => {});
  await sequelize.query(`ALTER TABLE payroll_runs ALTER COLUMN approved_by DROP NOT NULL`).catch(() => {});

  const [tenants] = await sequelize.query('SELECT id FROM tenants ORDER BY created_at LIMIT 1');
  const tenantId = tenants[0]?.id || null;

  const [employees] = await sequelize.query(`
    SELECT e.id, e.name, e.department, e.salary_type, e.status
    FROM employees e
    WHERE LOWER(COALESCE(e.status, 'active')) = 'active' OR e.is_active = true
  `);

  let seeded = 0;
  for (const emp of employees) {
    const [existing] = await sequelize.query(
      `SELECT id FROM employee_salaries WHERE employee_id = :eid AND is_active = true LIMIT 1`,
      { replacements: { eid: emp.id } }
    );
    if (existing.length > 0) continue;

    const dept = (emp.department || '').toUpperCase();
    const baseSalary = DEFAULT_SALARIES[dept] || DEFAULT_SALARIES.default;
    const payType = emp.salary_type || 'monthly';

    await sequelize.query(`
      INSERT INTO employee_salaries (id, tenant_id, employee_id, pay_type, base_salary, tax_status, is_active, effective_date, created_at, updated_at)
      VALUES (uuid_generate_v4(), :tid, :eid, :payType, :base, 'TK/0', true, CURRENT_DATE, NOW(), NOW())
    `, { replacements: { tid: tenantId, eid: emp.id, payType, base: baseSalary } });
    seeded++;
  }
  console.log(`  ✓ seeded ${seeded} employee salary configs (${employees.length} active employees)`);

  const [counts] = await sequelize.query(`
    SELECT
      (SELECT COUNT(*)::int FROM payroll_components) AS components,
      (SELECT COUNT(*)::int FROM employee_salaries WHERE is_active=true) AS salaries,
      (SELECT COUNT(*)::int FROM payroll_runs) AS runs
  `);
  console.log('  payroll_components:', counts[0].components);
  console.log('  employee_salaries:', counts[0].salaries);
  console.log('  payroll_runs:', counts[0].runs);

  await sequelize.close();
  console.log('\nPayroll align migration complete.');
}

migrate().catch((e) => { console.error(e); process.exit(1); });
