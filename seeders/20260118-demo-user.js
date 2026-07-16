const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    // Insert only if demo user doesn't already exist
    const existing = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = :email LIMIT 1`,
      { replacements: { email: 'demo@bedagang.com' }, type: Sequelize.QueryTypes.SELECT }
    );

    if (existing.length === 0) {
      await queryInterface.bulkInsert('users', [
        {
          name: 'Demo User',
          email: 'demo@bedagang.com',
          phone: '08123456789',
          businessName: 'Demo Store',
          password: hashedPassword,
          role: 'owner',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ], {});
    } else {
      console.log('Demo user already exists, skipping insert');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', {
      email: 'demo@bedagang.com'
    }, {});
  }
};
