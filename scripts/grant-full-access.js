/**
 * Grant Full Access — buka semua akses untuk akun super admin lokal.
 *
 * Yang dilakukan skrip ini (idempotent, aman dijalankan berulang kali):
 *   1. Pastikan user `superadmin@bedagang.com` ada (buat kalau belum),
 *      dengan password default `MasterAdmin2026!`.
 *   2. Set kolom-kolom kunci di tabel `users`:
 *         role         = 'super_admin'   → bypass penuh di permission-resolver
 *         data_scope   = 'all_branches'
 *         is_active    = true
 *         tenant_id    = tenant lokal    → supaya /hq/* yang butuh tenant tidak tertolak
 *   3. (Kalau tabel roles ada) pastikan role "SUPER_ADMIN" dengan
 *      permissions = { "*": true }, level = 1, is_system = true, is_active = true.
 *   4. (Kalau kolom users.role_id ada) set ke role tsb.
 *
 * Catatan:
 *   - Permission resolver sudah memberikan `{ "*": true }` otomatis ketika
 *     users.role ∈ {super_admin, owner, superhero}, jadi langkah 3 & 4 hanya
 *     safety-net. Kalau migrasi role_permissions belum dijalankan, user
 *     tetap akan dapat bypass penuh dari users.role saja.
 *   - Skrip ini pakai RAW SQL untuk menghindari drift skema di model
 *     Sequelize (mis. role_id belum ada di DB tapi sudah ada di association).
 *   - Setelah skrip dijalankan, LOGOUT lalu LOGIN ulang supaya JWT membawa
 *     role terbaru.
 *
 * Jalankan:   node scripts/grant-full-access.js
 */

require('dotenv').config({ path: '.env.development' });

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Pakai sequelize instance langsung supaya tidak trigger semua model registration
const sequelize = require('../lib/sequelize');

const TARGET_EMAIL = process.env.LOCAL_ADMIN_EMAIL || 'superadmin@bedagang.com';
const DEFAULT_PASSWORD = 'MasterAdmin2026!';
const LOCAL_TENANT_ID = '11111111-1111-1111-1111-111111111111';
const SUPER_ROLE_CODE = 'SUPER_ADMIN';
const SUPER_ROLE_NAME = 'Super Admin';

async function tableExists(name) {
  const [rows] = await sequelize.query(
    `SELECT to_regclass(:qname) AS t`,
    { replacements: { qname: `public.${name}` } }
  );
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

async function getUserByEmail(email) {
  const [rows] = await sequelize.query(
    `SELECT id, email, role, tenant_id, "isActive" AS is_active, data_scope
       FROM users WHERE email = :email LIMIT 1`,
    { replacements: { email } }
  );
  return rows?.[0] || null;
}

async function tenantExists(id) {
  const [rows] = await sequelize.query(
    `SELECT id FROM tenants WHERE id = :id LIMIT 1`,
    { replacements: { id } }
  );
  return rows.length > 0;
}

async function ensureUser() {
  console.log(`\n1. Pastikan user ${TARGET_EMAIL} ada`);
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const hasTenantsTable = await tableExists('tenants');
  const hasLocalTenant = hasTenantsTable ? await tenantExists(LOCAL_TENANT_ID) : false;
  const tenantIdToUse = hasLocalTenant ? LOCAL_TENANT_ID : null;

  let user = await getUserByEmail(TARGET_EMAIL);

  if (!user) {
    await sequelize.query(
      `INSERT INTO users
         (name, email, phone, "businessName", password, role, tenant_id,
          data_scope, "isActive", "createdAt", "updatedAt")
       VALUES
         ('Super Administrator', :email, '+62-MASTER-ADMIN', 'System Administrator',
          :password, 'super_admin', :tenantId, 'all_branches', true, NOW(), NOW())`,
      {
        replacements: {
          email: TARGET_EMAIL,
          password: hashedPassword,
          tenantId: tenantIdToUse,
        },
      }
    );
    user = await getUserByEmail(TARGET_EMAIL);
    console.log(`   ✅ User dibuat (id=${user.id}).`);
  } else {
    await sequelize.query(
      `UPDATE users SET
         password    = :password,
         role        = 'super_admin',
         data_scope  = 'all_branches',
         "isActive"  = true,
         ${tenantIdToUse ? 'tenant_id = :tenantId,' : ''}
         "updatedAt" = NOW()
       WHERE email = :email`,
      {
        replacements: {
          email: TARGET_EMAIL,
          password: hashedPassword,
          ...(tenantIdToUse ? { tenantId: tenantIdToUse } : {}),
        },
      }
    );
    user = await getUserByEmail(TARGET_EMAIL);
    console.log(`   ✅ User diperbarui (id=${user.id}).`);
  }

  if (!hasLocalTenant) {
    console.log(
      `   ℹ️  Tenant lokal ${LOCAL_TENANT_ID} belum ada. Jalankan \`node scripts/setup-local-tenant.js\` kalau butuh context tenant.`
    );
  }

  return user;
}

async function ensureSuperRole() {
  console.log('\n2. Pastikan role SUPER_ADMIN ada di tabel roles (opsional)');

  if (!(await tableExists('roles'))) {
    console.log('   ℹ️  Tabel roles belum ada. Skip (super_admin bypass tetap aktif dari users.role).');
    return null;
  }

  const permissionsJson = JSON.stringify({ '*': true });

  // Siapkan daftar kolom yang tersedia agar SQL tahan skema lama.
  const colChecks = await Promise.all([
    columnExists('roles', 'code'),
    columnExists('roles', 'level'),
    columnExists('roles', 'data_scope'),
    columnExists('roles', 'is_system'),
    columnExists('roles', 'is_active'),
    columnExists('roles', 'user_count'),
  ]);
  const [hasCode, hasLevel, hasDataScope, hasIsSystem, hasIsActive, hasUserCount] = colChecks;

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
      `description = 'Super Admin - full unrestricted access (managed by grant-full-access.js)'`,
      `permissions = :permissions::jsonb`,
      `updated_at = NOW()`,
    ];
    if (hasCode) sets.push(`code = :code`);
    if (hasLevel) sets.push(`level = 1`);
    if (hasDataScope) sets.push(`data_scope = 'all'`);
    if (hasIsSystem) sets.push(`is_system = true`);
    if (hasIsActive) sets.push(`is_active = true`);

    await sequelize.query(
      `UPDATE roles SET ${sets.join(', ')} WHERE id = :id`,
      {
        replacements: {
          id,
          code: SUPER_ROLE_CODE,
          name: SUPER_ROLE_NAME,
          permissions: permissionsJson,
        },
      }
    );
    console.log(`   ✅ Role SUPER_ADMIN diperbarui (id=${id}).`);
    return id;
  }

  const newId = uuidv4();
  const cols = ['id', 'name', 'description', 'permissions', 'created_at', 'updated_at'];
  const vals = [
    ':id',
    ':name',
    `'Super Admin - full unrestricted access (managed by grant-full-access.js)'`,
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

  await sequelize.query(
    `INSERT INTO roles (${cols.join(', ')}) VALUES (${vals.join(', ')})`,
    {
      replacements: {
        id: newId,
        code: SUPER_ROLE_CODE,
        name: SUPER_ROLE_NAME,
        permissions: permissionsJson,
      },
    }
  );
  console.log(`   ✅ Role SUPER_ADMIN dibuat (id=${newId}).`);
  return newId;
}

