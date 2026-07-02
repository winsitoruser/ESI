const db = require('../models');
const bcrypt = require('bcryptjs');

async function checkSuperAdmin() {
  console.log('🔍 Checking Super Admin account...\n');

  try {
    // Check for superadmin@bedagang.com
    const superAdmin = await db.User.findOne({ 
      where: { email: 'superadmin@bedagang.com' } 
    });

    if (superAdmin) {
      console.log('✅ Super Admin found:');
      console.log('   ID:', superAdmin.id);
      console.log('   Name:', superAdmin.name);
      console.log('   Email:', superAdmin.email);
      console.log('   Role:', superAdmin.role);
      console.log('   Is Active:', superAdmin.isActive);
      
      // Test password
      const isPasswordValid = await bcrypt.compare('MasterAdmin2026!', superAdmin.password);
      console.log('\n🔑 Password "MasterAdmin2026!" is:', isPasswordValid ? '✅ CORRECT' : '❌ INCORRECT');
      
      if (!isPasswordValid) {
        console.log('\n🔧 Resetting password to "MasterAdmin2026!"...');
        const hashedPassword = await bcrypt.hash('MasterAdmin2026!', 10);
        await superAdmin.update({ password: hashedPassword });
        console.log('✅ Password reset successful!');
      }
    } else {
      console.log('❌ Super Admin NOT found');
      console.log('\n🔧 Creating Super Admin account...');
      
      const hashedPassword = await bcrypt.hash('MasterAdmin2026!', 10);
      const newAdmin = await db.User.create({
        id: 999999,
        name: 'Super Administrator',
        email: 'superadmin@bedagang.com',
        phone: '+62-MASTER-ADMIN',
        businessName: 'System Administrator',
        password: hashedPassword,
        role: 'super_admin',
        tenantId: null,
        isActive: true
      });
      
      console.log('✅ Super Admin created:');
      console.log('   ID:', newAdmin.id);
      console.log('   Email:', newAdmin.email);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Super Admin is ready!');
    console.log('='.repeat(60));
    console.log('\nLogin Credentials:');
    console.log('   Email: superadmin@bedagang.com');
    console.log('   Password: MasterAdmin2026!');
    console.log('   URL: http://localhost:3001/admin/login');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkSuperAdmin();
