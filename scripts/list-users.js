// Script to list all users in database
const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    logging: false
  }
);

async function listUsers() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected successfully\n');

    // Get all users
    const [users] = await sequelize.query(`
      SELECT id, name, email, role, tenant_id, is_active, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 20
    `);

    if (users.length === 0) {
      console.log('❌ No users found in database');
      console.log('\nYou need to create a user first.');
      console.log('Run: npm run seed (if you have seeders)');
    } else {
      console.log(`✅ Found ${users.length} users:\n`);
      console.table(users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role || 'N/A',
        tenant_id: u.tenant_id || 'NULL',
        is_active: u.is_active
      })));

      console.log('\n📝 To login, use one of the emails above.');
      console.log('⚠️  Note: You need to know the password for that user.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

listUsers();
