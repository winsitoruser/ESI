'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('branches');
    
    // Add tenant_id column
    if (!tableDescription.tenant_id) {
      await queryInterface.addColumn('branches', 'tenant_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });

      await queryInterface.addIndex('branches', ['tenant_id'], {
        name: 'branches_tenant_id_idx'
      });
    }

    // Add region column
    if (!tableDescription.region) {
      await queryInterface.addColumn('branches', 'region', {
        type: Sequelize.STRING(100),
        allowNull: true
      });

      await queryInterface.addIndex('branches', ['region'], {
        name: 'branches_region_idx'
      });
    }

    // Add last_sync_at column for sync tracking
    if (!tableDescription.last_sync_at) {
      await queryInterface.addColumn('branches', 'last_sync_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    // Add sync_status column
    if (!tableDescription.sync_status) {
      await queryInterface.addColumn('branches', 'sync_status', {
        type: Sequelize.ENUM('synced', 'pending', 'failed', 'never'),
        defaultValue: 'never'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('branches', 'tenant_id');
    await queryInterface.removeColumn('branches', 'region');
    await queryInterface.removeColumn('branches', 'last_sync_at');
    await queryInterface.removeColumn('branches', 'sync_status');
  }
};
