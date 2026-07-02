require('dotenv').config({ path: '/opt/bedagang/.env' });
const { Sequelize } = require('sequelize');
const sq = new Sequelize(process.env.DATABASE_URL, { logging: false });

async function run() {
  // Check tables count
  const [tables] = await sq.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'", { type: Sequelize.QueryTypes.SELECT });
  console.log('Total tables:', tables.length);
  
  const tableNames = tables.map(t => t.table_name).sort();
  
  // Check notification tables
  const notifTables = tableNames.filter(t => t.toLowerCase().includes('notification'));
  console.log('\nNotification tables:', JSON.stringify(notifTables, null, 2));
  
  // Check webhook tables
  const webhookTables = tableNames.filter(t => t.toLowerCase().includes('webhook'));
  console.log('\nWebhook tables:', JSON.stringify(webhookTables, null, 2));
  
  // Check SequelizeMeta
  try {
    const [meta] = await sq.query('SELECT name FROM "SequelizeMeta" ORDER BY name', { type: Sequelize.QueryTypes.SELECT });
    console.log('\nMigrations in SequelizeMeta:', meta.length);
  } catch(e) {
    console.log('\nSequelizeMeta error:', e.message);
  }
  
  // Check users table for test user
  try {
    const [users] = await sq.query("SELECT id, email, role FROM users WHERE email='admin@bedagang.com'", { type: Sequelize.QueryTypes.SELECT });
    console.log('\nTest user admin@bedagang.com:', users.length > 0 ? 'EXISTS' : 'NOT FOUND');
    if (users.length > 0) {
      console.log('User details:', JSON.stringify(users[0], null, 2));
    }
  } catch(e) {
    console.log('\nUsers query error:', e.message);
  }
  
  await sq.close();
}
run().catch(e => { console.error(e.message); process.exit(1); });
