const { Pool } = require('pg');
require('dotenv').config();

async function checkInventoryTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 Checking Inventory Tables...\n');

    // Check if tables exist
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN (
          'inventory_stock',
          'stock_movements',
          'products',
          'categories',
          'locations',
          'suppliers'
        )
      ORDER BY table_name;
    `);

    console.log('📋 Existing Tables:');
    tablesCheck.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });

    const existingTables = tablesCheck.rows.map(r => r.table_name);
    const requiredTables = ['inventory_stock', 'stock_movements', 'products', 'categories', 'locations'];
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));

    if (missingTables.length > 0) {
      console.log('\n⚠️  Missing Tables:');
      missingTables.forEach(table => {
        console.log(`  ❌ ${table}`);
      });
    } else {
      console.log('\n✅ All required tables exist!');
    }

    // Check table structures
    console.log('\n📊 Table Structures:\n');

    for (const tableName of existingTables) {
      const columns = await pool.query(`
        SELECT 
          column_name, 
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      console.log(`\n📦 ${tableName.toUpperCase()} (${columns.rows.length} columns):`);
      columns.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const type = col.character_maximum_length 
          ? `${col.data_type}(${col.character_maximum_length})`
          : col.data_type;
        console.log(`  - ${col.column_name}: ${type} ${nullable}`);
      });
    }

    // Check indexes
    console.log('\n\n🔑 Indexes:\n');
    for (const tableName of existingTables) {
      const indexes = await pool.query(`
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes
        WHERE tablename = $1
          AND schemaname = 'public'
        ORDER BY indexname;
      `, [tableName]);

      if (indexes.rows.length > 0) {
        console.log(`\n${tableName}:`);
        indexes.rows.forEach(idx => {
          console.log(`  ✓ ${idx.indexname}`);
        });
      }
    }

    // Test queries
    console.log('\n\n🧪 Testing Queries:\n');

    // Test stock value query
    if (existingTables.includes('inventory_stock') && existingTables.includes('products')) {
      try {
        const stockValue = await pool.query(`
          SELECT COUNT(*) as total_products
          FROM products p
          LEFT JOIN inventory_stock s ON p.id = s.product_id
          LIMIT 1;
        `);
        console.log(`✅ Stock value query: ${stockValue.rows[0].total_products} products found`);
      } catch (err) {
        console.log(`❌ Stock value query failed: ${err.message}`);
      }
    }

    // Test stock movements query
    if (existingTables.includes('stock_movements')) {
      try {
        const movements = await pool.query(`
          SELECT COUNT(*) as total_movements
          FROM stock_movements
          LIMIT 1;
        `);
        console.log(`✅ Stock movements query: ${movements.rows[0].total_movements} movements found`);
      } catch (err) {
        console.log(`❌ Stock movements query failed: ${err.message}`);
      }
    }

    console.log('\n✅ Database check complete!\n');

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkInventoryTables();
