'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('tenants');
    
    // Add name column (for display purposes)
    if (!tableDescription.name) {
      await queryInterface.addColumn('tenants', 'name', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
      
      // Copy business_name to name if exists
      await queryInterface.sequelize.query(`
        UPDATE tenants SET name = business_name WHERE name IS NULL
      `);
    }

    // Add code column (unique identifier)
    if (!tableDescription.code) {
      await queryInterface.addColumn('tenants', 'code', {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true
      });

      await queryInterface.addIndex('tenants', ['code'], {
        name: 'tenants_code_unique_idx',
        unique: true
      });
    }

    // Add status column
    if (!tableDescription.status) {
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE enum_tenants_status AS ENUM('active', 'inactive', 'suspended', 'trial');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      await queryInterface.addColumn('tenants', 'status', {
        type: Sequelize.ENUM('active', 'inactive', 'suspended', 'trial'),
        defaultValue: 'trial'
      });

      await queryInterface.addIndex('tenants', ['status'], {
        name: 'tenants_status_idx'
      });
    }

    // Add subscription fields
    if (!tableDescription.subscription_plan) {
      await queryInterface.addColumn('tenants', 'subscription_plan', {
        type: Sequelize.STRING(50),
        allowNull: true
      });
    }

    if (!tableDescription.subscription_start) {
      await queryInterface.addColumn('tenants', 'subscription_start', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    if (!tableDescription.subscription_end) {
      await queryInterface.addColumn('tenants', 'subscription_end', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    // Add limits
    if (!tableDescription.max_users) {
      await queryInterface.addColumn('tenants', 'max_users', {
        type: Sequelize.INTEGER,
        defaultValue: 5
      });
    }

    if (!tableDescription.max_branches) {
      await queryInterface.addColumn('tenants', 'max_branches', {
        type: Sequelize.INTEGER,
        defaultValue: 1
      });
    }

    // Add contact information
    if (!tableDescription.contact_name) {
      await queryInterface.addColumn('tenants', 'contact_name', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    }

    if (!tableDescription.contact_email) {
      await queryInterface.addColumn('tenants', 'contact_email', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    }

    if (!tableDescription.contact_phone) {
      await queryInterface.addColumn('tenants', 'contact_phone', {
        type: Sequelize.STRING(20),
        allowNull: true
      });
    }

    // Add location fields
    if (!tableDescription.city) {
      await queryInterface.addColumn('tenants', 'city', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
    }

    if (!tableDescription.province) {
      await queryInterface.addColumn('tenants', 'province', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
    }

    if (!tableDescription.postal_code) {
      await queryInterface.addColumn('tenants', 'postal_code', {
        type: Sequelize.STRING(10),
        allowNull: true
      });
    }

    // Add address if not exists (might be business_address)
    if (!tableDescription.address && tableDescription.business_address) {
      await queryInterface.renameColumn('tenants', 'business_address', 'address');
    } else if (!tableDescription.address) {
      await queryInterface.addColumn('tenants', 'address', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    // Add settings if not exists
    if (!tableDescription.settings) {
      await queryInterface.addColumn('tenants', 'settings', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('tenants', 'name');
    await queryInterface.removeColumn('tenants', 'code');
    await queryInterface.removeColumn('tenants', 'status');
    await queryInterface.removeColumn('tenants', 'subscription_plan');
    await queryInterface.removeColumn('tenants', 'subscription_start');
    await queryInterface.removeColumn('tenants', 'subscription_end');
    await queryInterface.removeColumn('tenants', 'max_users');
    await queryInterface.removeColumn('tenants', 'max_branches');
    await queryInterface.removeColumn('tenants', 'contact_name');
    await queryInterface.removeColumn('tenants', 'contact_email');
    await queryInterface.removeColumn('tenants', 'contact_phone');
    await queryInterface.removeColumn('tenants', 'city');
    await queryInterface.removeColumn('tenants', 'province');
    await queryInterface.removeColumn('tenants', 'postal_code');
  }
};
