/**
 * Set User Role to ADMIN
 * This script updates a user's role to ADMIN or SUPER_ADMIN
 */

const db = require('../models');
const { User } = db;

async function setAdminRole() {
  try {
    console.log('🔧 Setting user role to ADMIN...\n');

    // Get email from command line argument
    const email = process.argv[2];
    const role = process.argv[3] || 'ADMIN'; // Default to ADMIN

    if (!email) {
      console.error('❌ Error: Email is required');
      console.log('\nUsage:');
      console.log('  node scripts/set-admin-role.js <email> [role]');
      console.log('\nExamples:');
      console.log('  node scripts/set-admin-role.js user@example.com');
      console.log('  node scripts/set-admin-role.js user@example.com SUPER_ADMIN');
      console.log('\nAvailable roles:');
      console.log('  - ADMIN (default)');
      console.log('  - SUPER_ADMIN');
      process.exit(1);
    }

    // Validate role
    const validRoles = ['ADMIN', 'SUPER_ADMIN', 'owner', 'admin', 'manager', 'cashier', 'staff'];
    if (!validRoles.includes(role)) {
      console.error(`❌ Error: Invalid role "${role}"`);
      console.log('\nValid roles:', validRoles.join(', '));
      process.exit(1);
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.error(`❌ Error: User with email "${email}" not found`);
      console.log('\nPlease check the email address and try again.');
      process.exit(1);
    }

    // Update user role
    const oldRole = user.role;
    user.role = role;
    await user.save();

    console.log('✅ User role updated successfully!\n');
    console.log('User Details:');
    console.log('  ID:', user.id);
    console.log('  Name:', user.name);
    console.log('  Email:', user.email);
    console.log('  Old Role:', oldRole);
    console.log('  New Role:', user.role);
    console.log('\n========================================');
    
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      console.log('✅ User can now access Admin Panel!');
      console.log('========================================\n');
      console.log('Admin Panel URLs:');
      console.log('  - Port 3001: http://localhost:3001/admin');
      console.log('  - Port 3002: http://localhost:3002/admin');
      console.log('\nAccess from landing page:');
      console.log('  1. Login with this user');
      console.log('  2. Click burger menu (top right)');
      console.log('  3. Click "Admin Panel" button');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error setting admin role:', error.message);
    throw error;
  }
}

// Run the function
setAdminRole()
  .then(() => {
    console.log('✓ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Script failed:', error);
    process.exit(1);
  });
