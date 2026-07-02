const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

async function main() {
  await sequelize.authenticate();
  console.log('DB connected');

  // Load Tenant model properly
  const Tenant = require('../models/Tenant')(sequelize);

  // Check superadmin tenant
  const [saRaw] = await sequelize.query(
    `SELECT id, email, tenant_id FROM users WHERE email = 'superadmin@bedagang.com'`
  );
  console.log('Superadmin:', JSON.stringify(saRaw[0]));

  if (saRaw[0]?.tenant_id) {
    // Ensure superadmin tenant is setup_completed
    await Tenant.update(
      { setupCompleted: true, onboardingStep: 99 },
      { where: { id: saRaw[0].tenant_id } }
    );
    console.log('SA tenant updated');
  }

  // Fix demo user
  const [demoRaw] = await sequelize.query(
    `SELECT id, email, tenant_id FROM users WHERE email = 'demo@bedagang.com'`
  );
  console.log('Demo:', JSON.stringify(demoRaw[0]));

  if (!demoRaw[0]?.tenant_id) {
    const tenant = await Tenant.create({
      name: 'Demo Store',
      code: 'DEMO-STORE',
      status: 'active',
      subscriptionPlan: 'starter',
      setupCompleted: true,
      onboardingStep: 99,
      isActive: true,
      businessType: 'retail'
    });
    console.log('Created tenant:', tenant.id);

    await sequelize.query(
      `UPDATE users SET tenant_id = '${tenant.id}' WHERE email = 'demo@bedagang.com'`
    );
    console.log('Demo user assigned to tenant');
  } else {
    await Tenant.update(
      { setupCompleted: true, onboardingStep: 99 },
      { where: { id: demoRaw[0].tenant_id } }
    );
    console.log('Demo tenant updated');
  }

  // Verify
  const [rows] = await sequelize.query(`
    SELECT u.id, u.email, u.role, t.name as tenant_name, t.setup_completed
    FROM users u
    LEFT JOIN tenants t ON u.tenant_id = t.id
    WHERE u.email IN ('demo@bedagang.com', 'superadmin@bedagang.com')
    ORDER BY u.id
  `);
  console.log('Result:', JSON.stringify(rows, null, 2));
  await sequelize.close();
}

main().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
