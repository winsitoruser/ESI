#!/usr/bin/env node
/**
 * Migrasi: pengawasan tenaga harian — laporan pengawas, verifikasi borongan
 * Run: npm run db:casual-supervision-migrate
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

async function addCol(table, col, type) {
  try {
    await sequelize.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    console.log(`  ✓ ${table}.${col}`);
  } catch (e) { console.warn(`  ⚠ ${table}.${col}:`, e.message); }
}

async function migrate() {
  await sequelize.authenticate();
  console.log('Connected — casual supervision migration\n');

  await addCol('work_assignments', 'supervisor_id', 'UUID');
  await addCol('piecework_entries', 'supervisor_id', 'UUID');
  await addCol('piecework_entries', 'verified_at', 'TIMESTAMPTZ');
  await addCol('piecework_entries', 'verification_notes', 'TEXT');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS supervision_reports (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      supervisor_id UUID NOT NULL,
      report_date DATE NOT NULL,
      location VARCHAR(200),
      shift VARCHAR(30) DEFAULT 'full',
      total_workers_scheduled INTEGER DEFAULT 0,
      total_workers_present INTEGER DEFAULT 0,
      total_workers_absent INTEGER DEFAULT 0,
      total_piecework_verified INTEGER DEFAULT 0,
      productivity_rating DECIMAL(3,1),
      safety_incidents INTEGER DEFAULT 0,
      summary TEXT,
      issues TEXT,
      recommendations TEXT,
      status VARCHAR(20) DEFAULT 'draft',
      submitted_at TIMESTAMPTZ,
      reviewed_by UUID,
      reviewed_at TIMESTAMPTZ,
      review_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('  ✓ supervision_reports');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS supervision_report_workers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      report_id UUID NOT NULL REFERENCES supervision_reports(id) ON DELETE CASCADE,
      employee_id UUID NOT NULL,
      attendance_status VARCHAR(20) DEFAULT 'present',
      hours_worked DECIMAL(5,1) DEFAULT 0,
      productivity_rating DECIMAL(3,1),
      piecework_verified BOOLEAN DEFAULT false,
      verified_quantity DECIMAL(12,3),
      assignment_id UUID,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('  ✓ supervision_report_workers');

  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sup_reports_date ON supervision_reports(report_date DESC)`).catch(() => {});
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sup_reports_supervisor ON supervision_reports(supervisor_id, report_date)`).catch(() => {});

  console.log('\n✅ Casual supervision migration complete');
  await sequelize.close();
}

migrate().catch((e) => { console.error(e); process.exit(1); });
