const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'farmanesia_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function createAdminSuperUser() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Creating Super Admin User: admin@bedagang.com...\n');

    // 1. Check if user already exists
    const existingUser = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      ['admin@bedagang.com']
    );

    if (existingUser.rows.length > 0) {
      console.log('✅ User already exists! Updating to super_admin...');
      await client.query(
        'UPDATE users SET role = $1, "isActive" = $2, "updatedAt" = NOW() WHERE email = $3',
        ['super_admin', true, 'admin@bedagang.com']
      );
      console.log('✅ User updated to super_admin role');
    } else {
      // 2. Create new user
      console.log('Creating new user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await client.query(
        `INSERT INTO users (name, email, password, role, "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        ['Super Admin', 'admin@bedagang.com', hashedPassword, 'super_admin', true]
      );
      console.log('✅ User created successfully');
    }

    // 3. Get all modules
    console.log('\n📋 Checking modules...');
    const modulesResult = await client.query('SELECT id, name, code FROM modules ORDER BY name');
    const allModules = modulesResult.rows;

    // 4. Get final user info
    const finalUser = await client.query(
      'SELECT id, email, name, role, "isActive" FROM users WHERE email = $1',
      ['admin@bedagang.com']
    );
    const user = finalUser.rows[0];

    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SUPER ADMIN USER CREATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📝 USER DETAILS:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Status: ${user.isActive ? 'Active ✅' : 'Inactive ❌'}`);
    console.log('\n🔑 ACCESS LEVEL: SUPER ADMIN');
    
    if (allModules.length > 0) {
      console.log(`\n📋 AVAILABLE MODULES (${allModules.length}):`);
      allModules.forEach(module => {
        console.log(`   ✓ ${module.name} (${module.code})`);
      });
    }
    
    console.log('\n🌐 FULL ACCESS TO:');
    console.log('   ✓ Finance Module');
    console.log('   ✓ Inventory Module');
    console.log('   ✓ HRIS Module');
    console.log('   ✓ Fleet Module');
    console.log('   ✓ Reports Module');
    console.log('   ✓ Branches Module');
    console.log('   ✓ All Admin Features');
    console.log('\n🚀 LOGIN AT:');
    console.log('   http://localhost:3001/auth/login');
    console.log('   http://localhost:3001/admin/login');
    console.log('\n💡 LOGIN CREDENTIALS:');
    console.log('   Email: admin@bedagang.com');
    console.log('   Password: admin123');
    console.log('='.repeat(60));

    await client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await client.release();
    await pool.end();
    process.exit(1);
  }
}

createAdminSuperUser();
