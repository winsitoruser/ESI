/**
 * Reset Admin Password
 * This script resets the password for admin user
 */

const bcrypt = require('bcryptjs');
const db = require('../models');
const { User } = db;

async function resetAdminPassword() {
  try {
    console.log('🔐 Resetting admin password...\n');

    const email = 'demo@bedagang.com';
    const newPassword = 'admin123'; // Default password

    // Find user
    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.error(`❌ User with email "${email}" not found`);
      process.exit(1);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await user.update({ 
      password: hashedPassword,
      isActive: true
    });

    console.log('✅ Password reset successfully!\n');
    console.log('═'.repeat(60));
    console.log('Admin Login Credentials:');
    console.log('═'.repeat(60));
    console.log(`Email:    ${email}`);
    console.log(`Password: ${newPassword}`);
    console.log(`Role:     ${user.role}`);
    console.log('═'.repeat(60));
    console.log('\n🚀 You can now login to Admin Panel at:');
    console.log('   http://localhost:3002/login');
    console.log('\n⚠️  IMPORTANT: Change this password after first login!');
    console.log('');

  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
    throw error;
  }
}

// Run the function
resetAdminPassword()
  .then(() => {
    console.log('✓ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Script failed:', error);
    process.exit(1);
  });
