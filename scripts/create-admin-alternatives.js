const db = require('../models');
const bcrypt = require('bcryptjs');

async function createAlternativeAdmins() {
  console.log('🔧 Creating alternative admin accounts...\n');

  try {
    const admins = [
      {
        id: 999999,
        name: 'Super Administrator',
        email: 'superadmin@bedagang.com',
        password: 'MasterAdmin2026!',
        role: 'super_admin'
      },
      {
        id: 999998,
        name: 'Admin User',
        email: 'admin@bedagang.com',
        password: 'admin123',
        role: 'super_admin'
      },
      {
        id: 999997,
        name: 'Test Admin',
        email: 'test@admin.com',
        password: 'test123',
        role: 'super_admin'
      }
    ];

    for (const adminData of admins) {
      console.log(`\n📝 Processing: ${adminData.email}`);
      
      // Check if user exists
      let user = await db.User.findOne({ where: { email: adminData.email } });
      
      if (user) {
        console.log('   ✓ User exists, updating...');
        const hashedPassword = await bcrypt.hash(adminData.password, 10);
        await user.update({
          name: adminData.name,
          password: hashedPassword,
          role: adminData.role,
          isActive: true,
          tenantId: null,
          assignedBranchId: null
        });
        console.log('   ✅ Updated successfully');
      } else {
        console.log('   ✓ Creating new user...');
        const hashedPassword = await bcrypt.hash(adminData.password, 10);
        user = await db.User.create({
          id: adminData.id,
          name: adminData.name,
          email: adminData.email,
          password: hashedPassword,
          role: adminData.role,
          isActive: true,
          tenantId: null,
          assignedBranchId: null
        });
        console.log('   ✅ Created successfully');
      }

      // Verify password
      const isValid = await bcrypt.compare(adminData.password, user.password);
      console.log(`   🔑 Password verification: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL ADMIN ACCOUNTS READY!');
    console.log('='.repeat(70));
    console.log('\n📋 Login Credentials:\n');
    
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Password: ${admin.password}`);
      console.log('');
    });

    console.log('🌐 Login URLs:');
    console.log('   Admin Panel: http://localhost:3001/admin/login');
    console.log('   User Login: http://localhost:3001/auth/login');
    console.log('\n💡 Tips:');
    console.log('   - Clear browser cache and cookies');
    console.log('   - Try incognito/private mode');
    console.log('   - Check browser console for errors (F12)');
    console.log('   - Copy-paste credentials to avoid typos');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createAlternativeAdmins();
