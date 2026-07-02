const sequelize = require('../lib/sequelize');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...\n');

    // Check connection
    await sequelize.authenticate();
    console.log('✓ Database connection established\n');

    // Read and execute branches migration
    console.log('📦 Creating branches table...');
    const branchesSql = fs.readFileSync(
      path.join(__dirname, '../migrations/create-branches-table.sql'),
      'utf8'
    );
    
    await sequelize.query(branchesSql);
    console.log('✓ Branches table created\n');

    // Read and execute store_settings migration
    console.log('📦 Creating store_settings table...');
    const settingsSql = fs.readFileSync(
      path.join(__dirname, '../migrations/create-store-settings-table.sql'),
      'utf8'
    );
    
    await sequelize.query(settingsSql);
    console.log('✓ Store settings table created\n');

    // Verify tables
    console.log('🔍 Verifying tables...');
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('branches', 'store_settings')
      ORDER BY table_name
    `);
    
    console.log('Tables found:', tables.map(t => t.table_name).join(', '));
    console.log('');

    // Check data
    console.log('📊 Checking initial data...');
    const [branches] = await sequelize.query('SELECT * FROM branches');
    const [settings] = await sequelize.query('SELECT * FROM store_settings');
    
    console.log(`✓ Branches: ${branches.length} records`);
    console.log(`✓ Settings: ${settings.length} records`);
    console.log('');

    console.log('✅ Migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigrations();
