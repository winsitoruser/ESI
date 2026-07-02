/**
 * Setup Local Tenant + Billing
 *
 * Skrip sekali-jalan untuk lokal dev:
 *  1. Memastikan tabel billing (plans, subscriptions, invoices, dst) ada.
 *  2. Menyeed data plan default (Starter, Professional, Enterprise).
 *  3. Membuat tenant "Bedagang HQ (Local Dev)" dengan status active + HQ.
 *  4. Mengaitkan user superadmin@bedagang.com ke tenant tersebut.
 *  5. Membuat subscription aktif + 1 invoice lunas untuk demo billing-info.
 *  6. Meng-enable core modules (pos, inventory, finance) di tenant_modules.
 *
 * Jalankan: `node scripts/setup-local-tenant.js`
 */

require('dotenv').config({ path: '.env.development' });

const { v4: uuidv4 } = require('uuid');
const path = require('path');

const db = require('../models');
const billingMigration = require('../migrations/20260217-create-billing-tables.js');

const SUPERADMIN_EMAIL = process.env.LOCAL_ADMIN_EMAIL || 'superadmin@bedagang.com';
const TENANT_ID_FIXED = '11111111-1111-1111-1111-111111111111'; // stabil supaya mudah dicek
const PLAN_ENTERPRISE_ID = '550e8400-e29b-41d4-a716-446655440003';
const PLAN_PROFESSIONAL_ID = '550e8400-e29b-41d4-a716-446655440002';
const PLAN_STARTER_ID = '550e8400-e29b-41d4-a716-446655440001';

async function tableExists(name) {
  const [rows] = await db.sequelize.query(
    `SELECT to_regclass('public.${name}') AS t`
  );
  return rows?.[0]?.t !== null;
}

async function ensureBillingTables() {
  const exists = await tableExists('plans');
  if (exists) {
    console.log('   ℹ️  Tabel billing sudah ada, skip migration.');
    return;
  }
  console.log('   ⚙️  Menjalankan migration billing...');
  const qi = db.sequelize.getQueryInterface();
  await billingMigration.up(qi, db.Sequelize);
  // Tandai migration sebagai terpasang
  await db.sequelize.query(
    `INSERT INTO "SequelizeMeta"(name) VALUES ('20260217-create-billing-tables.js')
     ON CONFLICT DO NOTHING;`
  );
  console.log('   ✅ Migration billing selesai.');
}

