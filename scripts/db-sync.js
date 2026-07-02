/**
 * Database Sync Script
 * Creates all missing tables via Sequelize.sync({alter: true})
 * Run: NODE_ENV=production node scripts/db-sync.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
process.env.NODE_ENV = 'production';

const db = require('../models');

async function syncDatabase() {
  console.log('Starting database sync (alter: true)...');
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Database: ${process.env.DB_NAME}`);
  console.log(`User: ${process.env.DB_USER}`);
  console.log(`Host: ${process.env.DB_HOST}`);

  try {
    // Test connection first
    await db.sequelize.authenticate();
    console.log('✓ Database connection established');

    // Sync all models with alter:true to create missing tables
    // This will create tables that don't exist and add missing columns
    await db.sequelize.sync({ alter: true });
    console.log('✓ All tables synced successfully');

    // Verify tables were created by checking count
    const tables = await db.sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name",
      { type: db.sequelize.QueryTypes.SELECT }
    );
    console.log(`\nTotal tables in database: ${tables.length}`);
    console.log('Tables:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));

    process.exit(0);
  } catch (error) {
    console.error('✗ Sync failed:', error.message);
    if (error.parent) {
      console.error('  SQL Error:', error.parent.message);
    }
    process.exit(1);
  }
}

syncDatabase();
