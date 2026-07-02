/**
 * Sync Stock Table Only
 * Creates or updates the stocks table in PostgreSQL
 */

const db = require('../models');

async function syncStockTable() {
  try {
    console.log('🔄 Syncing Stock table...');
    console.log('Database:', process.env.DB_NAME || 'bedagang_dev');
    
    // Sync only Stock model
    await db.Stock.sync({ alter: true });
    
    console.log('✅ Stock table synchronized successfully!');
    
    // Test query
    const count = await db.Stock.count();
    console.log('📊 Current stock records:', count);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Stock table sync failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

syncStockTable();
