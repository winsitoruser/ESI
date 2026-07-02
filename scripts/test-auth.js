const bcrypt = require('bcryptjs');
const db = require('../models');

async function testAuth() {
  try {
    console.log('============================================');
    console.log('Authentication Troubleshooting');
    console.log('============================================\n');

    // Test 1: Check database connection
    console.log('1. Testing database connection...');
    await db.sequelize.authenticate();
    console.log('   ✓ Database connected\n');

    // Test 2: Check if users table exists
    console.log('2. Checking users table...');
    const [results] = await db.sequelize.query(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'users'"
    );
    if (results[0].count > 0) {
      console.log('   ✓ Users table exists\n');
    } else {
      console.log('   ✗ Users table NOT found\n');
      console.log('   → Run migrations: npm run migrate\n');
      return;
    }

    // Test 3: Count users
    console.log('3. Checking existing users...');
    const userCount = await db.User.count();
    console.log(`   Total users: ${userCount}\n`);

    // Test 4: List all users
    if (userCount > 0) {
      console.log('4. Listing all users:');
      const users = await db.User.findAll({
        attributes: ['id', 'name', 'email', 'role', 'isActive', 'createdAt']
      });
      
      users.forEach(user => {
        console.log(`   - ${user.email}`);
        console.log(`     Name: ${user.name}`);
        console.log(`     Role: ${user.role}`);
        console.log(`     Active: ${user.isActive}`);
        console.log(`     Created: ${user.createdAt}`);
        console.log('');
      });
    } else {
      console.log('4. No users found!');
      console.log('   → Create default user: node scripts/create-default-user.js\n');
    }

    // Test 5: Test password hashing
    console.log('5. Testing password hashing...');
    const testPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const isValid = await bcrypt.compare(testPassword, hashedPassword);
    console.log(`   Password: ${testPassword}`);
    console.log(`   Hashed: ${hashedPassword.substring(0, 30)}...`);
    console.log(`   Verification: ${isValid ? '✓ Valid' : '✗ Invalid'}\n`);

    // Test 6: Check specific user
    console.log('6. Checking admin user...');
    const adminUser = await db.User.findOne({
      where: { email: 'admin@bedagang.com' }
    });

    if (adminUser) {
      console.log('   ✓ Admin user found');
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Name: ${adminUser.name}`);
      console.log(`   Role: ${adminUser.role}`);
      console.log(`   Active: ${adminUser.isActive}`);
      
      // Test password
      console.log('\n   Testing password...');
      const passwordValid = await bcrypt.compare('admin123', adminUser.password);
      console.log(`   Password "admin123": ${passwordValid ? '✓ Valid' : '✗ Invalid'}`);
    } else {
      console.log('   ✗ Admin user NOT found');
      console.log('   → Create with: node scripts/create-default-user.js');
    }

    console.log('\n============================================');
    console.log('Troubleshooting Complete');
    console.log('============================================\n');

    // Recommendations
    console.log('RECOMMENDATIONS:\n');
    if (userCount === 0) {
      console.log('1. Create default user:');
      console.log('   node scripts/create-default-user.js\n');
    }
    
    console.log('2. Test login credentials:');
    console.log('   Email: admin@bedagang.com');
    console.log('   Password: admin123\n');

    console.log('3. Check environment variables:');
    console.log('   NEXTAUTH_SECRET should be set in .env\n');

    console.log('4. Check NextAuth configuration:');
    console.log('   File: pages/api/auth/[...nextauth].ts\n');

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await db.sequelize.close();
  }
}

testAuth();
