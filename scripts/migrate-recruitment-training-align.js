#!/usr/bin/env node
/**
 * Align recruitment & training tables missing from smoke-deps
 * Run: npm run db:recruitment-training-migrate
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

async function run() {
  await sequelize.authenticate();
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  console.log('Recruitment & training align migration...\n');

  // Candidate columns used by API
  const candidateCols = [
    `ALTER TABLE hris_candidates ADD COLUMN IF NOT EXISTS full_name VARCHAR(200)`,
    `ALTER TABLE hris_candidates ADD COLUMN IF NOT EXISTS current_stage VARCHAR(30) DEFAULT 'applied'`,
    `ALTER TABLE hris_candidates ADD COLUMN IF NOT EXISTS experience_summary TEXT`,
    `ALTER TABLE hris_candidates ADD COLUMN IF NOT EXISTS education_level VARCHAR(100)`,
    `ALTER TABLE hris_candidates ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 0`,
    `UPDATE hris_candidates SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL`,
    `UPDATE hris_candidates SET current_stage = COALESCE(current_stage, status, 'applied')`,
  ];
  for (const sql of candidateCols) {
    try { await sequelize.query(sql); } catch (e) { console.warn('  skip:', e.message); }
  }
  console.log('  ✓ hris_candidates columns');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_training_enrollments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      training_program_id UUID REFERENCES hris_training_programs(id) ON DELETE CASCADE,
      employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'enrolled',
      enrolled_at TIMESTAMPTZ DEFAULT NOW(),
      completion_date DATE,
      score DECIMAL(5,2),
      feedback TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ hris_training_enrollments');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_certifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
      certification_name VARCHAR(200) NOT NULL,
      issuing_organization VARCHAR(200),
      issued_date DATE,
      expiry_date DATE,
      status VARCHAR(20) DEFAULT 'active',
      credential_id VARCHAR(100),
      document_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ hris_certifications');

  const tablesNeedIdDefault = [
    'hris_training_curricula', 'hris_training_modules', 'hris_training_batches',
    'hris_training_schedules', 'hris_training_exams', 'hris_training_exam_questions',
    'hris_training_exam_results', 'hris_training_graduations', 'hris_training_placements',
    'hris_training_scoring_configs', 'hris_training_competencies', 'hris_training_participant_scores',
    'hris_candidate_accounts',
  ];
  for (const table of tablesNeedIdDefault) {
    try {
      await sequelize.query(`ALTER TABLE ${table} ALTER COLUMN id SET DEFAULT gen_random_uuid()`);
    } catch (e) { /* table may not exist yet */ }
  }
  console.log('  ✓ UUID defaults on training tables');

  // Run training-development + scoring migrations if tables still missing
  try {
    const [r] = await sequelize.query(`SELECT to_regclass('public.hris_training_curricula') AS t`);
    if (!r[0]?.t) {
      require('child_process').execSync('node scripts/run-humanify-pending-migrations.js', { stdio: 'inherit' });
    } else {
      console.log('  ✓ training-development tables exist');
    }
  } catch (e) {
    console.warn('  pending migrations:', e.message);
  }

  await sequelize.close();
  console.log('\n✅ Recruitment & training align complete');
}

run().catch((e) => { console.error('❌', e.message); process.exit(1); });
