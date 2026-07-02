// Script to reset user password
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
    dialect: dbConfig.dialect,
    logging: false
  }
);

async function resetPassword() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected successfully\n');

    // Use bcryptjs instead of bcrypt (more compatible)
    let bcrypt;
    try {
      bcrypt = require('bcryptjs');
    } catch (e) {
      console.log('bcryptjs not found, trying bcrypt...');
      bcrypt = require('bcrypt');
    }

    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Reset password for demo user
    const [result] = await sequelize.query(`
      UPDATE users 
      SET password = :password
      WHERE email = 'demo@bedagang.com'
      RETURNING id, name, email, role
    `, {
      replacements: { password: hashedPassword }
    });

    if (result.length > 0) {
      const user = result[0];
      console.log('✅ Password reset successful!\n');
      console.log('User Details:');
      console.log(`  Name: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log('\n🔑 New Login Credentials:');
      console.log('  Email: demo@bedagang.com');
      console.log('  Password: password123');
      console.log('\n🌐 Login URL: http://localhost:3001/auth/login');
      console.log('\n✨ You can now login with these credentials!');
    } else {
      console.log('❌ User not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('Cannot find module')) {
      console.log('\n💡 Installing bcryptjs...');
      console.log('Please run: npm install bcryptjs');
      console.log('Then run this script again.');
    }
    
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

resetPassword();
