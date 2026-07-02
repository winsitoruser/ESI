// Script to add is_active column to users table
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

async function addIsActiveColumn() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected successfully\n');

    // Check if is_active column exists
    console.log('Checking is_active column...');
    const [columnExists] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'is_active'
    `);

    if (columnExists.length === 0) {
      console.log('Adding is_active column...');
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN is_active BOOLEAN DEFAULT true
      `);
      console.log('✅ is_active column added');

      // Set all existing users to active
      await sequelize.query(`
        UPDATE users 
        SET is_active = true 
        WHERE is_active IS NULL
      `);
      console.log('✅ All existing users set to active');
    } else {
      console.log('✅ is_active column already exists');
    }

    // Verify
    console.log('\nVerifying column...');
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'is_active'
    `);

    console.table(columns);

    console.log('\n🎉 Fix completed successfully!');
    console.log('You can now try to login again.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

addIsActiveColumn();
