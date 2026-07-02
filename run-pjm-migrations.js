const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.development' });
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bedagang_dev',
  dialect: 'postgres',
  logging: console.log,
};

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: config.logging,
});

async function runPjmMigrations() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected successfully');

    // Read and run the first migration
    const migration1 = require('./migrations/20260220-create-project-management-tables.js');
    console.log('\nRunning 20260220-create-project-management-tables...');
    await migration1.up(sequelize.getQueryInterface(), Sequelize);
    console.log('✅ 20260220-create-project-management-tables completed');

    // Read and run the second migration
    const migration2 = require('./migrations/20260418-enhance-project-management.js');
    console.log('\nRunning 20260418-enhance-project-management...');
    await migration2.up(sequelize.getQueryInterface(), Sequelize);
    console.log('✅ 20260418-enhance-project-management completed');

    // Verify tables exist
    const [tables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'pjm_%'"
    );
    console.log('\n📋 PJM tables created:');
    tables.forEach(t => console.log('  -', t.table_name));

    await sequelize.close();
    console.log('\n✅ All PJM migrations completed successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runPjmMigrations();
