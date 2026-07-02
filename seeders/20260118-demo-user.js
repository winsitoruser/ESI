const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', {
      email: 'demo@bedagang.com'
    }, {});
  }
};
