const db = require('../models');

async function addKybStatusColumn() {
  const { sequelize } = db;
  
  try {
    console.log('Adding kyb_status column to tenants table...\n');

    // Add kyb_status column
    await sequelize.query(`
      ALTER TABLE tenants 
      ADD COLUMN IF NOT EXISTS kyb_status VARCHAR(30) DEFAULT 'not_started';
    `);
    console.log('✓ kyb_status column added');

    // Add index
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_tenants_kyb_status ON tenants(kyb_status);
    `);
    console.log('✓ Index created');

    console.log('\n✅ Column added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addKybStatusColumn();
