'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add partner_id to tenants table
    await queryInterface.addColumn('tenants', 'partner_id', {
      type: Sequelize.UUID,
      references: {
        model: 'partners',
        key: 'id'
      },
      onDelete: 'SET NULL',
      allowNull: true
    });

    // 2. Add index for performance
    await queryInterface.addIndex('tenants', ['partner_id'], {
      name: 'idx_tenants_partner'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('tenants', 'idx_tenants_partner');
    await queryInterface.removeColumn('tenants', 'partner_id');
  }
};
