#!/usr/bin/env node
/**
 * Employee face liveness enrollment table + attendance face columns.
 * Run: npm run db:face-liveness-migrate
 */
require('dotenv').config();
const sequelize = require('../lib/sequelize');

async function main() {
  if (!sequelize) {
    console.error('No sequelize');
    process.exit(1);
  }
  await sequelize.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`).catch(() => {});
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_face_profiles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL,
      employee_id UUID NOT NULL,
      enroll_photo_key TEXT NOT NULL,
      enroll_photo_hash VARCHAR(64),
      liveness_passed BOOLEAN NOT NULL DEFAULT false,
      liveness_meta JSONB,
      enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, employee_id)
    )
  `);
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_face_profiles_employee ON employee_face_profiles (employee_id)`,
  ).catch(() => {});
  await sequelize.query(`ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS face_match_score NUMERIC`).catch(() => {});
  await sequelize.query(`ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS face_liveness_ok BOOLEAN`).catch(() => {});
  await sequelize.query(`ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS face_match_status VARCHAR(32)`).catch(() => {});
  console.log('employee_face_profiles + attendance face columns ok');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
