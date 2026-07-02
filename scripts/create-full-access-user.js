const bcrypt = require('bcryptjs');
const db = require('../models');

async function createFullAccessUser() {
  try {
    console.log('🚀 Creating User with Full Access to All Menus...\n');

    // Hash password
    const hashedPassword = await bcrypt.hash('fullaccess123', 10);
    
    // Check if user exists
    let user = await db.User.findOne({
      where: { email: 'fullaccess@bedagang.com' }
    });

    if (user) {
      console.log('📝 Updating existing user...');
      await user.update({
        name: 'Full Access User',
        password: hashedPassword,
        role: 'owner',
        isActive: true,
        phone: '08123456789',
        businessName: 'Full Access Business'
      });
      console.log('✅ User updated successfully');
    } else {
      console.log('📝 Creating new user...');
      user = await db.User.create({
        name: 'Full Access User',
        email: 'fullaccess@bedagang.com',
        password: hashedPassword,
        role: 'owner',
        isActive: true,
        phone: '08123456789',
        businessName: 'Full Access Business'
      });
      console.log('✅ User created successfully');
    }

    // Get user's tenant_id if exists
    const tenantId = user.tenant_id;
    
    if (tenantId) {
      console.log(`\n📦 User has tenant_id: ${tenantId}`);
      console.log('🔧 Enabling all modules for this tenant...\n');

      try {
        // Get all modules
        const allModules = await db.Module.findAll();
        console.log(`Found ${allModules.length} modules to enable\n`);

        // Enable all modules for this tenant
        for (const module of allModules) {
          try {
            const [tenantModule, created] = await db.TenantModule.findOrCreate({
              where: {
                tenant_id: tenantId,
                module_id: module.id
              },
              defaults: {
                is_active: true,
                activated_at: new Date()
              }
            });

            if (!tenantModule.is_active) {
              await tenantModule.update({ is_active: true });
            }

            console.log(`  ${created ? '✅ Enabled' : '✓ Already enabled'}: ${module.name} (${module.code})`);
          } catch (err) {
            console.log(`  ⚠️  Could not enable: ${module.name} - ${err.message}`);
          }
        }
      } catch (err) {
        console.log(`\n⚠️  Could not enable modules: ${err.message}`);
        console.log('User will still have access, but modules might need manual activation.');
      }
    } else {
      console.log('\n⚠️  User does not have tenant_id');
      console.log('User will have access to all menus based on role.');
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('🎉 USER WITH FULL ACCESS CREATED SUCCESSFULLY!');
    console.log('='.repeat(70));
    console.log('\n📝 LOGIN CREDENTIALS:');
    console.log('   Email: fullaccess@bedagang.com');
    console.log('   Password: fullaccess123');
    console.log('\n🔑 ROLE: owner (full access)');
    console.log('👤 NAME: Full Access User');
    console.log('📱 PHONE: 08123456789');
    console.log('🏢 BUSINESS: Full Access Business');
    
    if (tenantId) {
      console.log(`📦 TENANT ID: ${tenantId}`);
    }

    console.log('\n✅ SIDEBAR MENUS AVAILABLE:');
    console.log('   ✓ Dasbor (Dashboard)');
    console.log('   ✓ Kasir (POS)');
    console.log('   ✓ Inventori (Inventory)');
    console.log('   ✓ Manajemen Meja (Tables)');
    console.log('   ✓ Reservasi (Reservations)');
    console.log('   ✓ Keuangan (Finance)');
    console.log('   ✓ Pelanggan (Customers)');
    console.log('   ✓ Jadwal & Shift (Employees)');
    console.log('   ✓ Promo & Voucher');
    console.log('   ✓ Program Loyalitas (Loyalty)');
    console.log('   ✓ Laporan (Reports)');
    console.log('   ✓ Pengaturan (Settings)');

    console.log('\n🌐 LOGIN AT:');
    console.log('   http://localhost:3001/auth/login');
    console.log('\n💡 TIPS:');
    console.log('   - Use this account to see ALL sidebar menus');
    console.log('   - All features will be accessible');
    console.log('   - Perfect for testing and demo purposes');
    console.log('='.repeat(70));

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating user:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the script
createFullAccessUser();
