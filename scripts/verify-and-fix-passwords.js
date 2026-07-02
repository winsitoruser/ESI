// Script to verify and fix all user passwords
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

async function verifyAndFixPasswords() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected successfully\n');

    let bcrypt;
    try {
      bcrypt = require('bcryptjs');
    } catch (e) {
      bcrypt = require('bcrypt');
    }

    // Get all users
    const [users] = await sequelize.query(`
      SELECT id, name, email, role, password
      FROM users
      ORDER BY id
    `);

    console.log(`Found ${users.length} users\n`);
    console.log('Testing and fixing passwords...\n');

    const passwordMap = {
      'superadmin@bedagang.com': 'admin123',
      'admin@bedagang.com': 'admin123',
      'owner@bedagang.com': 'owner123',
      'manager@bedagang.com': 'manager123',
      'cashier@bedagang.com': 'cashier123',
      'staff@bedagang.com': 'staff123',
      'demo@bedagang.com': 'password123',
      'user@bedagang.com': 'password123'
    };

    for (const user of users) {
      const expectedPassword = passwordMap[user.email] || 'password123';
      
      console.log(`Testing: ${user.email}`);
      console.log(`  Expected password: ${expectedPassword}`);
      
      // Test current password
      let isValid = false;
      try {
        isValid = await bcrypt.compare(expectedPassword, user.password);
      } catch (e) {
        console.log(`  ❌ Error testing password: ${e.message}`);
      }

      if (isValid) {
        console.log(`  ✅ Password is correct`);
      } else {
        console.log(`  ⚠️  Password incorrect, fixing...`);
        
        // Generate new hash
        const newHash = await bcrypt.hash(expectedPassword, 10);
        
        // Update password
        await sequelize.query(`
          UPDATE users 
          SET password = :password
          WHERE email = :email
        `, {
          replacements: { 
            password: newHash,
            email: user.email
          }
        });
        
        // Verify the fix
        const [updated] = await sequelize.query(`
          SELECT password FROM users WHERE email = :email
        `, {
          replacements: { email: user.email }
        });
        
        const verifyFixed = await bcrypt.compare(expectedPassword, updated[0].password);
        
        if (verifyFixed) {
          console.log(`  ✅ Password fixed and verified`);
        } else {
          console.log(`  ❌ Failed to fix password`);
        }
      }
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    FINAL LOGIN CREDENTIALS                    ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('1. SUPER ADMIN');
    console.log('   Email: superadmin@bedagang.com');
    console.log('   Password: admin123\n');

    console.log('2. ADMIN');
    console.log('   Email: admin@bedagang.com');
    console.log('   Password: admin123\n');

    console.log('3. OWNER');
    console.log('   Email: owner@bedagang.com');
    console.log('   Password: owner123\n');

    console.log('4. MANAGER');
    console.log('   Email: manager@bedagang.com');
    console.log('   Password: manager123\n');

    console.log('5. CASHIER');
    console.log('   Email: cashier@bedagang.com');
    console.log('   Password: cashier123\n');

    console.log('6. STAFF');
    console.log('   Email: staff@bedagang.com');
    console.log('   Password: staff123\n');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n🌐 Login URL: http://localhost:3001/auth/login');
    console.log('\n✅ All passwords have been verified and fixed!');
    console.log('🔑 Please try logging in again with the credentials above.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

verifyAndFixPasswords();
