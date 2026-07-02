const db = require('../models');

async function addBatchExpiryColumns() {
  try {
    console.log('Adding batch_number and expiry_date columns to inventory_stock table...\n');
    
    // Check if columns already exist
    const [columns] = await db.sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'inventory_stock' 
      AND column_name IN ('batch_number', 'expiry_date');
    `);
    
    const existingColumns = columns.map(c => c.column_name);
    
    if (existingColumns.includes('batch_number') && existingColumns.includes('expiry_date')) {
      console.log('✓ Columns already exist. No action needed.');
      process.exit(0);
    }
    
    // Add batch_number column if not exists
    if (!existingColumns.includes('batch_number')) {
      console.log('Adding batch_number column...');
      await db.sequelize.query(`
        ALTER TABLE inventory_stock 
        ADD COLUMN batch_number VARCHAR(100);
      `);
      console.log('✓ batch_number column added');
      
      // Add index
      await db.sequelize.query(`
        CREATE INDEX IF NOT EXISTS inventory_stock_batch_number_idx 
        ON inventory_stock(batch_number);
      `);
      console.log('✓ Index created for batch_number');
    } else {
      console.log('✓ batch_number column already exists');
    }
    
    // Add expiry_date column if not exists
    if (!existingColumns.includes('expiry_date')) {
      console.log('Adding expiry_date column...');
      await db.sequelize.query(`
        ALTER TABLE inventory_stock 
        ADD COLUMN expiry_date TIMESTAMP;
      `);
      console.log('✓ expiry_date column added');
      
      // Add index
      await db.sequelize.query(`
        CREATE INDEX IF NOT EXISTS inventory_stock_expiry_date_idx 
        ON inventory_stock(expiry_date);
      `);
      console.log('✓ Index created for expiry_date');
    } else {
      console.log('✓ expiry_date column already exists');
    }
    
    // Verify columns were added
    console.log('\nVerifying columns...');
    const [finalColumns] = await db.sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'inventory_stock' 
      AND column_name IN ('batch_number', 'expiry_date');
    `);
    
    console.log('\nColumns in inventory_stock:');
    finalColumns.forEach(col => {
      console.log(`  ✓ ${col.column_name} (${col.data_type})`);
    });
    
    console.log('\n✅ Database schema updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

addBatchExpiryColumns();
