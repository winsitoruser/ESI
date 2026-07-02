'use strict';

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Hash password for master account
    const hashedPassword = await bcrypt.hash('MasterAdmin2026!', 10);

    await queryInterface.bulkInsert('users', [{
      id: 999999, // Use high ID to avoid conflicts
      name: 'Super Administrator',
      email: 'superadmin@bedagang.com',
      phone: '+62-MASTER-ADMIN',
      business_name: 'System Administrator',
      password: hashedPassword,
      role: 'super_admin',
      tenant_id: null, // Super admin not tied to any tenant
      is_active: true,
      last_login: null,
      created_at: new Date(),
      updated_at: new Date()
    }]);

    console.log('✅ Master account created successfully!');
    console.log('📧 Email: superadmin@bedagang.com');
    console.log('🔑 Password: MasterAdmin2026!');
    console.log('⚠️  IMPORTANT: Change this password after first login!');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', {
      email: 'superadmin@bedagang.com'
    });
  }
};
