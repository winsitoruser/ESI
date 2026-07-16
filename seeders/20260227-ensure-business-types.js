'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const businessTypes = [
      {
        id: require('uuid').v4(),
        code: 'fine_dining',
        name: 'Fine Dining',
        description: 'Restoran mewah dengan layanan lengkap dan menu premium',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: require('uuid').v4(),
        code: 'cloud_kitchen',
        name: 'Cloud Kitchen',
        description: 'Dapur virtual untuk delivery dan takeaway',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: require('uuid').v4(),
        code: 'qsr',
        name: 'Quick Service Restaurant',
        description: 'Restoran cepat saji dengan layanan counter',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: require('uuid').v4(),
        code: 'cafe',
        name: 'Cafe',
        description: 'Kafe dengan menu minuman dan makanan ringan',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: require('uuid').v4(),
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
      await queryInterface.sequelize.query(`
        INSERT INTO business_types (id, code, name, description, is_active, created_at, updated_at)
        VALUES (:id, :code, :name, :description, :is_active, :created_at, :updated_at)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          updated_at = EXCLUDED.updated_at
      `, {
        replacements: bt
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('business_types', {
      code: ['fine_dining', 'cloud_kitchen', 'qsr', 'cafe', 'retail']
    }, {});
  }
};
