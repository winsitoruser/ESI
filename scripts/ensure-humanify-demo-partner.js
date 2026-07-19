#!/usr/bin/env node
/**
 * Upsert stable DEMO partner (10% commission) for sales walkthroughs.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/ensure-humanify-demo-partner.js
 *   ATTACH_SLUG=demo npm run ensure:demo-partner
 *   ATTACH_SLUG= npm run ensure:demo-partner   # skip tenant attach
 */
require('dotenv').config();
const crypto = require('crypto');
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const ATTACH_SLUG =
  process.env.ATTACH_SLUG !== undefined
    ? String(process.env.ATTACH_SLUG).trim()
    : 'demo';

if (!DATABASE_URL) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

async function main() {
  const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions:
      DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
        ? {}
        : { ssl: { require: true, rejectUnauthorized: false } },
  });
  await sequelize.authenticate();

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_partners (
      id UUID PRIMARY KEY,
      code VARCHAR(32) NOT NULL UNIQUE,
      name VARCHAR(160) NOT NULL,
      contact_email VARCHAR(255),
      commission_pct NUMERIC(5,2) NOT NULL DEFAULT 10,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const code = 'DEMO';
  const name = 'Humanify Demo Partner';
  const email = 'partners@humanify.id';
  const pct = 10;
  const notes = 'Wave-21 sales walkthrough — signup ?ref=DEMO / ?partner=DEMO';

  const [existing] = await sequelize.query(
    `SELECT id FROM saas_partners WHERE code = :code LIMIT 1`,
    { replacements: { code } },
  );
  let id = existing?.[0]?.id;
  let created = false;
  if (id) {
    await sequelize.query(
      `UPDATE saas_partners
       SET name = :name, contact_email = :email, commission_pct = :pct,
           status = 'active', notes = :notes, updated_at = NOW()
       WHERE code = :code`,
      { replacements: { code, name, email, pct, notes } },
    );
    console.log(`✓ DEMO partner updated (${id})`);
  } else {
    id = crypto.randomUUID();
    await sequelize.query(
      `INSERT INTO saas_partners (id, code, name, contact_email, commission_pct, status, notes)
       VALUES (:id, :code, :name, :email, :pct, 'active', :notes)`,
      { replacements: { id, code, name, email, pct, notes } },
    );
    created = true;
    console.log(`✓ DEMO partner created (${id})`);
  }

  if (ATTACH_SLUG) {
    const [tenants] = await sequelize.query(
      `SELECT id, settings FROM tenants WHERE slug = :slug LIMIT 1`,
      { replacements: { slug: ATTACH_SLUG } },
    );
    const t = tenants?.[0];
    if (!t) {
      console.log(`· slug "${ATTACH_SLUG}" not found — skip attach`);
    } else {
      let settings = {};
      try {
        settings = typeof t.settings === 'string' ? JSON.parse(t.settings) : (t.settings || {});
      } catch {
        settings = {};
      }
      settings.partner_code = code;
      settings.partner = {
        id,
        code,
        name,
        attachedAt: new Date().toISOString(),
      };
      await sequelize.query(
        `UPDATE tenants SET settings = CAST(:settings AS jsonb), updated_at = NOW() WHERE id = :id`,
        { replacements: { id: t.id, settings: JSON.stringify(settings) } },
      );
      console.log(`✓ attached DEMO → tenant slug=${ATTACH_SLUG}`);
    }
  }

  console.log(JSON.stringify({ code, id, created, attachSlug: ATTACH_SLUG || null }, null, 2));
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
