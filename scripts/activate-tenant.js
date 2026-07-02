/**
 * Activate tenant: set status=active, kyb_status=active, subscription_plan=enterprise,
 * assign business type, and enable ALL modules.
 */
require('dotenv').config({ path: '.env.development' });
const sequelize = require('../lib/sequelize');

const TENANT_ID = '2ee8eb7f-22d5-4e51-9910-3e8f7328497d'; // F&B Business (winsitoruser)

async function activate() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   ACTIVATE TENANT — Full Module Access   ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // 1. Get a business type to assign
  const [btRows] = await sequelize.query(`SELECT id, code, name FROM business_types WHERE is_active = true ORDER BY code LIMIT 5`);
  console.log('Available business types:', btRows.map(b => `${b.code} (${b.name})`).join(', '));
  const businessTypeId = btRows.length > 0 ? btRows[0].id : null;
  console.log(`Using business type: ${btRows[0]?.code || 'none'}\n`);

  // 2. Update tenant status
  const [, updateMeta] = await sequelize.query(`
    UPDATE tenants SET 
      status = 'active',
      kyb_status = 'active',
      is_active = true,
      subscription_plan = 'enterprise',
      business_type_id = COALESCE(business_type_id, :btId),
      activated_at = COALESCE(activated_at, NOW()),
      updated_at = NOW()
    WHERE id = :tenantId
  `, { replacements: { tenantId: TENANT_ID, btId: businessTypeId } });
  console.log('✓ Tenant status updated to ACTIVE');

  // 3. Verify tenant
  const [tenant] = await sequelize.query(`
    SELECT t.id, t.name, t.status, t.kyb_status, t.is_active, t.subscription_plan, 
           bt.code as bt_code, bt.name as bt_name
    FROM tenants t 
    LEFT JOIN business_types bt ON bt.id = t.business_type_id
    WHERE t.id = :tenantId
  `, { replacements: { tenantId: TENANT_ID } });
  console.log('  Tenant:', JSON.stringify(tenant[0], null, 2));

  // 4. Get all active modules
  const [modules] = await sequelize.query(`SELECT id, code, name FROM modules WHERE is_active = true ORDER BY sort_order, code`);
  console.log(`\n✓ Found ${modules.length} active modules`);

  // 5. Enable all modules for this tenant
  let inserted = 0;
  let skipped = 0;
  for (const mod of modules) {
    try {
      // Check if already exists
      const [existing] = await sequelize.query(
        `SELECT id, is_enabled FROM tenant_modules WHERE tenant_id = :tenantId AND module_id = :moduleId`,
        { replacements: { tenantId: TENANT_ID, moduleId: mod.id } }
      );

      if (existing.length > 0) {
        // Update to enabled if not already
        if (!existing[0].is_enabled) {
          await sequelize.query(
            `UPDATE tenant_modules SET is_enabled = true, enabled_at = NOW() WHERE id = :id`,
            { replacements: { id: existing[0].id } }
          ).catch(() => {
            // is_enabled column might not exist, try without it
            sequelize.query(`UPDATE tenant_modules SET enabled_at = NOW() WHERE id = :id`, { replacements: { id: existing[0].id } });
          });
        }
        skipped++;
      } else {
        // Insert new tenant_module
        try {
          await sequelize.query(`
            INSERT INTO tenant_modules (id, tenant_id, module_id, is_enabled, enabled_at, created_at)
            VALUES (gen_random_uuid(), :tenantId, :moduleId, true, NOW(), NOW())
          `, { replacements: { tenantId: TENANT_ID, moduleId: mod.id } });
        } catch {
          // Try without is_enabled if column doesn't exist
          await sequelize.query(`
            INSERT INTO tenant_modules (id, tenant_id, module_id, enabled_at, created_at)
            VALUES (gen_random_uuid(), :tenantId, :moduleId, NOW(), NOW())
          `, { replacements: { tenantId: TENANT_ID, moduleId: mod.id } });
        }
        inserted++;
      }
    } catch (e) {
      console.warn(`  ⚠ Error for module ${mod.code}:`, e.message);
    }
  }
  console.log(`  → ${inserted} modules newly enabled, ${skipped} already existed`);

  // 6. Final verification
  const [tmCount] = await sequelize.query(
    `SELECT COUNT(*)::int as c FROM tenant_modules WHERE tenant_id = :tenantId`,
    { replacements: { tenantId: TENANT_ID } }
  );
  console.log(`\n✓ Total tenant_modules for this tenant: ${tmCount[0].c}`);

  // 7. Show final status
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║           ACTIVATION COMPLETE            ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║ Tenant:    ${tenant[0].name.padEnd(29)}║`);
  console.log(`║ Status:    ${'active'.padEnd(29)}║`);
  console.log(`║ KYB:       ${'active'.padEnd(29)}║`);
  console.log(`║ Plan:      ${'enterprise'.padEnd(29)}║`);
  console.log(`║ Modules:   ${String(modules.length).padEnd(29)}║`);
  console.log('╚══════════════════════════════════════════╝');

  await sequelize.close();
}

activate().catch(e => {
  console.error('FAILED:', e.message);
  sequelize.close();
  process.exit(1);
});
