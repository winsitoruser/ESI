'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create integration_logs table
    await queryInterface.createTable('integration_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      integration_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'partner_integrations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      action: {
        type: Sequelize.ENUM('test', 'webhook', 'transaction', 'error', 'config_change'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('success', 'failed', 'pending'),
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT
      },
      request_data: {
        type: Sequelize.JSONB
      },
      response_data: {
        type: Sequelize.JSONB
      },
      error_details: {
        type: Sequelize.JSONB
      },
      duration: {
        type: Sequelize.INTEGER
      },
      ip_address: {
        type: Sequelize.STRING
      },
      user_agent: {
        type: Sequelize.TEXT
      },
      user_id: {
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

    // Create integration_webhooks table
    await queryInterface.createTable('integration_webhooks', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      integration_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'partner_integrations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      webhook_url: {
        type: Sequelize.STRING,
        allowNull: false
      },
      webhook_secret: {
        type: Sequelize.STRING
      },
      events: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      retry_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 3
      },
      retry_delay: {
        type: Sequelize.INTEGER,
        defaultValue: 60
      },
      last_triggered_at: {
        type: Sequelize.DATE
      },
      last_status: {
        type: Sequelize.ENUM('success', 'failed', 'pending')
      },
      failure_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      created_by: {
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

    // Add indexes for integration_logs
    await queryInterface.addIndex('integration_logs', ['integration_id']);
    await queryInterface.addIndex('integration_logs', ['action']);
    await queryInterface.addIndex('integration_logs', ['status']);
    await queryInterface.addIndex('integration_logs', ['created_at']);

    // Add indexes for integration_webhooks
    await queryInterface.addIndex('integration_webhooks', ['integration_id']);
    await queryInterface.addIndex('integration_webhooks', ['is_active']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('integration_webhooks');
    await queryInterface.dropTable('integration_logs');
  }
};
