// Script to list all users in database (simple version)
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

    // Get all users with only columns that exist
    const [users] = await sequelize.query(`
      SELECT id, name, email, role, tenant_id
      FROM users
      ORDER BY id
      LIMIT 20
    `);

    if (users.length === 0) {
      console.log('❌ No users found in database\n');
      console.log('You need to register a user first or run seeders.');
    } else {
      console.log(`✅ Found ${users.length} user(s):\n`);
      users.forEach((u, i) => {
        console.log(`${i + 1}. ${u.name}`);
        console.log(`   Email: ${u.email}`);
        console.log(`   Role: ${u.role || 'N/A'}`);
        console.log(`   Tenant ID: ${u.tenant_id || 'NULL'}`);
        console.log('');
      });

      console.log('📝 To login, use one of the emails above with the correct password.');
      console.log('\n💡 If you forgot the password, you can:');
      console.log('   1. Register a new account');
      console.log('   2. Or reset password in database directly');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

listUsers();
