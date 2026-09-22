#!/usr/bin/env node
/**
 * Local seed for Talent Bank / ATS add-ons (pure SQL — no TS require).
 * Usage: node scripts/seed-local-talent-bank.js
 */
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function main() {
  const sequelize = require('../lib/sequelize');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_talent_profiles (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(64),
      headline VARCHAR(255),
      location VARCHAR(255),
      location_area VARCHAR(255),
      current_title VARCHAR(255),
      current_company VARCHAR(255),
      experience_years NUMERIC(5,1),
      education_level VARCHAR(64),
      skills JSONB NOT NULL DEFAULT '[]'::jsonb,
      industries JSONB NOT NULL DEFAULT '[]'::jsonb,
      salary_current INTEGER,
      salary_expected_min INTEGER,
      salary_expected_max INTEGER,
      notice_days INTEGER,
      work_preference VARCHAR(64),
      intent VARCHAR(32) NOT NULL DEFAULT 'open',
      source VARCHAR(64),
      resume_url TEXT,
      resume_text TEXT,
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      consent_talent_pool BOOLEAN NOT NULL DEFAULT TRUE,
      consent_contact BOOLEAN NOT NULL DEFAULT TRUE,
      profile_updated_at TIMESTAMPTZ,
      salary_verified_at TIMESTAMPTZ,
      location_verified_at TIMESTAMPTZ,
      availability_verified_at TIMESTAMPTZ,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_talent_evidence (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL,
      profile_id UUID NOT NULL REFERENCES hris_talent_profiles(id) ON DELETE CASCADE,
      claim_key VARCHAR(128) NOT NULL,
      claim_label VARCHAR(255) NOT NULL,
      evidence TEXT NOT NULL,
      source VARCHAR(128) NOT NULL DEFAULT 'cv',
      confidence NUMERIC(5,2) NOT NULL DEFAULT 70,
      verified BOOLEAN NOT NULL DEFAULT FALSE,
      observed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_talent_interactions (
      id UUID PRIMARY KEY,
      tenant_id UUID NOT NULL,
      profile_id UUID NOT NULL REFERENCES hris_talent_profiles(id) ON DELETE CASCADE,
      kind VARCHAR(64) NOT NULL,
      title VARCHAR(255),
      detail TEXT,
      opening_id UUID,
      candidate_id UUID,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_talent_self_update_tokens (
      token VARCHAR(64) PRIMARY KEY,
      tenant_id UUID NOT NULL,
      profile_id UUID NOT NULL REFERENCES hris_talent_profiles(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const [tenants] = await sequelize.query(
    `SELECT id, name, subscription_plan, settings FROM tenants ORDER BY created_at ASC NULLS LAST LIMIT 30`,
  );
  if (!tenants?.length) {
    console.error('No tenants found');
    process.exit(1);
  }

  let tenant = tenants.find((t) => String(t.subscription_plan || '').toLowerCase() === 'trial')
    || tenants.find((t) => /humanify|naincode|demo/i.test(String(t.name || '')))
    || tenants[0];

  console.log(`Using tenant: ${tenant.name} (${tenant.id}) plan=${tenant.subscription_plan}`);

  let settings = {};
  try {
    settings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {});
  } catch { settings = {}; }
  if (!settings || typeof settings !== 'object') settings = {};
  const billing = settings.billing && typeof settings.billing === 'object' ? settings.billing : {};
  const prev = billing.addons && typeof billing.addons === 'object' ? billing.addons : {};
  const addons = {
    lms: Boolean(prev.lms),
    ai: Boolean(prev.ai),
    ats: true,
    talentBank: true,
  };
  settings.billing = { ...billing, addons, updatedAt: new Date().toISOString() };
  await sequelize.query(
    `UPDATE tenants SET settings = CAST(:settings AS jsonb), updated_at = NOW() WHERE id = :id`,
    { replacements: { id: tenant.id, settings: JSON.stringify(settings) } },
  );
  console.log('Add-ons enabled:', addons);

  const email = 'andi.pratama.demo@example.com';
  const [existing] = await sequelize.query(
    `SELECT id FROM hris_talent_profiles WHERE tenant_id = :tid AND lower(email) = :email LIMIT 1`,
    { replacements: { tid: tenant.id, email } },
  );
  const id = existing?.[0]?.id || crypto.randomUUID();
  const now = new Date().toISOString();

  if (existing?.[0]) {
    await sequelize.query(
      `UPDATE hris_talent_profiles SET
        full_name = :name, headline = :headline, location = :loc, location_area = :loc,
        current_title = :title, current_company = :company, experience_years = 5,
        skills = CAST(:skills AS jsonb), industries = CAST(:industries AS jsonb),
        salary_expected_min = 9500000, salary_expected_max = 10500000,
        notice_days = 30, work_preference = 'hybrid', intent = 'open',
        resume_text = :resume, profile_updated_at = :now,
        salary_verified_at = :now, location_verified_at = :now, availability_verified_at = :now,
        updated_at = NOW()
       WHERE id = :id AND tenant_id = :tid`,
      {
        replacements: {
          id, tid: tenant.id, name: 'Andi Pratama', headline: 'Senior Digital Marketing',
          loc: 'Tangerang', title: 'Digital Marketing Specialist', company: 'PT Demo FMCG',
          skills: JSON.stringify(['digital marketing', 'meta ads', 'google ads', 'analytics']),
          industries: JSON.stringify(['FMCG']),
          resume: 'Digital Marketing Specialist 5 tahun di FMCG. Meta Ads, Google Ads, Analytics. Domisili Tangerang.',
          now,
        },
      },
    );
  } else {
    await sequelize.query(
      `INSERT INTO hris_talent_profiles (
        id, tenant_id, full_name, email, phone, headline, location, location_area,
        current_title, current_company, experience_years, education_level,
        skills, industries, salary_expected_min, salary_expected_max, notice_days,
        work_preference, intent, source, resume_text, tags,
        consent_talent_pool, consent_contact, profile_updated_at,
        salary_verified_at, location_verified_at, availability_verified_at
      ) VALUES (
        :id, :tid, 'Andi Pratama', :email, '081234567890', 'Senior Digital Marketing',
        'Tangerang', 'Tangerang', 'Digital Marketing Specialist', 'PT Demo FMCG', 5, 'S1',
        CAST(:skills AS jsonb), CAST(:industries AS jsonb), 9500000, 10500000, 30,
        'hybrid', 'open', 'seed', :resume, CAST(:tags AS jsonb),
        TRUE, TRUE, :now, :now, :now, :now
      )`,
      {
        replacements: {
          id, tid: tenant.id, email,
          skills: JSON.stringify(['digital marketing', 'meta ads', 'google ads', 'analytics']),
          industries: JSON.stringify(['FMCG']),
          resume: 'Digital Marketing Specialist 5 tahun di FMCG. Meta Ads, Google Ads, Analytics. Domisili Tangerang.',
          tags: JSON.stringify(['seed', 'demo']),
          now,
        },
      },
    );
  }

  const [countRows] = await sequelize.query(
    `SELECT COUNT(*)::int AS n FROM hris_talent_profiles WHERE tenant_id = :tid`,
    { replacements: { tid: tenant.id } },
  );

  console.log(JSON.stringify({
    ok: true,
    tenantId: tenant.id,
    tenantName: tenant.name,
    plan: tenant.subscription_plan,
    profileId: id,
    totalProfiles: countRows?.[0]?.n || 0,
    addons,
    urls: {
      bank: 'http://localhost:3010/humanify/talent-bank',
      recruitment: 'http://localhost:3010/humanify/recruitment',
      login: 'http://localhost:3010/humanify/login',
    },
  }, null, 2));

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
