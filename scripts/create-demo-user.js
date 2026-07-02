const bcrypt = require('bcryptjs');
const db = require('../models');

async function createDemoUser() {
  try {
    // Check if demo user already exists
    const existingUser = await db.User.findOne({
      where: { email: 'demo@bedagang.com' }
    });

    if (existingUser) {
      console.log('✅ Demo user already exists!');
      console.log('Email: demo@bedagang.com');
      console.log('Password: demo123');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('demo123', 10);

    // Create demo user
    const demoUser = await db.User.create({
      name: 'Demo User',
      email: 'demo@bedagang.com',
      phone: '08123456789',
      businessName: 'Demo Store',
      password: hashedPassword,
      role: 'owner',
      isActive: true,
    });

    console.log('✅ Demo user created successfully!');
    console.log('Email: demo@bedagang.com');
    console.log('Password: demo123');
    console.log('User ID:', demoUser.id);
  } catch (error) {
    console.error('❌ Error creating demo user:', error.message);
    
    if (error.message.includes('relation "users" does not exist')) {
      console.log('\n⚠️  Please run database migration first:');
      console.log('   npm run db:migrate');
    }
  } finally {
    await db.sequelize.close();
  }
}

createDemoUser();
