#!/usr/bin/env node
/**
 * Add leave_types policy columns missing on slim prod schema (description, carry_forward, …).
 * Safe to run multiple times.
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

const COLUMNS = [
  ['description', 'TEXT'],
  ['category', "VARCHAR(30) DEFAULT 'regular'"],
  ['max_days_per_year', 'INTEGER DEFAULT 12'],
  ['min_days_per_request', 'INTEGER DEFAULT 1'],
  ['max_days_per_request', 'INTEGER DEFAULT 14'],
  ['carry_forward', 'BOOLEAN DEFAULT false'],
  ['max_carry_forward_days', 'INTEGER DEFAULT 0'],
  ['requires_attachment', 'BOOLEAN DEFAULT false'],
  ['requires_medical_cert', 'BOOLEAN DEFAULT false'],
  ['is_paid', 'BOOLEAN DEFAULT true'],
  ['salary_deduction_percent', 'DECIMAL(5,2) DEFAULT 0'],
  ['applicable_gender', 'VARCHAR(10)'],
  ['min_service_months', 'INTEGER DEFAULT 0'],
  ['applicable_departments', "JSONB DEFAULT '[]'::jsonb"],
  ['applicable_positions', "JSONB DEFAULT '[]'::jsonb"],
  ['color', "VARCHAR(20) DEFAULT '#3B82F6'"],
  ['icon', "VARCHAR(30) DEFAULT 'calendar'"],
  ['is_active', 'BOOLEAN DEFAULT true'],
  ['sort_order', 'INTEGER DEFAULT 0'],
];

async function run() {
  await sequelize.authenticate();
  const [tables] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_types' LIMIT 1`,
  );
  if (!tables?.length) {
    console.log('leave_types missing — skip');
    return;
  }
  for (const [col, def] of COLUMNS) {
    await sequelize.query(`ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS ${col} ${def}`);
    console.log('  +', col);
  }
  console.log('leave_types columns ok');
}

run()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => sequelize.close());
