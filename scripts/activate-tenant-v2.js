/**
 * Activate tenant v2: handles missing is_enabled column
 */
require('dotenv').config({ path: '.env.development' });
const sequelize = require('../lib/sequelize');

const TENANT_ID = '2ee8eb7f-22d5-4e51-9910-3e8f7328497d';

async function activate() {
  console.log('\n=== STEP 1: Check tenant_modules table structure ===');
  const [cols] = await sequelize.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tenant_modules' ORDER BY ordinal_position`
  );
  console.log('Columns:', cols.map(c => c.column_name).join(', '));
  const hasIsEnabled = cols.some(c => c.column_name === 'is_enabled');
  console.log('has is_enabled:', hasIsEnabled);

  // Add is_enabled column if missing
  if (!hasIsEnabled) {
    console.log('\n=== STEP 2: Adding is_enabled column ===');
    await sequelize.query(`ALTER TABLE tenant_modules ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true`);
    console.log('Done.');
  }

  // Also check for enabled_at
  const hasEnabledAt = cols.some(c => c.column_name === 'enabled_at');
  if (!hasEnabledAt) {
    await sequelize.query(`ALTER TABLE tenant_modules ADD COLUMN IF NOT EXISTS enabled_at TIMESTAMP WITH TIME ZONE`);
    console.log('Added enabled_at column.');
  }

  // Check for updated_at
  const hasUpdatedAt = cols.some(c => c.column_name === 'updated_at');
  if (!hasUpdatedAt) {
    await sequelize.query(`ALTER TABLE tenant_modules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);
    console.log('Added updated_at column.');
  }

  console.log('\n=== STEP 3: Get all active modules ===');
  const [modules] = await sequelize.query(`SELECT id, code, name FROM modules WHERE is_active = true ORDER BY sort_order, code`);
  console.log(`Found ${modules.length} active modules`);

  console.log('\n=== STEP 4: Enable all modules for tenant ===');
  let inserted = 0, updated = 0;
  for (const mod of modules) {
    const [existing] = await sequelize.query(
      `SELECT id FROM tenant_modules WHERE tenant_id = :tenantId AND module_id = :moduleId`,
      { replacements: { tenantId: TENANT_ID, moduleId: mod.id } }
    );

    if (existing.length > 0) {
      await sequelize.query(
        `UPDATE tenant_modules SET is_enabled = true, enabled_at = NOW() WHERE id = :id`,
        { replacements: { id: existing[0].id } }
      );
      updated++;
    } else {
      await sequelize.query(`
        INSERT INTO tenant_modules (tenant_id, module_id, is_enabled, enabled_at, created_at, updated_at)
        VALUES (:tenantId, :moduleId, true, NOW(), NOW(), NOW())
      `, { replacements: { tenantId: TENANT_ID, moduleId: mod.id } });
      inserted++;
    }
    process.stdout.write('.');
  }
  console.log(`\n  Inserted: ${inserted}, Updated: ${updated}`);

  console.log('\n=== STEP 5: Verify ===');
  const [count] = await sequelize.query(
    `SELECT COUNT(*)::int as c FROM tenant_modules WHERE tenant_id = :tenantId`,
    { replacements: { tenantId: TENANT_ID } }
  );
  console.log(`Total tenant_modules: ${count[0].c}`);

  const [tenant] = await sequelize.query(
    `SELECT name, status, kyb_status, is_active, subscription_plan FROM tenants WHERE id = :id`,
    { replacements: { id: TENANT_ID } }
  );
  console.log('Tenant:', JSON.stringify(tenant[0]));

  console.log('\n=== DONE ===');
  await sequelize.close();
}

activate().catch(e => {
  console.error('FAILED:', e);
  sequelize.close();
  process.exit(1);
});
