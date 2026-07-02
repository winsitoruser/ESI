const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runInventoryMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Running Inventory System Migration...\n');

    const migrationPath = path.join(__dirname, '../migrations/20260127000002-create-inventory-system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration SQL...');
    await pool.query(migrationSQL);

    console.log('\n✅ Migration completed successfully!\n');

    // Verify tables
    console.log('🔍 Verifying tables...\n');
    const result = await pool.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
        AND table_name IN ('categories', 'suppliers', 'locations', 'products', 
                           'inventory_stock', 'stock_movements', 'stock_adjustments', 
                           'stock_adjustment_items')
      ORDER BY table_name;
    `);

    console.log('📋 Tables Created:');
    result.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name} (${row.column_count} columns)`);
    });

    // Check data
    console.log('\n📊 Sample Data:');
    
    const categories = await pool.query('SELECT COUNT(*) as count FROM categories');
    console.log(`  - Categories: ${categories.rows[0].count}`);
    
    const locations = await pool.query('SELECT COUNT(*) as count FROM locations');
    console.log(`  - Locations: ${locations.rows[0].count}`);
    
    const suppliers = await pool.query('SELECT COUNT(*) as count FROM suppliers');
    console.log(`  - Suppliers: ${suppliers.rows[0].count}`);
    
    const products = await pool.query('SELECT COUNT(*) as count FROM products');
    console.log(`  - Products: ${products.rows[0].count}`);
    
    const stock = await pool.query('SELECT COUNT(*) as count FROM inventory_stock');
    console.log(`  - Stock Records: ${stock.rows[0].count}`);

    console.log('\n✅ Inventory system ready!\n');

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

runInventoryMigration();
