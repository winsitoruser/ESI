const bcrypt = require('bcryptjs');
const db = require('../models');

async function createSuperUser() {
  try {
    console.log('🚀 Creating Super User with Full Access...\n');

    // 1. Find or create a tenant
    let tenant = await db.Tenant.findOne({
      where: { business_name: 'Super Admin Tenant' }
    });

    if (!tenant) {
      console.log('📦 Creating Super Admin Tenant...');
      
      // Get first business type
      const businessType = await db.BusinessType.findOne();
      
      tenant = await db.Tenant.create({
        business_type_id: businessType.id,
        business_name: 'Super Admin Tenant',
        business_address: 'Admin Office',
        business_phone: '08123456789',
        business_email: 'superadmin@bedagang.com',
        setup_completed: true,
        onboarding_step: 'completed'
      });
      
      console.log('✅ Tenant created:', tenant.business_name);
    } else {
      console.log('✅ Using existing tenant:', tenant.business_name);
    }

    // 2. Enable ALL modules for this tenant
    console.log('\n📋 Enabling ALL modules for tenant...');
    
    const allModules = await db.Module.findAll();
    console.log(`Found ${allModules.length} modules`);

    for (const module of allModules) {
      const [tenantModule, created] = await db.TenantModule.findOrCreate({
        where: {
          tenant_id: tenant.id,
          module_id: module.id
        },
        defaults: {
          is_active: true,
          activated_at: new Date()
        }
      });

      if (created) {
        console.log(`  ✅ Enabled: ${module.name} (${module.code})`);
      } else {
        // Update to active if exists
        await tenantModule.update({ is_active: true });
        console.log(`  ✓ Already enabled: ${module.name} (${module.code})`);
      }
    }

    // 3. Create or update super user
    console.log('\n👤 Creating Super User...');
    
    const hashedPassword = await bcrypt.hash('superadmin123', 10);
    
    let superUser = await db.User.findOne({
      where: { email: 'superadmin@bedagang.com' }
    });

    if (superUser) {
      console.log('Updating existing super user...');
      await superUser.update({
        name: 'Super Admin',
        password: hashedPassword,
        tenant_id: tenant.id,
        role: 'super_admin',
        isActive: true,
        phone: '08123456789',
        businessName: 'Super Admin Tenant'
      });
    } else {
      superUser = await db.User.create({
        name: 'Super Admin',
        email: 'superadmin@bedagang.com',
        password: hashedPassword,
        tenant_id: tenant.id,
        role: 'super_admin',
        isActive: true,
        phone: '08123456789',
        businessName: 'Super Admin Tenant'
      });
    }

    console.log('✅ Super User created/updated');

    // 4. Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SUPER USER CREATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📝 LOGIN CREDENTIALS:');
    console.log('   Email: superadmin@bedagang.com');
    console.log('   Password: superadmin123');
    console.log('\n🔑 ROLE: super_admin');
    console.log(`📦 TENANT: ${tenant.business_name}`);
    console.log(`✅ MODULES ENABLED: ${allModules.length} (ALL MODULES)`);
    console.log('\n📋 AVAILABLE MODULES:');
    allModules.forEach(module => {
      console.log(`   ✓ ${module.name} (${module.code})`);
    });
    console.log('\n🌐 ACCESS:');
    console.log('   - All sidebar menus visible');
    console.log('   - All features accessible');
    console.log('   - Full system access');
    console.log('\n🚀 LOGIN AT:');
    console.log('   http://localhost:3001/auth/login');
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating super user:', error);
    process.exit(1);
  }
}

// Run the script
createSuperUser();
