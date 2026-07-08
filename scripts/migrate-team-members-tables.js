#!/usr/bin/env node
/**
 * Create team_members table for HRIS (UUID — matches live schema).
 * Safe to run multiple times.
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres', logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } }
});

async function run() {
  await sequelize.authenticate();
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE team_member_role AS ENUM ('sales','marketing','ops','finance','admin','manager','executive');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `);
  await sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE team_member_status AS ENUM ('active','inactive','resigned');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS team_members (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      phone VARCHAR(20),
      role team_member_role NOT NULL,
      department VARCHAR(100),
      status team_member_status NOT NULL DEFAULT 'active',
      join_date DATE,
      user_id UUID,
      tenant_id UUID,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_team_members_tenant ON team_members(tenant_id)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status)`);

  await sequelize.query(`
    ALTER TABLE team_members
      ADD COLUMN IF NOT EXISTS employee_id UUID,
      ADD COLUMN IF NOT EXISTS location VARCHAR(100),
      ADD COLUMN IF NOT EXISTS work_area VARCHAR(50)
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_team_members_employee_id ON team_members(employee_id)`);

  console.log('✓ team_members table ready');
  await sequelize.close();
}

run().catch(e => { console.error(e.message); process.exit(1); });
