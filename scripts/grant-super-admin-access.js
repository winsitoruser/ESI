const bcrypt = require('bcryptjs');
const db = require('../models');

async function grantSuperAdminAccess() {
  try {
    console.log('🚀 Granting Super Admin Access to admin@bedagang.com...\n');

    // 1. Find the user
    let user = await db.User.findOne({
      where: { email: 'admin@bedagang.com' }
    });

    if (!user) {
      console.log('❌ User admin@bedagang.com not found!');
      console.log('Creating new user...\n');
      
      // Get or create tenant
      let tenant = await db.Tenant.findOne();
      if (!tenant) {
        const businessType = await db.BusinessType.findOne();
        tenant = await db.Tenant.create({
          business_type_id: businessType.id,
          business_name: 'Bedagang Admin',
          business_address: 'Admin Office',
          business_phone: '08123456789',
          business_email: 'admin@bedagang.com',
          setup_completed: true,
          onboarding_step: 'completed'
        });
      }

      const hashedPassword = await bcrypt.hash('admin123', 10);
      user = await db.User.create({
        name: 'Super Admin',
        email: 'admin@bedagang.com',
        password: hashedPassword,
        tenant_id: tenant.id,
        role: 'super_admin',
        isActive: true,
        phone: '08123456789',
        businessName: tenant.business_name
      });
      console.log('✅ User created');
    } else {
      console.log('✅ User found:', user.email);
    }

    // 2. Update user role to super_admin
    console.log('\n🔑 Updating role to super_admin...');
    await user.update({
      role: 'super_admin',
      isActive: true
    });
    console.log('✅ Role updated to: super_admin');

    // 3. Get user's tenant
    const tenantId = user.tenant_id;
    if (!tenantId) {
      console.log('⚠️  User has no tenant, assigning default tenant...');
      let tenant = await db.Tenant.findOne();
      if (!tenant) {
        const businessType = await db.BusinessType.findOne();
        tenant = await db.Tenant.create({
          business_type_id: businessType.id,
          business_name: 'Bedagang Admin',
          business_address: 'Admin Office',
          business_phone: '08123456789',
          business_email: 'admin@bedagang.com',
          setup_completed: true,
          onboarding_step: 'completed'
        });
      }
      await user.update({ tenant_id: tenant.id });
      console.log('✅ Tenant assigned');
    }

    // 4. Enable ALL modules for this tenant
    console.log('\n📋 Enabling ALL modules for tenant...');
    
    const allModules = await db.Module.findAll();
    console.log(`Found ${allModules.length} modules`);

    let enabledCount = 0;
    for (const module of allModules) {
      const [tenantModule, created] = await db.TenantModule.findOrCreate({
        where: {
          tenant_id: user.tenant_id,
          module_id: module.id
        },
        defaults: {
          is_active: true,
          activated_at: new Date()
        }
      });

      if (created) {
        console.log(`  ✅ Enabled: ${module.name} (${module.code})`);
        enabledCount++;
      } else {
        await tenantModule.update({ is_active: true });
        console.log(`  ✓ Already enabled: ${module.name} (${module.code})`);
      }
    }

    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SUPER ADMIN ACCESS GRANTED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📝 USER DETAILS:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Status: ${user.isActive ? 'Active' : 'Inactive'}`);
    console.log('\n🔑 ACCESS LEVEL: SUPER ADMIN');
    console.log(`✅ MODULES ENABLED: ${allModules.length} (ALL MODULES)`);
    console.log('\n📋 AVAILABLE MODULES:');
    allModules.forEach(module => {
      console.log(`   ✓ ${module.name} (${module.code})`);
    });
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
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error granting super admin access:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
grantSuperAdminAccess();
