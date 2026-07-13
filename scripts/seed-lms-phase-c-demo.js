#!/usr/bin/env node
/** Seed LMS Phase C — academy settings, integration rules, external learner demo */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } },
});

async function main() {
  const [tenants] = await sequelize.query('SELECT id FROM tenants LIMIT 1');
  const tenantId = tenants[0]?.id;
  if (!tenantId) { console.error('No tenant'); process.exit(1); }

  await sequelize.query(`
    INSERT INTO hris_lms_academy_settings (id, tenant_id, slug, academy_name, primary_color, welcome_message)
    VALUES (gen_random_uuid(), :tid, 'humanify-academy', 'Humanify Academy', '#4f46e5', 'Selamat datang di program pembelajaran Humanify!')
    ON CONFLICT (tenant_id) DO NOTHING
  `, { replacements: { tid: tenantId } }).catch(() => {});

  const rules = [
    ['recruitment_hire_enroll', { curriculum_codes: ['LMS-ONB-2026'], mandatory: true }],
    ['exam_pass_allowance', { enabled_on_exam_pass: true }],
    ['competency_kpi_sync', { category: 'hr' }],
    ['cert_expiry_reminder', { days_before: 30 }],
  ];
  for (const [rt, cfg] of rules) {
    await sequelize.query(`
      INSERT INTO hris_lms_integration_rules (id, tenant_id, rule_type, enabled, config)
      SELECT gen_random_uuid(), :tid, :rt, true, :cfg::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM hris_lms_integration_rules WHERE tenant_id = :tid AND rule_type = :rt)
    `, { replacements: { tid: tenantId, rt, cfg: JSON.stringify(cfg) } }).catch(() => {});
  }

  await sequelize.query(`
    UPDATE hris_training_curricula SET onboarding_default = true, training_allowance_amount = 500000
    WHERE code = 'LMS-ONB-2026' AND tenant_id = :tid
  `, { replacements: { tid: tenantId } }).catch(() => {});

  const token = require('crypto').randomBytes(24).toString('hex');
  const [cur] = await sequelize.query(
    `SELECT id FROM hris_training_curricula WHERE code = 'LMS-ONB-2026' AND tenant_id = :tid LIMIT 1`,
    { replacements: { tid: tenantId } },
  );
  if (cur[0]?.id) {
    await sequelize.query(`
      INSERT INTO hris_lms_external_learners (id, tenant_id, email, full_name, learner_type, curriculum_id, access_token, status)
      SELECT gen_random_uuid(), :tid, 'demo.partner@humanify.id', 'Demo Partner Learner', 'partner', :cid, :token, 'invited'
      WHERE NOT EXISTS (SELECT 1 FROM hris_lms_external_learners WHERE email = 'demo.partner@humanify.id' AND tenant_id = :tid)
    `, { replacements: { tid: tenantId, cid: cur[0].id, token } });
    console.log('External learner invite: /learn/' + token);
  }

  console.log('Phase C seed done');
  await sequelize.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
