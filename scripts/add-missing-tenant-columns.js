const db = require('../models');

async function addMissingColumns() {
  const { sequelize } = db;
  
  try {
    console.log('Adding missing columns to tenants table...\n');

    // Add business_structure column
    await sequelize.query(`
      ALTER TABLE tenants 
      ADD COLUMN IF NOT EXISTS business_structure VARCHAR(20) DEFAULT 'single';
    `);
    console.log('✓ business_structure column added');

    // Add onboarding_step column if not exists
    await sequelize.query(`
      ALTER TABLE tenants 
      ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1;
    `);
    console.log('✓ onboarding_step column added');

    console.log('\n✅ All missing columns added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addMissingColumns();
