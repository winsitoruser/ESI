#!/usr/bin/env node
/**
 * Formal migrate for saas_partner_payouts (Wave-61 / BE-6).
 * Idempotent — same DDL as lib/saas/partner-payouts ensurePartnerPayoutsTable.
 */
require('dotenv').config();
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
    DATABASE_URL.includes('127.0.0.1') || DATABASE_URL.includes('localhost')
      ? {}
      : { ssl: { require: true, rejectUnauthorized: false } },
});

async function run() {
  await sequelize.authenticate();
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_partner_payouts (
      id UUID PRIMARY KEY,
      partner_code VARCHAR(32) NOT NULL,
      period_from DATE,
      period_to DATE,
      amount_idr BIGINT NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      paid_at TIMESTAMPTZ,
      note TEXT,
      created_by VARCHAR(160),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_partner_payouts_code
    ON saas_partner_payouts (partner_code, status, created_at DESC)
  `);
  console.log('✓ saas_partner_payouts ready');
  await sequelize.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
