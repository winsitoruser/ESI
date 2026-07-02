'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const businessTypes = [
      {
        code: 'fine_dining',
        name: 'Fine Dining',
        description: 'Restoran mewah dengan layanan lengkap dan menu premium',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'cloud_kitchen',
        name: 'Cloud Kitchen',
        description: 'Dapur virtual untuk delivery dan takeaway',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'qsr',
        name: 'Quick Service Restaurant',
        description: 'Restoran cepat saji dengan layanan counter',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'cafe',
        name: 'Cafe',
        description: 'Kafe dengan menu minuman dan makanan ringan',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'retail',
        name: 'Retail',
        description: 'Toko retail umum',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    // Use upsert to avoid duplicates
    for (const bt of businessTypes) {
      await queryInterface.bulkInsert('business_types', [bt], {
        updateOnDuplicate: ['name', 'description', 'is_active', 'updated_at']
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('business_types', {
      code: ['fine_dining', 'cloud_kitchen', 'qsr', 'cafe', 'retail']
    }, {});
  }
};
