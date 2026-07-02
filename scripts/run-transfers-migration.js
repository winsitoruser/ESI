const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Starting migration...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/20260126000005-create-inventory-transfers.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('📊 Creating tables...\n');

    // Execute migration
    await pool.query(sql);

    console.log('✅ Migration completed successfully!\n');

    // Verify tables created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'inventory_transfer%'
      ORDER BY table_name
    `);

    console.log('📋 Tables created:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Count indexes
    const indexResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM pg_indexes 
      WHERE tablename LIKE 'inventory_transfer%'
    `);

    console.log(`\n🔍 Indexes created: ${indexResult.rows[0].count}`);

    console.log('\n🎉 Migration successful! Inventory Transfers system is ready.\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
