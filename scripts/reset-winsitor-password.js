const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: false
  }
);

async function resetWinsitorPassword() {
  try {
    console.log('Resetting password for winsitoruser@gmail.com...\n');
    
    const newPassword = 'password123'; // Simple password for testing
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const [result] = await sequelize.query(`
      UPDATE users 
      SET password = :password
      WHERE email = 'winsitoruser@gmail.com'
      RETURNING id, name, email, role
    `, {
      replacements: { password: hashedPassword }
    });
    
    if (result.length > 0) {
      const user = result[0];
      console.log('✅ Password reset successful!\n');
      console.log('User Details:');
      console.log(`  ID: ${user.id}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`\n🔑 New Credentials:`);
      console.log(`  Email: winsitoruser@gmail.com`);
      console.log(`  Password: password123`);
      console.log(`\n⚠️  Please change this password after first login!`);
    } else {
      console.log('❌ User not found!');
    }
    
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await sequelize.close();
  }
}

resetWinsitorPassword();
