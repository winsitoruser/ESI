const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

// Initialize Sequelize
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'bedagang_db',
  logging: false
});

async function resetPassword() {
  try {
    console.log('🔧 Resetting password for winsitoruser@gmail.com...\n');

    // Hash the new password
    const newPassword = 'winsitor123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    const [updated] = await sequelize.query(`
      UPDATE users 
      SET password = :password, updated_at = NOW() 
      WHERE email = 'winsitoruser@gmail.com'
    `, {
      replacements: { password: hashedPassword },
      type: Sequelize.QueryTypes.UPDATE
    });

    if (updated > 0) {
      console.log('✅ Password successfully updated!');
      console.log('   Email: winsitoruser@gmail.com');
      console.log('   New Password: winsitor123');
      console.log('\n📝 Please use these credentials to login:');
      console.log('   URL: http://localhost:3001/auth/login');
    } else {
      console.log('❌ User not found in database');
    }

  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
  } finally {
    await sequelize.close();
  }
}

resetPassword();
