// Script to create test user
const bcrypt = require('bcrypt');
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
    logging: console.log
  }
);

async function createTestUser() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected successfully\n');

    // Hash password
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists
    const [existingUser] = await sequelize.query(`
      SELECT id, email FROM users WHERE email = 'test@bedagang.com'
    `);

    if (existingUser.length > 0) {
      console.log('User already exists. Updating password...');
      await sequelize.query(`
        UPDATE users 
        SET password = :password
        WHERE email = 'test@bedagang.com'
      `, {
        replacements: { password: hashedPassword }
      });
      console.log('✅ Password updated');
    } else {
      console.log('Creating new test user...');
      await sequelize.query(`
        INSERT INTO users (name, email, password, role, is_active, created_at, updated_at)
        VALUES (
          'Test User',
          'test@bedagang.com',
          :password,
          'owner',
          true,
          NOW(),
          NOW()
        )
      `, {
        replacements: { password: hashedPassword }
      });
      console.log('✅ Test user created');
    }

    console.log('\n🎉 Success! You can now login with:');
    console.log('📧 Email: test@bedagang.com');
    console.log('🔑 Password: password123');
    console.log('\n⚠️  Note: This user has no tenant_id, so modular features may not work yet.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

createTestUser();
