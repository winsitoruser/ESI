// Quick fix script to add tenant_id and role columns to users table
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

async function addColumns() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected successfully');

    // Check and add tenant_id column
    console.log('\nChecking tenant_id column...');
    const [tenantIdExists] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'tenant_id'
    `);

    if (tenantIdExists.length === 0) {
      console.log('Adding tenant_id column...');
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN tenant_id UUID
      `);
      console.log('✅ tenant_id column added');
    } else {
      console.log('✅ tenant_id column already exists');
    }

    // Check and add role column
    console.log('\nChecking role column...');
    const [roleExists] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'role'
    `);

    if (roleExists.length === 0) {
      console.log('Adding role column...');
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN role VARCHAR(50) DEFAULT 'staff'
      `);
      console.log('✅ role column added');
    } else {
      console.log('✅ role column already exists');
    }

    // Verify columns
    console.log('\nVerifying columns...');
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('tenant_id', 'role')
      ORDER BY column_name
    `);

    console.log('\n✅ Columns in users table:');
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

addColumns();
