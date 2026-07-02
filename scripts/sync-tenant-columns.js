const db = require('../models');

async function syncTenantColumns() {
  const { sequelize } = db;
  
  try {
    console.log('=== Syncing Tenant Table Columns ===\n');

    // Step 1: Get existing columns in database
    const [existingCols] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' 
      ORDER BY ordinal_position;
    `);
    
    const existingColumnNames = existingCols.map(c => c.column_name);
    console.log('Existing columns in DB:', existingColumnNames.join(', '));
    console.log('Total:', existingColumnNames.length, '\n');

    // Step 2: Define ALL required columns from Tenant model
    const requiredColumns = [
      { name: 'business_type_id', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_type_id UUID;" },
      { name: 'business_name', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);" },
      { name: 'business_address', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_address TEXT;" },
      { name: 'business_phone', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_phone VARCHAR(50);" },
      { name: 'business_email', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_email VARCHAR(255);" },
      { name: 'setup_completed', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT false;" },
      { name: 'onboarding_step', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;" },
      { name: 'kyb_status', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS kyb_status VARCHAR(30) DEFAULT 'pending_kyb';" },
      { name: 'business_structure', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_structure VARCHAR(20) DEFAULT 'single';" },
      { name: 'parent_tenant_id', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS parent_tenant_id UUID;" },
      { name: 'is_hq', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_hq BOOLEAN DEFAULT false;" },
      { name: 'activated_at', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP;" },
      { name: 'activated_by', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS activated_by UUID;" },
      { name: 'business_code', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_code VARCHAR(50);" },
      { name: 'name', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS name VARCHAR(255);" },
      { name: 'code', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS code VARCHAR(50);" },
      { name: 'status', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'trial';" },
      { name: 'subscription_plan', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50);" },
      { name: 'subscription_start', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMP;" },
      { name: 'subscription_end', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP;" },
      { name: 'max_users', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5;" },
      { name: 'max_branches', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_branches INTEGER DEFAULT 1;" },
      { name: 'contact_name', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);" },
      { name: 'contact_email', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);" },
      { name: 'contact_phone', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);" },
      { name: 'address', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address TEXT;" },
      { name: 'city', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS city VARCHAR(100);" },
      { name: 'province', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS province VARCHAR(100);" },
      { name: 'postal_code', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);" },
      { name: 'settings', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSON;" },
      { name: 'is_active', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;" },
      { name: 'created_at', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;" },
      { name: 'updated_at', sql: "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;" },
    ];

    // Step 3: Find missing columns
    const missingColumns = requiredColumns.filter(c => !existingColumnNames.includes(c.name));
    
    if (missingColumns.length === 0) {
      console.log('✅ All columns already exist! No changes needed.\n');
    } else {
      console.log(`Found ${missingColumns.length} missing columns:\n`);
      
      for (const col of missingColumns) {
        try {
          await sequelize.query(col.sql);
          console.log(`  ✓ Added: ${col.name}`);
        } catch (err) {
          console.log(`  ⚠ Skipped ${col.name}: ${err.message}`);
        }
      }
      console.log('\n✅ Missing columns added!\n');
    }

    // Step 4: Verify by testing Tenant.findAll
    console.log('--- Verification Test ---');
    const tenants = await db.Tenant.findAll({ limit: 1 });
    console.log('✅ Tenant query successful! Found', tenants.length, 'tenants');
    
    if (tenants.length > 0) {
      console.log('  First tenant:', tenants[0].businessName || tenants[0].name);
    }

    // Step 5: Test KybApplication query
    console.log('\n--- Testing KYB Query ---');
    const kybCount = await db.KybApplication.count();
    console.log('✅ KYB query successful! Found', kybCount, 'records');

    // Step 6: Test creating a KYB record
    if (kybCount === 0 && tenants.length > 0) {
      console.log('\n--- Testing KYB Creation ---');
      const users = await db.User.findAll({ limit: 1 });
      if (users.length > 0) {
        const kyb = await db.KybApplication.create({
          tenantId: tenants[0].id,
          userId: users[0].id,
          businessName: tenants[0].businessName || 'Test Business',
          status: 'draft',
          currentStep: 1,
          completionPercentage: 0
        });
        console.log('✅ KYB created successfully! ID:', kyb.id);
      }
    }

    console.log('\n=== ALL CHECKS PASSED ===');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

syncTenantColumns();
