const { Sequelize } = require('sequelize');
const config = require('../config/database');
const bcrypt = require('bcryptjs');

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
    logging: console.log,
  }
);

async function setupUsersTable() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully!');

    // Create users table
    console.log('🔄 Creating users table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(255),
        "businessName" VARCHAR(255),
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'owner',
        "isActive" BOOLEAN DEFAULT true,
        "lastLogin" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table created!');

    // Create unique index on email
    console.log('🔄 Creating email index...');
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);
    `);
    console.log('✅ Email index created!');

    // Check if demo user exists
    const [results] = await sequelize.query(`
      SELECT * FROM users WHERE email = 'demo@bedagang.com';
    `);

    if (results.length > 0) {
      console.log('✅ Demo user already exists!');
    } else {
      // Create demo user
      console.log('🔄 Creating demo user...');
      const hashedPassword = await bcrypt.hash('demo123', 10);
      
      await sequelize.query(`
        INSERT INTO users (name, email, phone, "businessName", password, role, "isActive", "createdAt", "updatedAt")
        VALUES (
          'Demo User',
          'demo@bedagang.com',
          '08123456789',
          'Demo Store',
          '${hashedPassword}',
          'owner',
          true,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Demo user created successfully!');
    }

    console.log('\n📋 Demo Account Credentials:');
    console.log('   Email: demo@bedagang.com');
    console.log('   Password: demo123');
    console.log('\n✅ Setup completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

setupUsersTable();
