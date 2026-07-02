/**
 * Verify Password Script
 * Test if password 'admin123' matches the hash in database
 */

const bcrypt = require('bcryptjs');
const db = require('../models');
const { User } = db;

async function verifyPassword() {
  try {
    console.log('🔍 Verifying password for demo@bedagang.com...\n');

    const user = await User.findOne({ 
      where: { email: 'demo@bedagang.com' },
      raw: true
    });

    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }

    console.log('User found:');
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  Active:', user.isActive);
    console.log('  Password hash:', user.password.substring(0, 20) + '...');
    console.log('');

    // Test password
    const testPassword = 'admin123';
    console.log(`Testing password: "${testPassword}"`);
    
    const isValid = await bcrypt.compare(testPassword, user.password);
    
    console.log('');
    if (isValid) {
      console.log('✅ Password is CORRECT!');
      console.log('');
      console.log('You can login with:');
      console.log('  Email: demo@bedagang.com');
      console.log('  Password: admin123');
    } else {
      console.log('❌ Password is INCORRECT!');
      console.log('');
      console.log('The password hash in database does not match "admin123"');
      console.log('Run: node scripts/reset-admin-password.js');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

verifyPassword()
  .then(() => {
    console.log('\n✓ Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Verification failed:', error);
    process.exit(1);
  });
