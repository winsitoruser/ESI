#!/usr/bin/env node
/**
 * Create employee_attendance table for HRIS (UUID employee_id — matches live employees schema).
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
    CREATE TABLE IF NOT EXISTS employee_attendance (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      branch_id UUID,
      date DATE NOT NULL,
      clock_in TIMESTAMPTZ,
      clock_out TIMESTAMPTZ,
      scheduled_start TIME,
      scheduled_end TIME,
      status VARCHAR(30) NOT NULL DEFAULT 'present',
      late_minutes INTEGER DEFAULT 0,
      early_leave_minutes INTEGER DEFAULT 0,
      overtime_minutes INTEGER DEFAULT 0,
      work_hours DECIMAL(5,2) DEFAULT 0,
      break_minutes INTEGER DEFAULT 60,
      leave_type VARCHAR(50),
      leave_reason TEXT,
      approved_by UUID,
      clock_in_location JSONB,
      clock_out_location JSONB,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(employee_id, date)
    )
  `);

  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_employee_attendance_employee ON employee_attendance(employee_id)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_employee_attendance_date ON employee_attendance(date)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_employee_attendance_tenant ON employee_attendance(tenant_id)`);

  console.log('✓ employee_attendance table ready');
  await sequelize.close();
}

run().catch(e => { console.error(e.message); process.exit(1); });
