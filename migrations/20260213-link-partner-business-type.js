'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add business_type_id to partners table
    await queryInterface.addColumn('partners', 'business_type_id', {
      type: Sequelize.UUID,
      references: {
        model: 'business_types',
        key: 'id'
      },
      onDelete: 'SET NULL',
      allowNull: true
    });

    // 2. Migrate existing businessType string to business_type_id
    // Map common business types to our new business_type_id
    const businessTypes = await queryInterface.sequelize.query(
      `SELECT id, code FROM business_types`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    // Create a mapping
    const typeMap = {
      'retail': businessTypes.find(bt => bt.code === 'retail')?.id,
      'fnb': businessTypes.find(bt => bt.code === 'fnb')?.id,
      'restaurant': businessTypes.find(bt => bt.code === 'fnb')?.id,
      'cafe': businessTypes.find(bt => bt.code === 'fnb')?.id,
      'food': businessTypes.find(bt => bt.code === 'fnb')?.id,
      'toko': businessTypes.find(bt => bt.code === 'retail')?.id,
      'minimarket': businessTypes.find(bt => bt.code === 'retail')?.id,
      'hybrid': businessTypes.find(bt => bt.code === 'hybrid')?.id
    };

    // Update partners with matching business types
    for (const [oldType, newId] of Object.entries(typeMap)) {
      if (newId) {
        await queryInterface.sequelize.query(
          `UPDATE partners SET business_type_id = :newId WHERE LOWER(business_type) = :oldType`,
          {
            replacements: { newId, oldType: oldType.toLowerCase() }
          }
        );
      }
    }

    // Set default to retail for any remaining null values
    const retailId = businessTypes.find(bt => bt.code === 'retail')?.id;
    if (retailId) {
      await queryInterface.sequelize.query(
        `UPDATE partners SET business_type_id = :retailId WHERE business_type_id IS NULL`,
        { replacements: { retailId } }
      );
    }

    // 3. Add index for performance
    await queryInterface.addIndex('partners', ['business_type_id'], {
      name: 'idx_partners_business_type'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('partners', 'idx_partners_business_type');
    await queryInterface.removeColumn('partners', 'business_type_id');
  }
};
