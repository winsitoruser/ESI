require('dotenv').config({ path: '/opt/bedagang/.env' });
const { Sequelize } = require('sequelize');
const sq = new Sequelize(process.env.DATABASE_URL, { logging: console.log });

async function run() {
  console.log('=== DATABASE DIAGNOSTIC ===\n');
  
  // 1. Check total tables
  const [tables] = await sq.query(
    "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
    { type: Sequelize.QueryTypes.SELECT }
  );
  console.log(`Total tables in public schema: ${tables.length}`);
  const tableNames = tables.map(t => t.table_name.toLowerCase());
  
  // 2. Check for tables we care about
  const checkTables = [
    'notifications', 'webhooks', 'webhook_logs', 'webhook_subscriptions', 
    'notification_settings', 'integration_webhooks', 'dashboard_notifications',
    'users', 'tenants', 'sequelizemeta'
  ];
  
  console.log('\n=== TABLE STATUS ===');
  for (const t of checkTables) {
    const exists = tableNames.includes(t.toLowerCase()) ? 'EXISTS' : 'MISSING';
    console.log(`  ${t}: ${exists}`);
  }
  
  // 3. Create notifications table if missing
  if (!tableNames.includes('notifications')) {
    console.log('\n=== CREATING notifications TABLE ===');
    try {
      await sq.query(`
        CREATE TABLE IF NOT EXISTS "notifications" (
          "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          "tenant_id" UUID,
          "user_id" INTEGER NOT NULL,
          "title" VARCHAR(500) NOT NULL,
          "message" TEXT,
          "type" VARCHAR(50) NOT NULL DEFAULT 'info',
          "category" VARCHAR(50),
          "data" JSONB,
          "reference_type" VARCHAR(100),
          "reference_id" VARCHAR(255),
          "is_read" BOOLEAN DEFAULT false,
          "read_at" TIMESTAMPTZ,
          "created_at" TIMESTAMPTZ DEFAULT NOW(),
          "updated_at" TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      console.log('  notifications table created');
      
      // Add indexes
      await sq.query('CREATE INDEX IF NOT EXISTS notifications_user_id_is_read_idx ON "notifications"("user_id", "is_read")');
      await sq.query('CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx ON "notifications"("user_id", "created_at")');
      await sq.query('CREATE INDEX IF NOT EXISTS notifications_tenant_id_idx ON "notifications"("tenant_id")');
      await sq.query('CREATE INDEX IF NOT EXISTS notifications_category_idx ON "notifications"("category")');
      await sq.query('CREATE INDEX IF NOT EXISTS notifications_ref_idx ON "notifications"("reference_type", "reference_id")');
      await sq.query('CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON "notifications"("created_at")');
      console.log('  Indexes created');
    } catch (e) {
      console.log('  Error creating notifications:', e.message);
    }
  } else {
    console.log('\n=== notifications table already exists ===');
  }
  
  // 4. Check SequelizeMeta
  try {
    const [meta] = await sq.query(
      'SELECT name FROM "SequelizeMeta" ORDER BY name',
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log(`\n=== SEQUELIZEMETA: ${meta.length} migrations ===`);
    if (meta.length > 0) {
      console.log('  Latest:', meta[meta.length - 1].name);
    }
  } catch (e) {
    console.log('\n=== SequelizeMeta check error:', e.message);
  }
  
  // 5. Check test user
  try {
    const [users] = await sq.query(
      "SELECT id, email, role, name FROM users WHERE email='admin@bedagang.com'",
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log(`\n=== TEST USER: admin@bedagang.com ===`);
    if (users.length > 0) {
      console.log('  EXISTS:', JSON.stringify(users[0], null, 2));
    } else {
      console.log('  NOT FOUND');
      
      // Also check for other test users
      const [allAdmins] = await sq.query(
        "SELECT id, email, role, name FROM users WHERE role IN ('super_admin', 'admin') LIMIT 5",
        { type: Sequelize.QueryTypes.SELECT }
      );
      console.log('\n  Available admins:');
      for (const u of allAdmins) {
        console.log(`    - ${u.email} (${u.role})`);
      }
    }
  } catch (e) {
    console.log('\n=== Users check error:', e.message);
  }
  
  // 6. Re-check all tables after fixes
  const [tables2] = await sq.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
    { type: Sequelize.QueryTypes.SELECT }
  );
  const tableNames2 = tables2.map(t => t.table_name.toLowerCase());
  console.log(`\n=== FINAL TABLE COUNT: ${tables2.length} ===`);
  
  const finalCheck = ['notifications', 'webhooks', 'webhook_logs', 'notification_settings'];
  console.log('\n=== FINAL STATUS ===');
  for (const t of finalCheck) {
    console.log(`  ${t}: ${tableNames2.includes(t.toLowerCase()) ? 'OK' : 'MISSING'}`);
  }
  
  await sq.close();
  console.log('\nDone.');
}

run().catch(e => { 
  console.error('FATAL:', e.message); 
  process.exit(1); 
});
