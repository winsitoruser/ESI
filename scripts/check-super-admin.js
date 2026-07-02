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
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: false
  }
);

async function checkSuperAdmin() {
  try {
    console.log('Checking for super admin users...\n');
    
    const [users] = await sequelize.query(`
      SELECT id, name, email, role, tenant_id, "createdAt"
      FROM users 
      WHERE email IN ('superadmin@bedagang.com', 'winsitoruser@gmail.com')
      ORDER BY "createdAt"
    `);
    
    if (users.length === 0) {
      console.log('❌ No super admin users found!');
      console.log('\nAvailable users with super_admin role:');
      
      const [allAdmins] = await sequelize.query(`
        SELECT id, name, email, role, tenant_id
        FROM users 
        WHERE role = 'super_admin'
        ORDER BY created_at
      `);
      
      allAdmins.forEach(user => {
        console.log(`  - ${user.email} (${user.name})`);
      });
    } else {
      console.log('Found users:');
      users.forEach(user => {
        console.log(`\n📧 Email: ${user.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Tenant ID: ${user.tenant_id || 'NULL (Super Admin)'}`);
        console.log(`   Created: ${user.createdAt}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

checkSuperAdmin();