async function ensurePlans() {
  const count = await db.Plan.count();
  if (count > 0) {
    console.log(`   ℹ️  Plans sudah terseed (${count} record), skip.`);
    return;
  }
  console.log('   📦 Seed default plans...');
  const now = new Date();
  await db.Plan.bulkCreate([
    {
      id: PLAN_STARTER_ID,
      name: 'Starter',
      description: 'Paket dasar untuk usaha kecil',
      price: 299000,
      billingInterval: 'monthly',
      currency: 'IDR',
      trialDays: 14,
      features: { pos: true, inventory: true, reports: true },
      sortOrder: 1,
      maxUsers: 3,
      maxBranches: 1,
      maxProducts: 100,
      maxTransactions: 500,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: PLAN_PROFESSIONAL_ID,
      name: 'Professional',
      description: 'Untuk bisnis berkembang dengan beberapa cabang',
      price: 799000,
      billingInterval: 'monthly',
      currency: 'IDR',
      trialDays: 14,
      features: {
        pos: true, inventory: true, kitchen: true, tables: true,
        reservations: true, finance: true, reports: true,
      },
      sortOrder: 2,
      maxUsers: 10,
      maxBranches: 3,
      maxProducts: 1000,
      maxTransactions: 5000,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: PLAN_ENTERPRISE_ID,
      name: 'Enterprise',
      description: 'Paket lengkap untuk bisnis besar & franchise',
      price: 2500000,
      billingInterval: 'monthly',
      currency: 'IDR',
      trialDays: 30,
      features: {
        pos: true, inventory: true, kitchen: true, tables: true,
        reservations: true, finance: true, reports: true, admin: true,
        api: true, custom_branding: true,
      },
      sortOrder: 3,
      maxUsers: 200,
      maxBranches: 50,
      maxProducts: 10000,
      maxTransactions: 100000,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  console.log('   ✅ 3 plans di-seed (Starter / Professional / Enterprise).');
}

async function ensureTenant() {
  let tenant = await db.Tenant.findByPk(TENANT_ID_FIXED);
  if (tenant) {
    console.log(`   ℹ️  Tenant sudah ada: ${tenant.businessName}`);
    // Pastikan statusnya benar
    await tenant.update({
      status: 'active',
      isHq: true,
      setupCompleted: true,
      kybStatus: 'verified',
      businessStructure: 'single',
      subscriptionPlan: 'Enterprise',
    });
    return tenant;
  }

  tenant = await db.Tenant.create({
    id: TENANT_ID_FIXED,
    businessName: 'Bedagang HQ (Local Dev)',
    businessCode: 'BDG-LOCAL',
    businessEmail: 'admin@bedagang.local',
    businessPhone: '+628000000000',
    businessAddress: 'Jakarta, Indonesia',
    setupCompleted: true,
    onboardingStep: 99,
    kybStatus: 'verified',
    businessStructure: 'single',
    isHq: true,
    activatedAt: new Date(),
    name: 'Bedagang HQ',
    code: 'BDG-HQ-LOCAL',
    status: 'active',
    subscriptionPlan: 'Enterprise',
    subscriptionStart: new Date(),
    subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    maxUsers: 200,
    maxBranches: 50,
    contactName: 'Local Admin',
    contactEmail: 'admin@bedagang.local',
    city: 'Jakarta',
    province: 'DKI Jakarta',
    isActive: true,
  });
  console.log(`   ✅ Tenant dibuat: ${tenant.id} (${tenant.businessName})`);
  return tenant;
}

async function linkSuperAdmin(tenantId) {
  // Pakai raw SQL untuk menghindari drift kolom (role_id) di model User
  const [rows] = await db.sequelize.query(
    `SELECT id, email, tenant_id FROM users WHERE email = :email LIMIT 1`,
    { replacements: { email: SUPERADMIN_EMAIL } }
  );
  const user = rows?.[0];
  if (!user) {
    console.log(`   ⚠️  User ${SUPERADMIN_EMAIL} tidak ditemukan. Jalankan seeder master account dulu.`);
    return null;
  }
  if (user.tenant_id === tenantId) {
    console.log(`   ℹ️  User ${SUPERADMIN_EMAIL} sudah terhubung ke tenant lokal.`);
    return user;
  }
  await db.sequelize.query(
    `UPDATE users SET tenant_id = :tenantId, "updatedAt" = NOW() WHERE email = :email`,
    { replacements: { tenantId, email: SUPERADMIN_EMAIL } }
  );
  console.log(`   ✅ User ${SUPERADMIN_EMAIL} dihubungkan ke tenant ${tenantId}.`);
  return user;
}

async function ensureSubscription(tenantId) {
  let sub = await db.Subscription.findOne({ where: { tenantId } });
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  if (sub) {
    await sub.update({
      status: 'active',
      planId: PLAN_ENTERPRISE_ID,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    });
    console.log('   ℹ️  Subscription sudah ada, diperbarui jadi active (Enterprise).');
    return sub;
  }

  sub = await db.Subscription.create({
    tenantId,
    planId: PLAN_ENTERPRISE_ID,
    status: 'active',
    startedAt: now,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
  });
  console.log(`   ✅ Subscription aktif dibuat (${sub.id}).`);
  return sub;
}

async function ensureDemoInvoice(tenantId, subscriptionId) {
  const existing = await db.Invoice.count({ where: { tenantId } });
  if (existing > 0) {
    console.log(`   ℹ️  Invoice sudah ada (${existing}), skip.`);
    return;
  }
  const now = new Date();
  const issued = new Date(now.getFullYear(), now.getMonth(), 1);
  const due = new Date(now.getFullYear(), now.getMonth(), 15);
  const paid = new Date(now.getFullYear(), now.getMonth(), 5);
  const invoiceNumber = `INV-${issued.getFullYear()}${String(issued.getMonth() + 1).padStart(2, '0')}-LOCAL-001`;

  await db.Invoice.create({
    tenantId,
    subscriptionId,
    invoiceNumber,
    status: 'paid',
    issuedDate: issued,
    dueDate: due,
    paidDate: paid,
    subtotal: 2500000,
    taxAmount: 275000,
    discountAmount: 0,
    totalAmount: 2775000,
    currency: 'IDR',
    customerName: 'Bedagang HQ (Local Dev)',
    customerEmail: 'admin@bedagang.local',
  });
  console.log(`   ✅ Demo invoice dibuat (${invoiceNumber}).`);
}

async function ensureCoreModules(tenantId) {
  // Include both lower- and upper-case code styles used across seeders.
  const coreCodes = [
    'pos', 'inventory', 'finance', 'reports', 'customers', 'products',
    'CORE_DASHBOARD', 'CORE_POS', 'CORE_INVENTORY', 'CORE_CUSTOMERS',
    'CORE_FINANCE', 'CORE_REPORTS', 'POS_CORE', 'INVENTORY_CORE',
  ];
  const modules = await db.Module.findAll({
    where: { code: coreCodes, isActive: true },
  });
  if (!modules.length) {
    console.log('   ⚠️  Belum ada module di tabel modules, skip enable TenantModule.');
    return;
  }
  let enabledCount = 0;
  for (const mod of modules) {
    const [tm, created] = await db.TenantModule.findOrCreate({
      where: { tenantId, moduleId: mod.id },
      defaults: {
        isEnabled: true,
        enabledAt: new Date(),
        configuredAt: new Date(),
      },
    });
    if (!created && !tm.isEnabled) {
      await tm.update({ isEnabled: true, enabledAt: new Date() });
    }
    enabledCount += 1;
  }
  console.log(`   ✅ ${enabledCount} module core diaktifkan untuk tenant.`);
}

async function main() {
  console.log('\n🚀 Setup Local Tenant untuk Bedagang ERP\n');
  try {
    console.log('1. Pastikan tabel billing ada');
    await ensureBillingTables();

    console.log('\n2. Seed plans');
    await ensurePlans();

    console.log('\n3. Buat/pastikan tenant lokal');
    const tenant = await ensureTenant();

    console.log('\n4. Hubungkan user super admin');
    await linkSuperAdmin(tenant.id);

    console.log('\n5. Pastikan subscription aktif');
    const sub = await ensureSubscription(tenant.id);

    console.log('\n6. Buat invoice demo');
    await ensureDemoInvoice(tenant.id, sub.id);

    console.log('\n7. Enable core modules');
    await ensureCoreModules(tenant.id);

    console.log('\n✨ Selesai. Ringkasan:');
    console.log('   Tenant ID       :', tenant.id);
    console.log('   Business Name   :', tenant.businessName);
    console.log('   Login email     :', SUPERADMIN_EMAIL);
    console.log('   Password default:', 'MasterAdmin2026!');
    console.log('\n➡️  Logout lalu login ulang supaya JWT berisi tenantId baru,');
    console.log('    kemudian buka http://localhost:3001/hq/billing-info dan /hq/settings/modules\n');
  } catch (err) {
    console.error('\n❌ Gagal setup:', err.message);
    console.error(err);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}

main();
