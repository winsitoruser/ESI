#!/usr/bin/env node
/** Ensure superadmin@bedagang.com exists with known password */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

const PASSWORD = process.env.SUPERADMIN_PASSWORD || 'superadmin123';
const EMAIL = process.env.TENANT_SUPERADMIN_EMAIL || 'superadmin@bedagang.com';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } },
});

(async () => {
  await sequelize.authenticate();
  const hash = await bcrypt.hash(PASSWORD, 10);
  const [rows] = await sequelize.query('SELECT id FROM users WHERE email = :email', {
    replacements: { email: EMAIL },
  });
  if (rows.length) {
    await sequelize.query(
      `UPDATE users SET password = :p, role = 'super_admin', "isActive" = true, "updatedAt" = NOW() WHERE email = :email`,
      { replacements: { p: hash, email: EMAIL } }
    );
  } else {
    await sequelize.query(
      `INSERT INTO users (name, email, password, role, "isActive", "createdAt", "updatedAt")
       VALUES ('Super Admin', :email, :p, 'super_admin', true, NOW(), NOW())`,
      { replacements: { p: hash, email: EMAIL } }
    );
  }
  console.log(`✓ superadmin ready (${EMAIL})`);
  await sequelize.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
