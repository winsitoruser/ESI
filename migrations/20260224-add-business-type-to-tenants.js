'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('tenants');
    
    if (!tableDescription.business_type_id) {
      await queryInterface.addColumn('tenants', 'business_type_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'business_types',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });

      await queryInterface.addIndex('tenants', ['business_type_id'], {
        name: 'tenants_business_type_id_idx'
      });
    }

    // Add other missing columns from Tenant model
    if (!tableDescription.business_name) {
      await queryInterface.addColumn('tenants', 'business_name', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    }

    if (!tableDescription.business_address) {
      await queryInterface.addColumn('tenants', 'business_address', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!tableDescription.business_phone) {
      await queryInterface.addColumn('tenants', 'business_phone', {
        type: Sequelize.STRING(50),
        allowNull: true
      });
    }

    if (!tableDescription.business_email) {
      await queryInterface.addColumn('tenants', 'business_email', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    }

    if (!tableDescription.setup_completed) {
      await queryInterface.addColumn('tenants', 'setup_completed', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
    }

    if (!tableDescription.onboarding_step) {
      await queryInterface.addColumn('tenants', 'onboarding_step', {
        type: Sequelize.INTEGER,
        defaultValue: 0
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('tenants', 'business_type_id');
    await queryInterface.removeColumn('tenants', 'business_name');
    await queryInterface.removeColumn('tenants', 'business_address');
    await queryInterface.removeColumn('tenants', 'business_phone');
    await queryInterface.removeColumn('tenants', 'business_email');
    await queryInterface.removeColumn('tenants', 'setup_completed');
    await queryInterface.removeColumn('tenants', 'onboarding_step');
  }
};
