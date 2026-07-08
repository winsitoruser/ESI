#!/usr/bin/env node
/**
 * HRIS smoke-test dependencies — missing tables for full module coverage
 * Run: npm run db:hris-smoke-deps
 */
require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres', logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } },
});

async function run() {
  await sequelize.authenticate();
  console.log('HRIS smoke dependencies migration\n');

  // Alias column for Sequelize Employee model
  await sequelize.query(`
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_id VARCHAR(30);
    UPDATE employees SET employee_id = employee_code WHERE employee_id IS NULL AND employee_code IS NOT NULL;
  `).catch(() => {});
  console.log('  ✓ employees.employee_id alias');

  await sequelize.query(`
    ALTER TABLE employee_salaries ADD COLUMN IF NOT EXISTS effective_date DATE DEFAULT CURRENT_DATE;
  `).catch(() => {});
  console.log('  ✓ employee_salaries.effective_date');

  // tasks (team-tasks)
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      priority VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(20) DEFAULT 'todo',
      assignee_id UUID,
      due_date DATE,
      completed_at TIMESTAMPTZ,
      task_type VARCHAR(30) DEFAULT 'routine',
      target_value VARCHAR(100),
      target_unit VARCHAR(50),
      category VARCHAR(50),
      related_to VARCHAR(50),
      related_id UUID,
      created_by UUID,
      updated_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('  ✓ tasks');

  // recruitment & training (UUID-safe)
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_job_openings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID, title VARCHAR(200) NOT NULL, department VARCHAR(100),
      location VARCHAR(200), employment_type VARCHAR(50) DEFAULT 'full_time',
      status VARCHAR(30) DEFAULT 'open', priority VARCHAR(20) DEFAULT 'medium',
      salary_min NUMERIC(15,2) DEFAULT 0, salary_max NUMERIC(15,2) DEFAULT 0,
      applicants INTEGER DEFAULT 0, description TEXT, requirements TEXT,
      posted_date DATE DEFAULT CURRENT_DATE, deadline DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_candidates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID, job_opening_id UUID REFERENCES hris_job_openings(id) ON DELETE SET NULL,
      name VARCHAR(200) NOT NULL, email VARCHAR(200), phone VARCHAR(30),
      status VARCHAR(30) DEFAULT 'applied', source VARCHAR(50),
      applied_date DATE DEFAULT CURRENT_DATE, notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_training_programs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID, code VARCHAR(30), title VARCHAR(200) NOT NULL,
      category VARCHAR(50), duration_hours INTEGER DEFAULT 8,
      status VARCHAR(20) DEFAULT 'active', description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('  ✓ hris_job_openings, hris_candidates, hris_training_programs');

  const alterCols = [
    `ALTER TABLE hris_candidates ADD COLUMN IF NOT EXISTS full_name VARCHAR(200)`,
    `ALTER TABLE hris_candidates ADD COLUMN IF NOT EXISTS current_stage VARCHAR(30) DEFAULT 'applied'`,
    `ALTER TABLE hris_candidates ADD COLUMN IF NOT EXISTS experience_summary TEXT`,
    `ALTER TABLE hris_candidates ADD COLUMN IF NOT EXISTS education_level VARCHAR(100)`,
    `ALTER TABLE hris_candidates ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 0`,
    `ALTER TABLE hris_candidates ADD COLUMN IF NOT EXISTS resume_url TEXT`,
    `UPDATE hris_candidates SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL`,
    `ALTER TABLE hris_training_programs ADD COLUMN IF NOT EXISTS start_date DATE`,
    `ALTER TABLE hris_training_programs ADD COLUMN IF NOT EXISTS end_date DATE`,
    `ALTER TABLE hris_training_programs ADD COLUMN IF NOT EXISTS trainer_name VARCHAR(200)`,
    `ALTER TABLE hris_training_programs ADD COLUMN IF NOT EXISTS location VARCHAR(200)`,
    `ALTER TABLE hris_training_programs ADD COLUMN IF NOT EXISTS training_type VARCHAR(50) DEFAULT 'training'`,
    `ALTER TABLE hris_training_programs ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 30`,
    `ALTER TABLE hris_training_programs ADD COLUMN IF NOT EXISTS current_participants INTEGER DEFAULT 0`,
    `ALTER TABLE hris_training_programs ADD COLUMN IF NOT EXISTS cost_per_person NUMERIC(15,2) DEFAULT 0`,
  ];
  for (const sql of alterCols) {
    try { await sequelize.query(sql); } catch (e) { /* column may exist */ }
  }
  console.log('  ✓ recruitment/training columns aligned');

  await sequelize.close();

  const scripts = [
    'create-hris-attendance-shifts.js',
  ];
  for (const s of scripts) {
    const p = path.join(__dirname, s);
    try {
      console.log(`\n→ running ${s}`);
      execSync(`node "${p}"`, { stdio: 'inherit', env: process.env });
    } catch (e) {
      console.warn(`  ⚠ ${s} warning (may already exist)`);
    }
  }

  console.log('\n✅ HRIS smoke dependencies ready');
}

run().catch((e) => { console.error(e); process.exit(1); });
