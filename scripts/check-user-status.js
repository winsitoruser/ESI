/**
 * Check User Status and Role
 * This script helps debug admin panel access issues
 */

const db = require('../models');
const { User } = db;

async function checkUserStatus() {
  try {
    console.log('🔍 Checking user status...\n');

    // List all users with their roles
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role'],
      order: [['id', 'ASC']]
    });

    if (users.length === 0) {
      console.log('❌ No users found in database!');
      console.log('\nPlease create a user first:');
      console.log('  1. Register via /auth/register');
      console.log('  2. Or run: node scripts/create-demo-user.js');
      return;
    }

    console.log(`Found ${users.length} user(s):\n`);
    console.log('ID\tName\t\t\tEmail\t\t\t\tRole');
    console.log('─'.repeat(80));

    users.forEach(user => {
      const adminIndicator = ['ADMIN', 'SUPER_ADMIN'].includes(user.role) ? '✅' : '  ';
      console.log(`${adminIndicator} ${user.id}\t${user.name.padEnd(20)}\t${user.email.padEnd(30)}\t${user.role}`);
    });

    console.log('\n' + '─'.repeat(80));
    
    const adminUsers = users.filter(u => ['ADMIN', 'SUPER_ADMIN'].includes(u.role));
    const regularUsers = users.filter(u => !['ADMIN', 'SUPER_ADMIN'].includes(u.role));

    console.log(`\n📊 Summary:`);
    console.log(`  Total users: ${users.length}`);
    console.log(`  Admin users: ${adminUsers.length}`);
    console.log(`  Regular users: ${regularUsers.length}`);

    if (adminUsers.length === 0) {
      console.log('\n⚠️  WARNING: No admin users found!');
      console.log('\nTo set a user as admin, run:');
      console.log('  node scripts/set-admin-role.js <email>');
      console.log('\nExample:');
      console.log(`  node scripts/set-admin-role.js ${users[0].email}`);
    } else {
      console.log('\n✅ Admin users can access admin panel at:');
      console.log('  http://localhost:3001/admin');
      console.log('  http://localhost:3002/admin');
      console.log('\nAdmin users:');
      adminUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.role})`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('Next steps:');
    console.log('='.repeat(80));
    
    if (adminUsers.length === 0) {
      console.log('1. Set admin role: node scripts/set-admin-role.js <email>');
      console.log('2. Logout and login again');
      console.log('3. Access admin panel');
    } else {
      console.log('1. Make sure you are logged in as one of the admin users above');
      console.log('2. If already logged in, logout and login again to refresh session');
      console.log('3. Click burger menu → "Admin Panel" button should appear');
      console.log('4. Or directly access: http://localhost:3002/admin');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error checking user status:', error.message);
    throw error;
  }
}

// Run the function
checkUserStatus()
  .then(() => {
    console.log('✓ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Check failed:', error);
    process.exit(1);
  });
