/**
 * Create Regular User
 * Creates a regular user (non-admin) for testing
 */

const bcrypt = require('bcryptjs');
const db = require('../models');
const { User } = db;

async function createRegularUser() {
  try {
    console.log('👤 Creating regular user...\n');

    const email = 'user@bedagang.com';
    const password = 'user123';
    const name = 'Regular User';
    const businessName = 'My Store';

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      console.log('⚠️  User already exists. Updating password...\n');
      
      const hashedPassword = await bcrypt.hash(password, 10);
      await existingUser.update({
        password: hashedPassword,
        role: 'USER',
        isActive: true
      });

      console.log('✅ User updated successfully!\n');
    } else {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      await User.create({
        name,
        email,
        password: hashedPassword,
        businessName,
        role: 'USER',
        isActive: true
      });

      console.log('✅ User created successfully!\n');
    }

    console.log('═'.repeat(60));
    console.log('Regular User Login Credentials:');
    console.log('═'.repeat(60));
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role:     USER`);
    console.log(`Business: ${businessName}`);
    console.log('═'.repeat(60));
    console.log('\n🚀 You can now login to Client App at:');
    console.log('   http://localhost:3001');
    console.log('\n📝 This user has access to:');
    console.log('   - Dashboard');
    console.log('   - POS System');
    console.log('   - Inventory Management');
    console.log('   - Finance Module');
    console.log('   - Reports & Analytics');
    console.log('\n⚠️  This user CANNOT access Admin Panel (port 3002)');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    throw error;
  }
}

// Run the function
createRegularUser()
  .then(() => {
    console.log('✓ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Script failed:', error);
    process.exit(1);
  });
