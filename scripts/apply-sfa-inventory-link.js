/**
 * Run ONLY the SFA-inventory-link migration (safe, idempotent).
 * Usage: node scripts/apply-sfa-inventory-link.js
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.development' });
require('dotenv').config();

const { Sequelize } = require('sequelize');
const path = require('path');
const migration = require(path.resolve(__dirname, '..', 'migrations', '20260419-sfa-sales-inventory-link.js'));

const sequelize = new Sequelize(
  process.env.DB_NAME || 'farmanesia_dev',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  },
);

(async () => {
  try {
    const q = sequelize.getQueryInterface();

    // Verify base SFA table exists before marking migration as applied.
    const tables = await q.showAllTables();
    const names = tables.map((t) => (typeof t === 'string' ? t : t.tableName));
    if (!names.includes('sfa_sales_entries')) {
      console.log('ℹ️  Base table sfa_sales_entries not found — run the main migration first.');
      // Remove any stale SequelizeMeta entry so it can be retried later
      await sequelize.query(`DELETE FROM "SequelizeMeta" WHERE "name" = '20260419-sfa-sales-inventory-link.js'`);
      process.exit(0);
    }

    await migration.up(q, Sequelize);

    await sequelize.query(
      `INSERT INTO "SequelizeMeta"("name") VALUES ('20260419-sfa-sales-inventory-link.js')
       ON CONFLICT ("name") DO NOTHING`,
    );
    console.log('✅ Migration 20260419-sfa-sales-inventory-link applied successfully.');
    process.exit(0);
  } catch (e) {
    if (/already exists/i.test(e.message) || /duplicate column/i.test(e.message)) {
      console.log('ℹ️  Migration already applied:', e.message.split('\n')[0]);
      process.exit(0);
    }
    console.error('❌ Migration failed:', e.message);
    process.exit(1);
  }
})();
