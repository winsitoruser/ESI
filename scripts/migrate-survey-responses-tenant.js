#!/usr/bin/env node
/**
 * Add tenant_id to survey_responses (backfill from surveys) for RLS.
 * Usage: DATABASE_URL=... node scripts/migrate-survey-responses-tenant.js
 */
require('dotenv').config({ path: process.env.DOTENV_PATH || '.env' });
try { require('dotenv').config({ path: '.env.local', override: false }); } catch (_) {}

const { Sequelize } = require('sequelize');
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions:
    DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
      ? {}
      : { ssl: { require: true, rejectUnauthorized: false } },
});

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = :table AND column_name = :column`,
    { replacements: { table, column } },
  );
  return rows.length > 0;
}

async function tableExists(name) {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = :name`,
    { replacements: { name } },
  );
  return rows.length > 0;
}

async function run() {
  await sequelize.authenticate();
  console.log('Migrate survey_responses.tenant_id');

  if (!(await tableExists('survey_responses'))) {
    console.log('  · skip — survey_responses missing');
    await sequelize.close();
    return;
  }

  if (!(await columnExists('survey_responses', 'tenant_id'))) {
    await sequelize.query(`ALTER TABLE survey_responses ADD COLUMN tenant_id UUID`);
    console.log('  + added tenant_id column');
  } else {
    console.log('  ✓ tenant_id column exists');
  }

  if (await tableExists('surveys') && (await columnExists('surveys', 'tenant_id'))) {
    const [, meta] = await sequelize.query(`
      UPDATE survey_responses sr
      SET tenant_id = s.tenant_id
      FROM surveys s
      WHERE sr.survey_id = s.id
        AND sr.tenant_id IS NULL
        AND s.tenant_id IS NOT NULL
    `);
    console.log(`  ✓ backfill from surveys (rowCount=${meta?.rowCount ?? 'n/a'})`);
  }

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_survey_responses_tenant_id ON survey_responses (tenant_id)
  `);
  console.log('  ✓ index idx_survey_responses_tenant_id');

  await sequelize.close();
  console.log('Done');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
