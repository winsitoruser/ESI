'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create partner_integrations table
    await queryInterface.createTable('partner_integrations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      partner_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'partners',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      integration_type: {
        type: Sequelize.ENUM('payment_gateway', 'whatsapp', 'email_smtp'),
        allowNull: false
      },
      provider: {
        type: Sequelize.STRING,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      configuration: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      test_mode: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      last_tested_at: {
        type: Sequelize.DATE
      },
      last_test_status: {
        type: Sequelize.ENUM('success', 'failed', 'pending')
      },
      last_test_message: {
        type: Sequelize.TEXT
      },
      created_by: {
        type: Sequelize.UUID
      },
      updated_by: {
        type: Sequelize.UUID
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create outlet_integrations table
    await queryInterface.createTable('outlet_integrations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      outlet_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'partner_outlets',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      integration_type: {
        type: Sequelize.ENUM('payment_gateway', 'whatsapp', 'email_smtp'),
        allowNull: false
      },
      provider: {
        type: Sequelize.STRING,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      configuration: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      test_mode: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      use_partner_config: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      last_tested_at: {
        type: Sequelize.DATE
      },
      last_test_status: {
        type: Sequelize.ENUM('success', 'failed', 'pending')
      },
      last_test_message: {
        type: Sequelize.TEXT
      },
      created_by: {
        type: Sequelize.UUID
      },
      updated_by: {
        type: Sequelize.UUID
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes
    await queryInterface.addIndex('partner_integrations', ['partner_id']);
    await queryInterface.addIndex('partner_integrations', ['integration_type']);
    await queryInterface.addIndex('partner_integrations', ['partner_id', 'integration_type', 'provider'], {
      unique: true,
      name: 'partner_integrations_unique'
    });

    await queryInterface.addIndex('outlet_integrations', ['outlet_id']);
    await queryInterface.addIndex('outlet_integrations', ['integration_type']);
    await queryInterface.addIndex('outlet_integrations', ['outlet_id', 'integration_type', 'provider'], {
      unique: true,
      name: 'outlet_integrations_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('outlet_integrations');
    await queryInterface.dropTable('partner_integrations');
  }
};
