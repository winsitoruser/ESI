require('dotenv').config();
const db = require('../models');

async function resetPassword() {
  try {
    console.log('🔧 Resetting password for winsitoruser@gmail.com...\n');

    const bcrypt = require('bcryptjs');
    const newPassword = 'winsitor123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    const updated = await db.User.update(
      { 
        password: hashedPassword,
        updatedAt: new Date()
      },
      { 
        where: { email: 'winsitoruser@gmail.com' }
      }
    );

    if (updated[0] > 0) {
      console.log('✅ Password successfully updated!');
      console.log('   Email: winsitoruser@gmail.com');
      console.log('   New Password: winsitor123');
      console.log('\n📝 Login credentials:');
      console.log('   URL: http://localhost:3001/auth/login');
      console.log('   Email: winsitoruser@gmail.com');
      console.log('   Password: winsitor123');
    } else {
      console.log('❌ User not found in database');
      
      // Check if user exists
      const user = await db.User.findOne({
        where: { email: 'winsitoruser@gmail.com' }
      });
      
      if (!user) {
        console.log('\n💡 Creating new user...');
        const newUser = await db.User.create({
          name: 'Winsitor F&B User',
          email: 'winsitoruser@gmail.com',
          password: hashedPassword,
          role: 'user',
          isActive: true,
          businessName: 'Winsitor Restaurant',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log('✅ New user created!');
        console.log('   Email: winsitoruser@gmail.com');
        console.log('   Password: winsitor123');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.sequelize.close();
  }
}

resetPassword();
