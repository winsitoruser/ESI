/**
 * Database Sync Script
 * Syncs all Sequelize models to PostgreSQL database
 */

const db = require('../models');

async function syncDatabase() {
  try {
    console.log('🔄 Starting database sync...');
    console.log('Database:', process.env.DB_NAME || 'bedagang_dev');
    
    // Sync all models with alter: true to update existing tables
    await db.sequelize.sync({ alter: true });
    
    console.log('✅ Database synchronized successfully!');
    console.log('📊 Models synced:', Object.keys(db).filter(k => k !== 'sequelize' && k !== 'Sequelize').length);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database sync failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

syncDatabase();
