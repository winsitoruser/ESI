/**
 * Quick DB setup for fresh production/staging deployment.
 * Creates essential tables via Sequelize sync + seeds admin user.
 *
 * Usage: node scripts/db-setup.js
 */
const path = require('path');
const fs = require('fs');

// Load env
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { Sequelize } = require('sequelize');

async function main() {
  const sq = new Sequelize(
    process.env.DB_NAME || 'bedagang_staging',
    process.env.DB_USER || 'bedagang',
    process.env.DB_PASSWORD || 'bedagang_staging_2026',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      dialect: 'postgres',
      logging: console.log,
    }
  );

  try {
    await sq.authenticate();
    console.log('✅ Database connected');
  } catch (e) {
    console.error('❌ Database connection failed:', e.message);
    process.exit(1);
  }

  // Load and sync all models from the models directory
  const modelsDir = path.resolve(__dirname, '..', 'models');
  if (fs.existsSync(modelsDir)) {
    const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js') && !f.startsWith('index'));
    
    for (const file of modelFiles) {
      try {
        const modelPath = path.join(modelsDir, file);
        const modelFn = require(modelPath);
        if (typeof modelFn === 'function') {
          const model = modelFn(sq, Sequelize.DataTypes);
          console.log(`  Loaded model: ${model.name || file}`);
        }
      } catch (e) {
        console.log(`  Skipped ${file}: ${e.message}`);
      }
    }
  }

  // Sync all models (create tables if not exist)
  await sq.sync({ alter: false, force: false });
  console.log('✅ All tables synced');

  // Create admin tenant if not exists
  const [tenants] = await sq.query(
    `SELECT id FROM "Tenants" WHERE code = 'PRODUCTION' LIMIT 1`
  );
  
  let tenantId;
  if (tenants.length === 0) {
    const result = await sq.query(
      `INSERT INTO "Tenants" (id, name, code, status, "subscriptionPlan", "setupCompleted", "onboardingStep", "isActive", "businessType", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), 'Production', 'PRODUCTION', 'active', 'enterprise', true, 99, true, 'retail', NOW(), NOW())
       RETURNING id`
    );
    tenantId = result[0][0].id;
    console.log('✅ Tenant PRODUCTION created');
  } else {
    tenantId = tenants[0].id;
    console.log('✅ Tenant PRODUCTION exists');
  }

  // Create superadmin user
  const [users] = await sq.query(
    `SELECT id FROM "Users" WHERE email = 'superadmin@bedagang.com' LIMIT 1`
  );

  if (users.length === 0) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('superadmin123', 10);
    await sq.query(
      `INSERT INTO "Users" (id, email, password, role, name, "tenantId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), 'superadmin@bedagang.com', $1, 'super_admin', 'Super Admin', $2, NOW(), NOW())`,
      { bind: [hash, tenantId] }
    );
    console.log('✅ superadmin@bedagang.com created');
  } else {
    console.log('✅ superadmin@bedagang.com exists');
  }

  // Create demo owner user
  const [demoUsers] = await sq.query(
    `SELECT id FROM "Users" WHERE email = 'demo@bedagang.com' LIMIT 1`
  );

  if (demoUsers.length === 0) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('demo123', 10);
    await sq.query(
      `INSERT INTO "Users" (id, email, password, role, name, "tenantId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), 'demo@bedagang.com', $1, 'owner', 'Demo User', $2, NOW(), NOW())`,
      { bind: [hash, tenantId] }
    );
    console.log('✅ demo@bedagang.com created');
  } else {
    console.log('✅ demo@bedagang.com exists');
  }

  await sq.close();
  console.log('\n🎉 Database setup complete!');
}

main().catch(e => {
  console.error('❌ Setup failed:', e);
  process.exit(1);
});
