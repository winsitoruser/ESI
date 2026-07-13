#!/usr/bin/env node
/**
 * Ensure Humanify super admin — full access (role + permissions + tenant).
 *
 * Jalankan di VPS setelah migrate:
 *   node scripts/ensure-humanify-superadmin.js
 *
 * Env opsional:
 *   DATABASE_URL / POSTGRES_URL
 *   TENANT_SUPERADMIN_EMAIL (default: superadmin@humanify.id)
 *   SUPERADMIN_PASSWORD     (default: superadmin123)
 */
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL atau POSTGRES_URL wajib di-set');
  process.exit(1);
}

const LEGACY_EMAIL = 'superadmin@bedagang.com';
const EMAIL = process.env.TENANT_SUPERADMIN_EMAIL || 'superadmin@humanify.id';
const PASSWORD = process.env.SUPERADMIN_PASSWORD || 'superadmin123';
const LOCAL_TENANT_ID = '11111111-1111-1111-1111-111111111111';
const SUPER_ROLE_CODE = 'SUPER_ADMIN';
const SUPER_ROLE_NAME = 'Super Admin';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions:
    DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
      ? {}
      : { ssl: { require: true, rejectUnauthorized: false } },
});

async function tableExists(name) {
  const [rows] = await sequelize.query(`SELECT to_regclass(:qname) AS t`, {
    replacements: { qname: `public.${name}` },
  });
  return rows?.[0]?.t != null;
}

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT column_name FROM information_schema.columns
       WHERE table_name = :table AND column_name = :column LIMIT 1`,
    { replacements: { table, column } }
  );
  return rows.length > 0;
}

async function tenantExists(id) {
  const [rows] = await sequelize.query(`SELECT id FROM tenants WHERE id = :id LIMIT 1`, {
    replacements: { id },
  });
  return rows.length > 0;
}

async function getUserByEmail(email) {
  const [rows] = await sequelize.query(
    `SELECT id, email, role, tenant_id, "isActive" AS is_active, data_scope
       FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1`,
    { replacements: { email } }
  );
  return rows?.[0] || null;
}

async function migrateLegacyEmail() {
  if (EMAIL.toLowerCase() === LEGACY_EMAIL.toLowerCase()) return;
  const legacy = await getUserByEmail(LEGACY_EMAIL);
  const current = await getUserByEmail(EMAIL);
  if (legacy && !current) {
    await sequelize.query(
      `UPDATE users SET email = :email, "updatedAt" = NOW() WHERE id = :id`,
      { replacements: { email: EMAIL, id: legacy.id } }
    );
    console.log(`✓ Email dimigrasi ${LEGACY_EMAIL} → ${EMAIL}`);
  }
}

async function ensureUser() {
  await migrateLegacyEmail();
  const hash = await bcrypt.hash(PASSWORD, 10);
  const hasTenantsTable = await tableExists('tenants');
  const hasLocalTenant = hasTenantsTable ? await tenantExists(LOCAL_TENANT_ID) : false;
  const tenantIdToUse = hasLocalTenant ? LOCAL_TENANT_ID : null;

  let user = await getUserByEmail(EMAIL);
  if (!user) {
    const cols = ['name', 'email', 'password', 'role', '"isActive"', '"createdAt"', '"updatedAt"'];
    const vals = [`'Super Administrator'`, ':email', ':password', `'super_admin'`, 'true', 'NOW()', 'NOW()'];
    const replacements = { email: EMAIL, password: hash };

    if (await columnExists('users', 'data_scope')) {
      cols.push('data_scope');
      vals.push(`'all_branches'`);
    }
    if (tenantIdToUse && (await columnExists('users', 'tenant_id'))) {
      cols.push('tenant_id');
      vals.push(':tenantId');
      replacements.tenantId = tenantIdToUse;
    }
    if (await columnExists('users', 'phone')) {
      cols.push('phone');
      vals.push(`'+62-MASTER-ADMIN'`);
    }
    if (await columnExists('users', 'businessName')) {
      cols.push('"businessName"');
      vals.push(`'Humanify Administrator'`);
    }

    await sequelize.query(
      `INSERT INTO users (${cols.join(', ')}) VALUES (${vals.join(', ')})`,
      { replacements }
    );
    user = await getUserByEmail(EMAIL);
    console.log(`✓ User dibuat (id=${user.id})`);
  } else {
    const sets = [
      'password = :password',
      `role = 'super_admin'`,
      '"isActive" = true',
      '"updatedAt" = NOW()',
    ];
    const replacements = { email: EMAIL, password: hash };
    if (await columnExists('users', 'data_scope')) sets.push(`data_scope = 'all_branches'`);
    if (tenantIdToUse && (await columnExists('users', 'tenant_id'))) {
      sets.push('tenant_id = :tenantId');
      replacements.tenantId = tenantIdToUse;
    }
    await sequelize.query(`UPDATE users SET ${sets.join(', ')} WHERE LOWER(email) = LOWER(:email)`, {
      replacements,
    });
    user = await getUserByEmail(EMAIL);
    console.log(`✓ User diperbarui (id=${user.id})`);
  }

  return user;
}

async function ensureSuperRole() {
  if (!(await tableExists('roles'))) {
    console.log('ℹ️  Tabel roles belum ada — bypass super_admin dari users.role tetap aktif');
    return null;
  }

  const permissionsJson = JSON.stringify({ '*': true });
  const [hasCode, hasLevel, hasDataScope, hasIsSystem, hasIsActive, hasUserCount] = await Promise.all([
    columnExists('roles', 'code'),
    columnExists('roles', 'level'),
    columnExists('roles', 'data_scope'),
    columnExists('roles', 'is_system'),
    columnExists('roles', 'is_active'),
    columnExists('roles', 'user_count'),
  ]);

  const [existing] = await sequelize.query(
    hasCode
      ? `SELECT id FROM roles WHERE code = :code OR name = :name LIMIT 1`
      : `SELECT id FROM roles WHERE name = :name LIMIT 1`,
    { replacements: { code: SUPER_ROLE_CODE, name: SUPER_ROLE_NAME } }
  );

  if (existing.length) {
    const id = existing[0].id;
    const sets = [
      `name = :name`,
      `description = 'Super Admin — full unrestricted access (Humanify)'`,
      `permissions = :permissions::jsonb`,
      `updated_at = NOW()`,
    ];
    if (hasCode) sets.push(`code = :code`);
    if (hasLevel) sets.push(`level = 1`);
    if (hasDataScope) sets.push(`data_scope = 'all'`);
    if (hasIsSystem) sets.push(`is_system = true`);
    if (hasIsActive) sets.push(`is_active = true`);

    await sequelize.query(`UPDATE roles SET ${sets.join(', ')} WHERE id = :id`, {
      replacements: { id, code: SUPER_ROLE_CODE, name: SUPER_ROLE_NAME, permissions: permissionsJson },
    });
    console.log(`✓ Role SUPER_ADMIN diperbarui (id=${id})`);
    return id;
  }

  const newId = uuidv4();
  const cols = ['id', 'name', 'description', 'permissions', 'created_at', 'updated_at'];
  const vals = [
    ':id',
    ':name',
    `'Super Admin — full unrestricted access (Humanify)'`,
    ':permissions::jsonb',
    'NOW()',
    'NOW()',
  ];
  if (hasCode) { cols.push('code'); vals.push(':code'); }
  if (hasLevel) { cols.push('level'); vals.push('1'); }
  if (hasDataScope) { cols.push('data_scope'); vals.push(`'all'`); }
  if (hasIsSystem) { cols.push('is_system'); vals.push('true'); }
  if (hasIsActive) { cols.push('is_active'); vals.push('true'); }
  if (hasUserCount) { cols.push('user_count'); vals.push('0'); }

  await sequelize.query(`INSERT INTO roles (${cols.join(', ')}) VALUES (${vals.join(', ')})`, {
    replacements: { id: newId, code: SUPER_ROLE_CODE, name: SUPER_ROLE_NAME, permissions: permissionsJson },
  });
  console.log(`✓ Role SUPER_ADMIN dibuat (id=${newId})`);
  return newId;
}

async function linkUserToRole(userId, roleId) {
  if (!roleId || !(await columnExists('users', 'role_id'))) return;
  await sequelize.query(`UPDATE users SET role_id = :roleId, "updatedAt" = NOW() WHERE id = :userId`, {
    replacements: { roleId, userId },
  });
  console.log('✓ users.role_id di-link ke SUPER_ADMIN');
}

async function main() {
  console.log('🔓 Ensure Humanify super admin...');
  await sequelize.authenticate();
  const user = await ensureUser();
  const roleId = await ensureSuperRole();
  await linkUserToRole(user.id, roleId);

  console.log('\n' + '='.repeat(56));
  console.log('  Humanify Super Admin siap');
  console.log('='.repeat(56));
  console.log(`  Email    : ${EMAIL}`);
  console.log(`  Password : ${PASSWORD}`);
  console.log(`  Role     : super_admin (full bypass)`);
  console.log(`  Login    : /humanify/login`);
  console.log('='.repeat(56));
  console.log('\n  ➡️  Logout lalu login ulang agar JWT memuat role terbaru.\n');

  await sequelize.close();
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
