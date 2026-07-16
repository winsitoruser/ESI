'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Hash password for master account
    const hashedPassword = await bcrypt.hash('MasterAdmin2026!', 10);

    // Skip if master account already exists
    const existing = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = :email LIMIT 1`,
      { replacements: { email: 'superadmin@bedagang.com' }, type: Sequelize.QueryTypes.SELECT }
    );

    if (existing.length === 0) {
      await queryInterface.bulkInsert('users', [{
        id: 999999, // Use high ID to avoid conflicts
        name: 'Super Administrator',
        email: 'superadmin@bedagang.com',
        phone: '+62-MASTER-ADMIN',
        businessName: 'System Administrator',
        password: hashedPassword,
        role: 'super_admin',
        isActive: true,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }]);

      console.log('✅ Master account created successfully!');
      console.log('📧 Email: superadmin@bedagang.com');
      console.log('🔑 Password: MasterAdmin2026!');
      console.log('⚠️  IMPORTANT: Change this password after first login!');
    } else {
      console.log('Master account already exists, skipping insert');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', {
      email: 'superadmin@bedagang.com'
    });
  }
};
