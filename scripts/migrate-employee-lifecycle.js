#!/usr/bin/env node
/**
 * Employee lifecycle tables — onboarding, offboarding, contract reminders
 * Run: npm run db:employee-lifecycle-migrate
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('No DATABASE_URL'); process.exit(1); }

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres', logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } },
});

async function run() {
  await sequelize.authenticate();
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  console.log('Employee lifecycle migration\n');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_onboarding_processes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id TEXT NOT NULL,
      employee_uid VARCHAR(50),
      employee_name VARCHAR(200) NOT NULL,
      position VARCHAR(100),
      department VARCHAR(50),
      department_label VARCHAR(100),
      branch_name VARCHAR(100),
      work_location VARCHAR(100),
      join_date DATE,
      buddy_id TEXT,
      buddy_name VARCHAR(200),
      status VARCHAR(20) DEFAULT 'in_progress',
      tasks JSONB DEFAULT '[]',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ employee_onboarding_processes');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_offboarding_processes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id TEXT NOT NULL,
      employee_uid VARCHAR(50),
      employee_name VARCHAR(200) NOT NULL,
      position VARCHAR(100),
      department VARCHAR(50),
      department_label VARCHAR(100),
      branch_name VARCHAR(100),
      resign_date DATE,
      last_working_date DATE,
      reason TEXT,
      reason_category VARCHAR(30) DEFAULT 'resignation',
      status VARCHAR(20) DEFAULT 'in_progress',
      tasks JSONB DEFAULT '[]',
      exit_interview_notes TEXT,
      rehireable BOOLEAN,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ employee_offboarding_processes');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS contract_reminders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      reminder_type VARCHAR(30) NOT NULL,
      reference_id UUID NOT NULL,
      reference_table VARCHAR(50) NOT NULL,
      employee_id TEXT,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      due_date DATE NOT NULL,
      reminder_days_before INTEGER[] DEFAULT '{30,14,7,1}',
      last_notified_at TIMESTAMPTZ,
      status VARCHAR(20) DEFAULT 'active',
      is_dismissed BOOLEAN DEFAULT false,
      dismissed_by UUID,
      dismissed_at TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ contract_reminders');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_contracts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id TEXT NOT NULL,
      contract_type VARCHAR(20) NOT NULL DEFAULT 'PKWTT',
      contract_number VARCHAR(100),
      start_date DATE NOT NULL,
      end_date DATE,
      probation_end DATE,
      status VARCHAR(20) DEFAULT 'active',
      salary DECIMAL(15,2),
      position VARCHAR(100),
      department VARCHAR(50),
      branch_id UUID,
      document_id UUID,
      renewal_count INTEGER DEFAULT 0,
      previous_contract_id UUID,
      termination_date DATE,
      termination_reason TEXT,
      notes TEXT,
      created_by UUID,
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ employee_contracts');

  const idx = async (sql) => { try { await sequelize.query(sql); } catch (_) {} };
  await idx('CREATE INDEX IF NOT EXISTS idx_onb_tenant ON employee_onboarding_processes(tenant_id)');
  await idx('CREATE INDEX IF NOT EXISTS idx_onb_emp ON employee_onboarding_processes(employee_id)');
  await idx('CREATE INDEX IF NOT EXISTS idx_off_tenant ON employee_offboarding_processes(tenant_id)');
  await idx('CREATE INDEX IF NOT EXISTS idx_off_emp ON employee_offboarding_processes(employee_id)');
  await idx('CREATE INDEX IF NOT EXISTS idx_cr_duedate ON contract_reminders(due_date)');
  await idx('CREATE INDEX IF NOT EXISTS idx_cr_status ON contract_reminders(status)');
  console.log('  ✓ indexes');

  await sequelize.close();
  console.log('\n✅ Employee lifecycle tables ready');
}

run().catch((e) => { console.error(e); process.exit(1); });
