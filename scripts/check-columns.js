const db = require('../models');

async function checkColumns() {
  try {
    console.log('Checking products table structure...\n');
    
    const [results] = await db.sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'products'
      ORDER BY ordinal_position;
    `);
    
    console.log('Columns in products table:');
    results.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Get actual product data
    console.log('\nActual product data (raw query):');
    const [products] = await db.sequelize.query(`
      SELECT id, name, sku, sell_price, buy_price, stock_quantity, minimum_stock, is_active
      FROM products
      LIMIT 3;
    `);
    
    console.log(JSON.stringify(products, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkColumns();
