/**
 * Local DB setup — sync Sequelize models + seed admin user.
 * Bencana-proof: catches ALL sync errors, just logs and continues.
 * Usage: node scripts/setup-local-db.js
 */
require('dotenv').config();
const path = require('path');

async function main() {
  const db = require(path.resolve(__dirname, '..', 'models'));
  
  await db.sequelize.authenticate();
  console.log('✅ Database connected');

  // Override query to catch ALL errors — many models have FK/index issues
  const originalQuery = db.sequelize.query.bind(db.sequelize);
  db.sequelize.query = function (sql, opts) {
    return originalQuery(sql, opts).catch(err => {
      const msg = err?.message || '';
      console.log(`  ⚠️ ${msg.substring(0, 120)}`);
      return [undefined, {}];
    });
  };

  // Override sync on each model to be error-tolerant
  await db.sequelize.sync({ alter: false, force: false });
  console.log('✅ Model sync completed (with warnings)');

  // Restore query
  db.sequelize.query = originalQuery;

  // Count actual tables
  const [tables] = await db.sequelize.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name"
  );
  const tableNames = tables.map(t => t.table_name).filter(n => n);
  console.log(`📊 Tables: ${tableNames.length}`);
  const essential = ['users', 'Tenants', 'branches'];
  const missingEssential = essential.filter(e => !tableNames.includes(e));
  if (missingEssential.length > 0) {
    console.log(`❌ Missing essential tables: ${missingEssential.join(', ')}`);
    // Create them manually
    if (missingEssential.includes('users')) {
      await db.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "users" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255),
          email VARCHAR(255) UNIQUE,
          password VARCHAR(255),
          role VARCHAR(50) DEFAULT 'staff',
          "tenant_id" UUID,
          "createdAt" TIMESTAMPTZ DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ DEFAULT NOW()
        );
      `);
    }
    if (missingEssential.includes('Tenants')) {
      await db.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "Tenants" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255),
          code VARCHAR(50),
          status VARCHAR(50) DEFAULT 'active',
          "subscriptionPlan" VARCHAR(100) DEFAULT 'enterprise',
          "setupCompleted" BOOLEAN DEFAULT true,
          "onboardingStep" INTEGER DEFAULT 99,
          "isActive" BOOLEAN DEFAULT true,
          "businessType" VARCHAR(100),
          "createdAt" TIMESTAMPTZ DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ DEFAULT NOW()
        );
      `);
    }
    if (missingEssential.includes('branches')) {
      await db.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "branches" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255),
          code VARCHAR(50),
          "tenant_id" UUID,
          "is_active" BOOLEAN DEFAULT true,
          "createdAt" TIMESTAMPTZ DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ DEFAULT NOW()
        );
      `);
    }
    console.log(`✅ Created missing essential tables`);
  }

  // Create admin tenant if not exists
  const [tenants] = await db.sequelize.query(
    `SELECT id FROM "Tenants" WHERE code = 'DEFAULT' LIMIT 1`
  );

  let tenantId;
  if (!tenants || tenants.length === 0) {
    const result = await db.sequelize.query(
      `INSERT INTO "Tenants" (id, name, code, status, "subscriptionPlan", "setupCompleted", "onboardingStep", "isActive", "businessType", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), 'Default', 'DEFAULT', 'active', 'enterprise', true, 99, true, 'retail', NOW(), NOW())
       RETURNING id`
    );
    tenantId = result[0]?.[0]?.id;
    if (tenantId) console.log('✅ Tenant DEFAULT created');
  } else {
    tenantId = tenants[0].id;
    console.log('✅ Tenant DEFAULT exists');
  }

  // Create superadmin user
  const [adminUsers] = await db.sequelize.query(
    `SELECT id FROM "users" WHERE email = 'superadmin@bedagang.com' LIMIT 1`
  );

  if (!adminUsers || adminUsers.length === 0) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('MasterAdmin2026!', 10);
    await db.sequelize.query(
      `INSERT INTO "users" (id, email, password, role, name, "tenant_id", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), 'superadmin@bedagang.com', $1, 'super_admin', 'Super Admin', $2, NOW(), NOW())`,
      { bind: [hash, tenantId] }
    );
    console.log('✅ superadmin@bedagang.com / MasterAdmin2026! created');
  } else {
    console.log('✅ superadmin@bedagang.com already exists');
  }

  // Create demo user
  const [demoUsers] = await db.sequelize.query(
    `SELECT id FROM "users" WHERE email = 'demo@bedagang.com' LIMIT 1`
  );

  if (!demoUsers || demoUsers.length === 0) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('demo123', 10);
    await db.sequelize.query(
      `INSERT INTO "users" (id, email, password, role, name, "tenant_id", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), 'demo@bedagang.com', $1, 'owner', 'Demo User', $2, NOW(), NOW())`,
      { bind: [hash, tenantId] }
    );
    console.log('✅ demo@bedagang.com / demo123 created');
  } else {
    console.log('✅ demo@bedagang.com exists');
  }

  await db.sequelize.close();
  console.log('\n🎉 Local DB setup complete!');
  console.log('Login: http://localhost:3010/auth/login');
  console.log('Email: superadmin@bedagang.com');
  console.log('Password: MasterAdmin2026!');
}

main().catch(e => {
  console.error('❌ Setup failed:', e.message);
  process.exit(1);
});
