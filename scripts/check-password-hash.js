// Script to check password hash and authentication
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

async function checkPassword() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected successfully\n');

    // Get user and password hash
    const [users] = await sequelize.query(`
      SELECT id, name, email, password, role
      FROM users
      WHERE email = 'demo@bedagang.com'
    `);

    if (users.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = users[0];
    console.log('User found:');
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Password hash: ${user.password.substring(0, 20)}...`);
    console.log('');

    // Try to verify password
    let bcrypt;
    try {
      bcrypt = require('bcryptjs');
    } catch (e) {
      bcrypt = require('bcrypt');
    }

    const testPassword = 'password123';
    const isValid = await bcrypt.compare(testPassword, user.password);

    console.log(`Testing password: "${testPassword}"`);
    console.log(`Password valid: ${isValid ? '✅ YES' : '❌ NO'}`);
    console.log('');

    if (!isValid) {
      console.log('⚠️  Password hash does not match!');
      console.log('Let me create a new hash...\n');

      const newHash = await bcrypt.hash(testPassword, 10);
      
      await sequelize.query(`
        UPDATE users 
        SET password = :password
        WHERE email = 'demo@bedagang.com'
      `, {
        replacements: { password: newHash }
      });

      console.log('✅ Password updated with new hash');
      console.log('');
      console.log('🔑 Login Credentials:');
      console.log('  Email: demo@bedagang.com');
      console.log('  Password: password123');
      console.log('');
      console.log('Try logging in again!');
    } else {
      console.log('✅ Password hash is correct!');
      console.log('');
      console.log('The issue might be:');
      console.log('1. Wrong email/password entered');
      console.log('2. Authentication logic issue');
      console.log('3. Session/cookie issue');
      console.log('');
      console.log('Try these credentials:');
      console.log('  Email: demo@bedagang.com');
      console.log('  Password: password123');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

checkPassword();
