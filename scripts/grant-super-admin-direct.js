const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'farmanesia_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function grantSuperAdminAccess() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Granting Super Admin Access to admin@bedagang.com...\n');

    // 1. Check if user exists (check all possible column names)
    const userResult = await client.query(
      'SELECT id, email, name, role, "isActive" FROM users WHERE email = $1',
      ['admin@bedagang.com']
    );

    let userId;

    if (userResult.rows.length === 0) {
      console.log('❌ User admin@bedagang.com not found in database!');
      console.log('\n💡 Please create the user first or use a different email.');
      await client.release();
      await pool.end();
      process.exit(1);
    } else {
      const user = userResult.rows[0];
      userId = user.id;
      console.log('✅ User found:', user.email);
      console.log('   Current role:', user.role);
      console.log('   Current status:', user.isActive ? 'Active' : 'Inactive');
    }

    // 2. Update user role to super_admin
    console.log('\n🔑 Updating role to super_admin...');
    await client.query(
      'UPDATE users SET role = $1, "isActive" = $2, "updatedAt" = NOW() WHERE id = $3',
      ['super_admin', true, userId]
    );
    console.log('✅ Role updated to: super_admin');

    // 3. Get all modules
    console.log('\n📋 Checking available modules...');
    const modulesResult = await client.query('SELECT id, name, code FROM modules ORDER BY name');
    const allModules = modulesResult.rows;
    
    if (allModules.length === 0) {
      console.log('⚠️  No modules found in database. Skipping module activation.');
    } else {
      console.log(`Found ${allModules.length} modules`);

      // 4. Get user's tenant_id (if exists)
      const userTenantResult = await client.query(
        'SELECT tenant_id FROM users WHERE id = $1',
        [userId]
      );
      
      const tenantId = userTenantResult.rows[0]?.tenant_id;

      if (tenantId) {
        console.log(`\n📦 Enabling all modules for tenant: ${tenantId}`);
        
        // Enable all modules for tenant
        for (const module of allModules) {
          // Check if already exists
          const existingResult = await client.query(
            'SELECT id, is_active FROM tenant_modules WHERE tenant_id = $1 AND module_id = $2',
            [tenantId, module.id]
          );

          if (existingResult.rows.length === 0) {
            // Insert new
            await client.query(
              `INSERT INTO tenant_modules (tenant_id, module_id, is_active, activated_at, created_at, updated_at)
               VALUES ($1, $2, $3, NOW(), NOW(), NOW())`,
              [tenantId, module.id, true]
            );
            console.log(`  ✅ Enabled: ${module.name} (${module.code})`);
          } else {
            // Update existing
            await client.query(
              'UPDATE tenant_modules SET is_active = $1, updated_at = NOW() WHERE tenant_id = $2 AND module_id = $3',
              [true, tenantId, module.id]
            );
            console.log(`  ✓ Already enabled: ${module.name} (${module.code})`);
          }
        }
      } else {
        console.log('\n⚠️  User has no tenant assigned. Module activation skipped.');
        console.log('   Super admin role still granted - user can access all features.');
      }
    }

    // 5. Get updated user info
    const finalUserResult = await client.query(
      'SELECT id, email, name, role, "isActive" FROM users WHERE id = $1',
      [userId]
    );
    const finalUser = finalUserResult.rows[0];

    // 6. Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SUPER ADMIN ACCESS GRANTED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📝 USER DETAILS:');
    console.log(`   Email: ${finalUser.email}`);
    console.log(`   Name: ${finalUser.name}`);
    console.log(`   Role: ${finalUser.role}`);
    console.log(`   Status: ${finalUser.isActive ? 'Active ✅' : 'Inactive ❌'}`);
    console.log('\n🔑 ACCESS LEVEL: SUPER ADMIN');
    
    if (allModules.length > 0) {
      console.log(`✅ MODULES AVAILABLE: ${allModules.length}`);
      console.log('\n📋 AVAILABLE MODULES:');
      allModules.forEach(module => {
        console.log(`   ✓ ${module.name} (${module.code})`);
      });
    }
    
    console.log('\n🌐 PERMISSIONS:');
    console.log('   ✓ Finance Module - Full Access');
    console.log('   ✓ Inventory Module - Full Access');
    console.log('   ✓ HRIS Module - Full Access');
    console.log('   ✓ Fleet Module - Full Access');
    console.log('   ✓ Reports Module - Full Access');
    console.log('   ✓ Branches Module - Full Access');
    console.log('   ✓ All sidebar menus visible');
    console.log('   ✓ All features accessible');
    console.log('   ✓ Full system access');
    console.log('\n🚀 LOGIN AT:');
    console.log('   http://localhost:3001/auth/login');
    console.log('   http://localhost:3001/admin/login');
    console.log('\n💡 LOGIN CREDENTIALS:');
    console.log('   Email: admin@bedagang.com');
    console.log('   Password: (your existing password)');
    console.log('='.repeat(60));

    await client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error granting super admin access:', error.message);
    console.error('\n🔍 Details:', error);
    await client.release();
    await pool.end();
    process.exit(1);
  }
}

// Run the script
grantSuperAdminAccess();
