const db = require('../models');
const bcrypt = require('bcryptjs');

async function testLogin() {
  console.log('🧪 Testing NextAuth Login Flow...\n');

  try {
    const email = 'superadmin@bedagang.com';
    const password = 'MasterAdmin2026!';

    console.log('1️⃣ Finding user...');
    const user = await db.User.findOne({
      where: { email },
      include: [
        {
          model: db.Branch,
          as: 'assignedBranch',
          required: false
        },
        {
          model: db.Tenant,
          as: 'tenant',
          required: false
        }
      ]
    });

    if (!user) {
      console.log('❌ User NOT found');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.name);
    console.log('   Role:', user.role);
    console.log('   Is Active:', user.isActive);

    console.log('\n2️⃣ Checking if user is active...');
    if (!user.isActive) {
      console.log('❌ User is NOT active');
      process.exit(1);
    }
    console.log('✅ User is active');

    console.log('\n3️⃣ Verifying password...');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ Password is INCORRECT');
      console.log('   Expected password:', password);
      console.log('   Hash in DB:', user.password.substring(0, 20) + '...');
      process.exit(1);
    }
    console.log('✅ Password is CORRECT');

    console.log('\n4️⃣ Checking includes...');
    console.log('   Assigned Branch:', user.assignedBranch ? user.assignedBranch.name : 'None');
    console.log('   Tenant:', user.tenant ? user.tenant.name : 'None');

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL CHECKS PASSED!');
    console.log('='.repeat(60));
    console.log('\nNextAuth login should work with:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('\nIf login still fails, check:');
    console.log('   1. Browser console for errors');
    console.log('   2. Network tab for API response');
    console.log('   3. NextAuth debug logs');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testLogin();
