#!/usr/bin/env node
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

(async () => {
  const hash = await bcrypt.hash('superadmin123', 10);
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query("ALTER TYPE enum_users_role ADD VALUE IF NOT EXISTS 'super_admin'");
  const exists = await c.query("SELECT id FROM users WHERE email='superadmin@bedagang.com'");
  if (exists.rowCount) {
    await c.query(
      "UPDATE users SET password=$1, role='super_admin', \"isActive\"=true WHERE email='superadmin@bedagang.com'",
      [hash]
    );
    console.log('updated superadmin');
  } else {
    await c.query(
      'INSERT INTO users (name, email, password, role, "isActive", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,true,NOW(),NOW())',
      ['Super Admin', 'superadmin@bedagang.com', hash, 'super_admin']
    );
    console.log('created superadmin');
  }
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
