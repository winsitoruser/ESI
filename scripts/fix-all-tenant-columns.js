const db = require('../models');

async function fixAllTenantColumns() {
  const { sequelize } = db;
  
  try {
    console.log('Adding all missing columns to tenants table...\n');

    const columns = [
      'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS parent_tenant_id UUID REFERENCES tenants(id);',
      'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_hq BOOLEAN DEFAULT false;',
      'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP;',
      'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS activated_by UUID;',
      'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_code VARCHAR(50);',
    ];

    for (const sql of columns) {
      await sequelize.query(sql);
      console.log('✓', sql.split('ADD COLUMN IF NOT EXISTS')[1].split(' ')[0]);
    }

    console.log('\n✅ All columns added successfully!');
    console.log('\nNow restart your server and try again.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixAllTenantColumns();
