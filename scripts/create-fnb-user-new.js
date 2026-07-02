const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '',
  database: 'bedagang_db'
});

async function createFnbUser() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creating/Updating F&B user...\n');
    
    const email = 'winsitoruser@gmail.com';
    const password = 'winsitor123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if user exists
    const checkResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (checkResult.rows.length > 0) {
      // Update existing user
      await client.query(
        `UPDATE users 
         SET password = $1, updated_at = NOW()
         WHERE email = $2`,
        [hashedPassword, email]
      );
      console.log('✅ Password updated for existing user!');
    } else {
      // Create new user
      await client.query(
        `INSERT INTO users 
         (name, email, password, role, isActive, businessName, createdAt, updatedAt)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        ['Winsitor F&B User', email, hashedPassword, 'user', true, 'Winsitor Restaurant']
      );
      console.log('✅ New user created!');
    }
    
    console.log('\n📝 Login Credentials:');
    console.log('   URL: http://localhost:3001/auth/login');
    console.log('   Email: winsitoruser@gmail.com');
    console.log('   Password: winsitor123');
    console.log('\n🎯 After login, you will be redirected to F&B Dashboard');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createFnbUser();
