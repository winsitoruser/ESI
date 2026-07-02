const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(
  config.development.database,
  config.development.username,
  config.development.password,
  {
    host: config.development.host,
    dialect: config.development.dialect,
    logging: false
  }
);

async function debugModuleActivation() {
  console.log('\n🔍 DEEP DEBUG: MODULE ACTIVATION SYSTEM\n');
  console.log('='.repeat(60));
  
  try {
    // 1. Check Tenants
    console.log('\n1️⃣ CHECKING TENANTS');
    const tenants = await sequelize.query(
      'SELECT id, name, is_active FROM tenants ORDER BY created_at DESC LIMIT 5',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    if (tenants.length === 0) {
      console.log('   ❌ NO TENANTS FOUND!');
      console.log('   → You need to create a tenant first');
      console.log('   → Run: INSERT INTO tenants (id, name, is_active) VALUES (uuid_generate_v4(), \'Test Tenant\', true)');
    } else {
      console.log(`   ✅ Found ${tenants.length} tenant(s)`);
      tenants.forEach(t => {
        console.log(`      - ${t.name} (ID: ${t.id}) Active: ${t.is_active}`);
      });
    }
    
    // 2. Check Users
    console.log('\n2️⃣ CHECKING USERS WITH TENANT');
    const users = await sequelize.query(
      `SELECT id, email, tenant_id, role 
       FROM users 
       WHERE tenant_id IS NOT NULL 
       ORDER BY "createdAt" DESC LIMIT 5`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    if (users.length === 0) {
      console.log('   ⚠️  NO USERS WITH TENANT FOUND!');
      console.log('   → Users need tenant_id to manage modules');
      console.log('   → Update user: UPDATE users SET tenant_id = \'<tenant-id>\' WHERE email = \'your@email.com\'');
    } else {
      console.log(`   ✅ Found ${users.length} user(s) with tenant`);
      users.forEach(u => {
        console.log(`      - ${u.email} | Tenant: ${u.tenant_id} | Role: ${u.role}`);
      });
    }
    
    // 3. Check Modules
    console.log('\n3️⃣ CHECKING MODULES');
    const modules = await sequelize.query(
      'SELECT id, code, name, is_core, is_active FROM modules WHERE is_active = true LIMIT 10',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    console.log(`   ✅ Found ${modules.length} active module(s)`);
    modules.slice(0, 5).forEach(m => {
      console.log(`      - ${m.code}: ${m.name} (Core: ${m.is_core})`);
    });
    
    // 4. Check TenantModules
    console.log('\n4️⃣ CHECKING TENANT_MODULES TABLE');
    const tmCount = await sequelize.query(
      'SELECT COUNT(*) as count FROM tenant_modules',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    console.log(`   Current records: ${tmCount[0].count}`);
    
    if (tmCount[0].count > 0) {
      const tmSample = await sequelize.query(
        `SELECT tm.*, m.code as module_code, m.name as module_name
         FROM tenant_modules tm
         JOIN modules m ON tm.module_id = m.id
         LIMIT 5`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      console.log('   Sample records:');
      tmSample.forEach(tm => {
        console.log(`      - ${tm.module_code}: Enabled=${tm.is_enabled} (Tenant: ${tm.tenant_id})`);
      });
    }
    
    // 5. Test Module Activation
    console.log('\n5️⃣ TESTING MODULE ACTIVATION');
    
    if (tenants.length > 0 && modules.length > 0) {
      const testTenant = tenants[0];
      const testModule = modules.find(m => !m.is_core) || modules[0];
      
      console.log(`   Test Tenant: ${testTenant.name} (${testTenant.id})`);
      console.log(`   Test Module: ${testModule.code} (${testModule.id})`);
      
      try {
        // Try to insert/update
        await sequelize.query(
          `INSERT INTO tenant_modules 
           (id, tenant_id, module_id, is_enabled, enabled_at, created_at, updated_at)
           VALUES (gen_random_uuid(), :tenantId, :moduleId, true, NOW(), NOW(), NOW())
           ON CONFLICT (tenant_id, module_id) 
           DO UPDATE SET is_enabled = true, enabled_at = NOW(), updated_at = NOW()`,
          {
            replacements: {
              tenantId: testTenant.id,
              moduleId: testModule.id
            },
            type: Sequelize.QueryTypes.INSERT
          }
        );
        
        console.log('   ✅ Module activation TEST PASSED!');
        console.log('   → Database operations working correctly');
      } catch (err) {
        console.log('   ❌ Module activation TEST FAILED!');
        console.log('   → Error:', err.message);
      }
    } else {
      console.log('   ⚠️  Cannot test - missing tenants or modules');
    }
    
    // 6. Check API Requirements
    console.log('\n6️⃣ API REQUIREMENTS CHECK');
    console.log('   For /api/hq/modules to work, you need:');
    console.log('   ✓ Valid NextAuth session');
    console.log('   ✓ User with role: super_admin, owner, or hq_admin');
    console.log('   ✓ User must have tenant_id set');
    console.log('   ✓ Tenant must exist in database');
    console.log('   ✓ tenant_modules table must exist (✅ Created)');
    
    // 7. Common Issues
    console.log('\n7️⃣ COMMON ISSUES & SOLUTIONS');
    console.log('   Issue: "Gagal mengubah status modul"');
    console.log('   Possible causes:');
    console.log('   1. User not logged in → Check NextAuth session');
    console.log('   2. User has no tenant_id → Update user record');
    console.log('   3. Tenant doesn\'t exist → Create tenant');
    console.log('   4. Wrong role → User needs admin role');
    console.log('   5. Module ID invalid → Check module exists');
    
    // 8. Quick Fixes
    console.log('\n8️⃣ QUICK FIXES');
    
    if (tenants.length === 0) {
      console.log('\n   Create a tenant:');
      console.log('   ```sql');
      console.log('   INSERT INTO tenants (id, name, is_active, created_at, updated_at)');
      console.log('   VALUES (uuid_generate_v4(), \'My Company\', true, NOW(), NOW());');
      console.log('   ```');
    }
    
    if (users.length === 0 && tenants.length > 0) {
      console.log('\n   Link user to tenant:');
      console.log('   ```sql');
      console.log(`   UPDATE users SET tenant_id = '${tenants[0].id}'`);
      console.log('   WHERE email = \'your@email.com\';');
      console.log('   ```');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ DEBUG COMPLETE\n');
    
  } catch (error) {
    console.error('\n❌ DEBUG ERROR:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

debugModuleActivation()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
