#!/usr/bin/env node
/** Run specific Sequelize migrations without full chain (VPS fresh DB) */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Sequelize } = require('sequelize');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres', logging: false,
  dialectOptions: DATABASE_URL.includes('127.0.0.1') || DATABASE_URL.includes('localhost')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } },
});

const MIGRATIONS = [
  '20260220-create-project-management-tables.js',
  '20260307-create-hris-training-development.js',
  '20260308-create-hris-training-scoring-candidate-portal.js',
];

async function run() {
  await sequelize.authenticate();
  const queryInterface = sequelize.getQueryInterface();
  const { Sequelize: S } = require('sequelize');

  for (const file of MIGRATIONS) {
    const name = file;
    const [[exists]] = await sequelize.query(
      `SELECT 1 FROM "SequelizeMeta" WHERE name = :name`,
      { replacements: { name } }
    );
    if (exists) {
      console.log(`⏭  skip ${name}`);
      continue;
    }
    console.log(`→ ${name}`);
    const mod = require(path.join(__dirname, '..', 'migrations', file));
    await mod.up(queryInterface, S);
    await sequelize.query(`INSERT INTO "SequelizeMeta" (name) VALUES (:name)`, { replacements: { name } });
    console.log(`✓ ${name}`);
  }

  // employee_contracts (lifecycle) — UUID employee FK
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_contracts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID, employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      contract_type VARCHAR(20) NOT NULL DEFAULT 'PKWTT',
      contract_number VARCHAR(100), start_date DATE NOT NULL, end_date DATE,
      probation_end DATE, status VARCHAR(20) DEFAULT 'active',
      salary DECIMAL(15,2), position VARCHAR(100), department VARCHAR(50),
      branch_id UUID, document_id UUID, renewal_count INTEGER DEFAULT 0,
      previous_contract_id UUID, termination_date DATE, termination_reason TEXT,
      notes TEXT, created_by UUID, approved_by UUID, approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ employee_contracts');

  console.log('\n✅ Pending migrations applied');
  await sequelize.close();
}

run().catch((e) => { console.error('❌', e.message); process.exit(1); });
