#!/usr/bin/env node
/** Align users table schema for Humanify auth on fresh VPS DB */
require('dotenv').config();
const { Client } = require('pg');

const ALTERS = [
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS data_scope VARCHAR(20) DEFAULT 'all_branches'",
];

const ENUM_VALUES = [
  'super_admin', 'hq_admin', 'branch_manager', 'inventory_staff',
  'kitchen_staff', 'finance_staff', 'hr_staff',
];

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  for (const sql of ALTERS) {
    await c.query(sql);
    console.log('✓', sql.split(' ').slice(0, 6).join(' '), '...');
  }

  for (const val of ENUM_VALUES) {
    await c.query(`ALTER TYPE enum_users_role ADD VALUE IF NOT EXISTS '${val}'`);
  }
  console.log('✓ enum_users_role extended');

  await c.end();
  console.log('✅ users schema aligned');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
