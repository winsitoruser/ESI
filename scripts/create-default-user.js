const bcrypt = require('bcryptjs');
const db = require('../models');

async function createDefaultUser() {
  try {
    console.log('Creating default user...');
    
    // Check if user already exists
    const existingUser = await db.User.findOne({
      where: { email: 'admin@bedagang.com' }
    });

    if (existingUser) {
      console.log('Default user already exists!');
      console.log('Email:', existingUser.email);
      console.log('Role:', existingUser.role);
      console.log('Active:', existingUser.isActive);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create default admin user
    const user = await db.User.create({
      name: 'Administrator',
      email: 'admin@bedagang.com',
      password: hashedPassword,
      role: 'admin',
      businessName: 'Bedagang POS',
      isActive: true,
      phone: '08123456789'
    });

    console.log('✓ Default user created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('  Email: admin@bedagang.com');
    console.log('  Password: admin123');
    console.log('');
    console.log('User details:');
    console.log('  ID:', user.id);
    console.log('  Name:', user.name);
    console.log('  Role:', user.role);
    console.log('  Business:', user.businessName);
    
  } catch (error) {
    console.error('Error creating default user:', error);
    throw error;
  } finally {
    await db.sequelize.close();
  }
}

createDefaultUser();
