#!/usr/bin/env node
/**
 * HRIS field integration — kolom work_location, job_grade_id, team_members link + backfill
 * Run: npm run db:hris-field-migrate
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

const TEAM_ROLE_TO_DEPT = {
  sales: 'SALES',
  marketing: 'MARKETING',
  ops: 'OPERATIONS',
  finance: 'FINANCE',
  admin: 'ADMINISTRATION',
  manager: 'MANAGEMENT',
  executive: 'MANAGEMENT',
};

function workLocationToWorkArea(workLocation) {
  if (!workLocation) return 'OFFICE';
  if (workLocation === 'FIELD') return 'FIELD';
  if (workLocation === 'REMOTE' || workLocation === 'MULTIPLE') return 'HYBRID';
  return 'OFFICE';
}

async function ensureJobGrades() {
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS job_grades (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      code VARCHAR(20) NOT NULL,
      name VARCHAR(100) NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      min_salary DECIMAL(15,2) DEFAULT 0,
      max_salary DECIMAL(15,2) DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const [cnt] = await sequelize.query(`SELECT COUNT(*)::int AS c FROM job_grades`);
  if ((cnt[0]?.c || 0) > 0) return;

  const grades = [
    { code: 'E1', name: 'Eksekutif', level: 1, min: 20000000, max: 50000000 },
    { code: 'M1', name: 'Manajer', level: 3, min: 10000000, max: 18000000 },
    { code: 'S1', name: 'Supervisor', level: 4, min: 7000000, max: 12000000 },
    { code: 'S2', name: 'Staf', level: 6, min: 4000000, max: 6000000 },
  ];
  for (const g of grades) {
    await sequelize.query(
      `INSERT INTO job_grades (code, name, level, min_salary, max_salary, is_active)
       VALUES (:code, :name, :level, :min, :max, true)`,
      { replacements: g }
    );
  }
  console.log('  ✓ job_grades seeded (4 default grades)');
}

async function migrate() {
  await sequelize.authenticate();
  console.log('Connected — HRIS field integration\n');

  await sequelize.query(`
    ALTER TABLE employees
      ADD COLUMN IF NOT EXISTS work_location VARCHAR(50) DEFAULT 'ADMIN_OFFICE',
      ADD COLUMN IF NOT EXISTS job_grade_id UUID,
      ADD COLUMN IF NOT EXISTS org_structure_id UUID
  `);
  console.log('  ✓ employees.work_location, job_grade_id, org_structure_id');

  await sequelize.query(`
    ALTER TABLE team_members
      ADD COLUMN IF NOT EXISTS employee_id UUID,
      ADD COLUMN IF NOT EXISTS location VARCHAR(100),
      ADD COLUMN IF NOT EXISTS work_area VARCHAR(50)
  `);
  console.log('  ✓ team_members.employee_id, location, work_area');

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_team_members_employee_id ON team_members(employee_id)
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_employees_job_grade_id ON employees(job_grade_id)
  `);

  await ensureJobGrades();

  // Backfill team_members.employee_id by email match
  const [unlinked] = await sequelize.query(`
    SELECT tm.id, tm.email, tm.name, tm.role, tm.department, tm.location, tm.work_area
    FROM team_members tm
    WHERE tm.employee_id IS NULL AND tm.email IS NOT NULL AND tm.email <> ''
  `);

  let linked = 0;
  for (const tm of unlinked) {
    const [emps] = await sequelize.query(
      `SELECT e.id, e.name, e.email, e.phone, e.department, e.work_location, b.name AS branch_name
       FROM employees e
       LEFT JOIN branches b ON e.branch_id = b.id
       WHERE LOWER(e.email) = LOWER(:email)
       LIMIT 1`,
      { replacements: { email: tm.email } }
    );
    if (!emps[0]) continue;

    const emp = emps[0];
    const dept = emp.department || TEAM_ROLE_TO_DEPT[tm.role] || tm.department;
    const location = tm.location || emp.branch_name || null;
    const workArea = tm.work_area || workLocationToWorkArea(emp.work_location);

    await sequelize.query(
      `UPDATE team_members SET
        employee_id = :employeeId,
        name = COALESCE(NULLIF(name, ''), :name),
        department = COALESCE(NULLIF(department, ''), :department),
        location = COALESCE(location, :location),
        work_area = COALESCE(NULLIF(work_area, ''), :workArea),
        updated_at = NOW()
       WHERE id = :id`,
      {
        replacements: {
          id: tm.id,
          employeeId: emp.id,
          name: emp.name,
          department: dept,
          location,
          workArea,
        },
      }
    );
    linked++;
    console.log(`  → linked ${tm.email} → ${emp.name}`);
  }

  console.log(`\n✓ Backfill team_members: ${linked}/${unlinked.length} linked by email`);

  // Default work_location for employees missing it
  const [wl] = await sequelize.query(`
    UPDATE employees SET work_location = 'ADMIN_OFFICE', updated_at = NOW()
    WHERE work_location IS NULL OR work_location = ''
    RETURNING id
  `);
  console.log(`✓ work_location defaulted for ${wl.length} employees`);

  await sequelize.close();
  console.log('\n✅ HRIS field integration complete');
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