async function linkUserToRole(userId, roleId) {
  console.log('\n3. Link users.role_id → roles.SUPER_ADMIN (opsional)');
  if (!roleId) {
    console.log('   ⏭  Tidak ada roleId, skip.');
    return;
  }
  const hasRoleIdColumn = await columnExists('users', 'role_id');
  if (!hasRoleIdColumn) {
    console.log('   ℹ️  Kolom users.role_id belum ada. Skip (super_admin bypass tetap aktif dari users.role).');
    return;
  }
  await sequelize.query(
    `UPDATE users SET role_id = :roleId, "updatedAt" = NOW() WHERE id = :userId`,
    { replacements: { roleId, userId } }
  );
  console.log('   ✅ users.role_id di-link.');
}

async function printSummary() {
  const hasRoleIdColumn = await columnExists('users', 'role_id');
  const hasRolesTable = await tableExists('roles');

  const selectSql = hasRoleIdColumn && hasRolesTable
    ? `SELECT u.id, u.email, u.role, u."isActive" AS is_active, u.data_scope, u.tenant_id,
              r.code AS role_code, r.name AS role_name, r.level AS role_level
         FROM users u
         LEFT JOIN roles r ON r.id = u.role_id
         WHERE u.email = :email LIMIT 1`
    : `SELECT id, email, role, "isActive" AS is_active, data_scope, tenant_id,
              NULL::text AS role_code, NULL::text AS role_name, NULL::int AS role_level
         FROM users WHERE email = :email LIMIT 1`;

  const [rows] = await sequelize.query(selectSql, { replacements: { email: TARGET_EMAIL } });
  const u = rows[0];
  console.log('\n' + '='.repeat(60));
  console.log('  ✨ FULL ACCESS GRANTED');
  console.log('='.repeat(60));
  console.log(`  User ID       : ${u?.id ?? '-'}`);
  console.log(`  Email         : ${TARGET_EMAIL}`);
  console.log(`  Password      : ${DEFAULT_PASSWORD}`);
  console.log(`  users.role    : ${u?.role ?? '-'}`);
  console.log(`  is_active     : ${u?.is_active}`);
  console.log(`  data_scope    : ${u?.data_scope ?? '-'}`);
  console.log(`  tenant_id     : ${u?.tenant_id ?? '(null — akses semua tenant)'}`);
  if (u?.role_code || u?.role_name) {
    console.log(`  role (DB)     : ${u?.role_code ?? '-'} / ${u?.role_name ?? '-'} (level ${u?.role_level ?? '-'})`);
  }
  console.log('='.repeat(60));
  console.log('\n  ➡️  LOGOUT lalu LOGIN ulang agar JWT berisi role terbaru.');
  console.log('      URL   : http://localhost:3001/auth/login');
  console.log('      Cache permission server auto-refresh < 30 detik setelah login.\n');
}

async function main() {
  console.log('🔓 Grant Full Access ke akun super admin lokal...');
  try {
    const user = await ensureUser();
    const roleId = await ensureSuperRole();
    await linkUserToRole(user.id, roleId);
    await printSummary();
    process.exitCode = 0;
  } catch (err) {
    console.error('\n❌ Gagal:', err.message);
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
