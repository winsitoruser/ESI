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

async function resetSuperAdminPassword() {
  try {
    console.log('Resetting Super Admin password...\n');
    
    const newPassword = 'MasterAdmin2026!';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const [result] = await sequelize.query(`
      UPDATE users 
      SET password = :password
      WHERE email = 'superadmin@bedagang.com'
      RETURNING id, name, email, role
    `, {
      replacements: { password: hashedPassword }
    });
    
    if (result.length > 0) {
      const user = result[0];
      console.log('✅ Password reset successful!\n');
      console.log('User Details:');
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Role: ${user.role}`);
      console.log(`\n🔑 New Credentials:`);
      console.log(`  Email: superadmin@bedagang.com`);
      console.log(`  Password: MasterAdmin2026!`);
      console.log(`\n⚠️  Please change this password after first login!`);
    } else {
      console.log('❌ User not found!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

resetSuperAdminPassword();
