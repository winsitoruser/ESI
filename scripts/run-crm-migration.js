const sequelize = require('../lib/sequelize');
const { Sequelize } = require('sequelize');

async function runCrmMigration() {
  try {
    console.log('🚀 Running CRM migration...\n');
    await sequelize.authenticate();
    console.log('✓ Database connection established\n');

    const migration = require('../migrations/20260301-create-crm-tables');
    const queryInterface = sequelize.getQueryInterface();

    await migration.up(queryInterface, Sequelize);

    // Verify tables
    console.log('\n🔍 Verifying CRM tables...');
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'crm_%'
      ORDER BY table_name
    `);

    console.log(`\n✅ Found ${tables.length} CRM tables:`);
    tables.forEach(t => console.log(`  • ${t.table_name}`));

    console.log('\n✅ CRM migration completed successfully!');
  } catch (error) {
    console.error('❌ CRM Migration failed:', error.message);
    if (error.message?.includes('already exists')) {
      console.log('ℹ️  Tables already exist — this is OK.');
    } else {
      console.error(error);
    }
  } finally {
    await sequelize.close();
  }
}

runCrmMigration();
