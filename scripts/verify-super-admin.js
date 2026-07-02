const db = require('../models');

async function verifySuperAdmin() {
  try {
    // Get user
    const user = await db.User.findOne({
      where: { email: 'winsitoruser@gmail.com' },
      attributes: ['id', 'name', 'email', 'role', 'isActive']
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('\n📋 User Details:');
    console.log('================');
    console.log(`ID: ${user.id}`);
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Active: ${user.isActive ? 'Yes' : 'No'}`);

    // Check if super_admin
    if (user.role === 'super_admin') {
      console.log('\n✅ SUPER ADMIN STATUS CONFIRMED');
      console.log('============================');
      console.log('This user has FULL ACCESS to:');
      console.log('  ✓ All modules');
      console.log('  ✓ All pages');
      console.log('  ✓ All API endpoints');
      console.log('  ✓ All features');
      console.log('  ✓ Bypasses all permission checks');
      
      // List available modules
      const modules = await db.Module.findAll();
      console.log(`\n📦 Available Modules (${modules.length}):`);
      modules.forEach(module => {
        console.log(`  - ${module.name} (${module.code})`);
      });
    } else {
      console.log('\n❌ User is NOT super_admin');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

verifySuperAdmin();
