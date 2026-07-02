'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create webhooks table
    await queryInterface.createTable('webhooks', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      url: {
        type: Sequelize.STRING(500),
        allowNull: false,
        validate: {
          isUrl: true
        }
      },
      event: {
        type: Sequelize.ENUM(
          'low_stock_alert',
          'daily_sales_summary',
          'finance_reconciliation',
          'inventory_transfer',
          'order_created',
          'order_completed',
          'payment_received',
          'customer_created',
          'employee_shift_start',
          'employee_shift_end'
        ),
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active'
      },
      secretKey: {
        type: Sequelize.STRING(100),
        allowNull: true,
        field: 'secret_key',
        comment: 'Secret key for webhook signature verification'
      },
      retryCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
        field: 'retry_count',
        comment: 'Number of retry attempts on failure'
      },
      timeout: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30000,
        comment: 'Timeout in milliseconds'
      },
      headers: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Custom headers to send with webhook'
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'branch_id',
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Branch specific webhook (null for global)'
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'created_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'updated_at'
      }
    });

    // Add indexes
    await queryInterface.addIndex('webhooks', ['event']);
    await queryInterface.addIndex('webhooks', ['is_active']);
    await queryInterface.addIndex('webhooks', ['branch_id']);
    await queryInterface.addIndex('webhooks', ['tenant_id']);

    // Create webhook_logs table
    await queryInterface.createTable('webhook_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      webhookId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'webhook_id',
        references: {
          model: 'webhooks',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      event: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Payload sent to webhook'
      },
      responseStatus: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'response_status'
      },
      responseBody: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'response_body'
      },
      responseHeaders: {
        type: Sequelize.JSON,
        allowNull: true,
        field: 'response_headers'
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Response time in milliseconds'
      },
      attempt: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      status: {
        type: Sequelize.ENUM('pending', 'success', 'failed', 'retrying'),
        allowNull: false,
        defaultValue: 'pending'
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'error_message'
      },
      nextRetryAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'next_retry_at'
      },
      triggeredBy: {
        type: Sequelize.STRING(100),
        allowNull: true,
        field: 'triggered_by',
        comment: 'User or system that triggered the webhook'
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'updated_at'
      }
    });

    // Add indexes for webhook_logs
    await queryInterface.addIndex('webhook_logs', ['webhook_id']);
    await queryInterface.addIndex('webhook_logs', ['event']);
    await queryInterface.addIndex('webhook_logs', ['status']);
    await queryInterface.addIndex('webhook_logs', ['created_at']);
    await queryInterface.addIndex('webhook_logs', ['next_retry_at']);
    await queryInterface.addIndex('webhook_logs', ['tenant_id']);

    // Create webhook_subscriptions table for specific entity subscriptions
    await queryInterface.createTable('webhook_subscriptions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      webhookId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'webhook_id',
        references: {
          model: 'webhooks',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      entityType: {
        type: Sequelize.ENUM('product', 'ingredient', 'category', 'branch', 'employee', 'customer'),
        allowNull: false,
        field: 'entity_type'
      },
      entityId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'entity_id'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active'
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'updated_at'
      }
    });

    // Add indexes for webhook_subscriptions
    await queryInterface.addIndex('webhook_subscriptions', ['webhook_id']);
    await queryInterface.addIndex('webhook_subscriptions', ['entity_type', 'entity_id']);
    await queryInterface.addIndex('webhook_subscriptions', ['is_active']);
    await queryInterface.addIndex('webhook_subscriptions', ['tenant_id']);

    // Insert default low stock alert webhook for all tenants
    await queryInterface.sequelize.query(`
      INSERT INTO webhooks (id, name, description, url, event, is_active, tenant_id, created_by, created_at, updated_at)
      SELECT 
        UUID(),
        'Low Stock Alert',
        'Automatically sends alert when product stock falls below minimum level',
        'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
        'low_stock_alert',
        true,
        t.id,
        (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
        NOW(),
        NOW()
      FROM tenants t
      WHERE NOT EXISTS (
        SELECT 1 FROM webhooks w 
        WHERE w.tenant_id = t.id AND w.event = 'low_stock_alert'
      )
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('webhook_subscriptions', ['tenant_id']);
    await queryInterface.removeIndex('webhook_subscriptions', ['is_active']);
    await queryInterface.removeIndex('webhook_subscriptions', ['entity_type', 'entity_id']);
    await queryInterface.removeIndex('webhook_subscriptions', ['webhook_id']);
    
    await queryInterface.removeIndex('webhook_logs', ['tenant_id']);
    await queryInterface.removeIndex('webhook_logs', ['next_retry_at']);
    await queryInterface.removeIndex('webhook_logs', ['created_at']);
    await queryInterface.removeIndex('webhook_logs', ['status']);
    await queryInterface.removeIndex('webhook_logs', ['event']);
    await queryInterface.removeIndex('webhook_logs', ['webhook_id']);
    
    await queryInterface.removeIndex('webhooks', ['tenant_id']);
    await queryInterface.removeIndex('webhooks', ['branch_id']);
    await queryInterface.removeIndex('webhooks', ['is_active']);
    await queryInterface.removeIndex('webhooks', ['event']);

    // Drop tables
    await queryInterface.dropTable('webhook_subscriptions');
    await queryInterface.dropTable('webhook_logs');
    await queryInterface.dropTable('webhooks');
  }
};
