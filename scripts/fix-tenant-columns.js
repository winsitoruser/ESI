require('dotenv').config({ path: '.env.development' });
const sequelize = require('../lib/sequelize');

async function run() {
  try {
    const [cols] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='tenants'"
    );
    const existing = new Set(cols.map(c => c.column_name));
    console.log('Existing:', [...existing].join(', '));

    const additions = [
      { col: 'name', sql: "ALTER TABLE tenants ADD COLUMN name VARCHAR(255)" },
      { col: 'code', sql: "ALTER TABLE tenants ADD COLUMN code VARCHAR(50) UNIQUE" },
      { col: 'status', sql: "ALTER TABLE tenants ADD COLUMN status VARCHAR(20) DEFAULT 'trial'" },
      { col: 'subscription_plan', sql: "ALTER TABLE tenants ADD COLUMN subscription_plan VARCHAR(50)" },
      { col: 'subscription_start', sql: "ALTER TABLE tenants ADD COLUMN subscription_start TIMESTAMP" },
      { col: 'subscription_end', sql: "ALTER TABLE tenants ADD COLUMN subscription_end TIMESTAMP" },
      { col: 'max_users', sql: "ALTER TABLE tenants ADD COLUMN max_users INTEGER DEFAULT 5" },
      { col: 'max_branches', sql: "ALTER TABLE tenants ADD COLUMN max_branches INTEGER DEFAULT 1" },
      { col: 'contact_name', sql: "ALTER TABLE tenants ADD COLUMN contact_name VARCHAR(255)" },
      { col: 'contact_email', sql: "ALTER TABLE tenants ADD COLUMN contact_email VARCHAR(255)" },
      { col: 'contact_phone', sql: "ALTER TABLE tenants ADD COLUMN contact_phone VARCHAR(20)" },
      { col: 'address', sql: "ALTER TABLE tenants ADD COLUMN address TEXT" },
      { col: 'city', sql: "ALTER TABLE tenants ADD COLUMN city VARCHAR(100)" },
      { col: 'province', sql: "ALTER TABLE tenants ADD COLUMN province VARCHAR(100)" },
      { col: 'postal_code', sql: "ALTER TABLE tenants ADD COLUMN postal_code VARCHAR(10)" },
      { col: 'settings', sql: "ALTER TABLE tenants ADD COLUMN settings JSON DEFAULT '{}'" },
      { col: 'is_active', sql: "ALTER TABLE tenants ADD COLUMN is_active BOOLEAN DEFAULT true" },
    ];

    let added = 0;
    for (const { col, sql } of additions) {
      if (!existing.has(col)) {
        await sequelize.query(sql);
        console.log('+ Added:', col);
        added++;
      }
    }

    // Backfill name from business_name where null
    await sequelize.query("UPDATE tenants SET name = business_name WHERE name IS NULL AND business_name IS NOT NULL");

    console.log(`\nDone. Added ${added} columns.`);
    await sequelize.close();
    process.exit(0);
  } catch (e) {
    console.error('Failed:', e.message);
    await sequelize.close();
    process.exit(1);
  }
}
run();
