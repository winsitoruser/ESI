'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create system_alerts table
    await queryInterface.createTable('system_alerts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      alert_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Type: stock_low, stock_out, expiry_warning, expiry_critical, price_change, overstock, quality_issue, supplier_issue, system_error, custom'
      },
      severity: {
        type: Sequelize.ENUM('info', 'warning', 'critical', 'urgent'),
        allowNull: false,
        defaultValue: 'info',
        comment: 'Alert severity level'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Alert title/subject'
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Detailed alert message'
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Category: inventory, sales, finance, production, quality, system, customer'
      },
      source: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Source system/module that generated alert'
      },
      reference_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Type of referenced entity: product, stock, order, transaction, etc'
      },
      reference_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'ID of referenced entity'
      },
      reference_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional reference data (product details, stock info, etc)'
      },
      action_required: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this alert requires user action'
      },
      action_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Type of action: reorder, adjust_price, check_quality, contact_supplier, etc'
      },
      action_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'URL to take action'
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Priority score (higher = more important)'
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_resolved: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      resolved_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      resolution_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      assigned_to: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: 'User assigned to handle this alert'
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Alert expiration date (auto-dismiss after this)'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata for the alert'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('system_alerts', ['alert_type']);
    await queryInterface.addIndex('system_alerts', ['severity']);
    await queryInterface.addIndex('system_alerts', ['category']);
    await queryInterface.addIndex('system_alerts', ['is_read']);
    await queryInterface.addIndex('system_alerts', ['is_resolved']);
    await queryInterface.addIndex('system_alerts', ['created_at']);
    await queryInterface.addIndex('system_alerts', ['reference_type', 'reference_id']);
    await queryInterface.addIndex('system_alerts', ['assigned_to']);
    await queryInterface.addIndex('system_alerts', ['expires_at']);

    // Create alert_subscriptions table for user preferences
    await queryInterface.createTable('alert_subscriptions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      alert_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      is_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      notify_email: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      notify_sms: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      notify_push: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      min_severity: {
        type: Sequelize.ENUM('info', 'warning', 'critical', 'urgent'),
        defaultValue: 'info'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('alert_subscriptions', ['user_id', 'alert_type']);
    await queryInterface.addIndex('alert_subscriptions', ['user_id', 'category']);

    // Create alert_actions table for tracking actions taken
    await queryInterface.createTable('alert_actions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      alert_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'system_alerts',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      action_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'read, dismissed, resolved, escalated, assigned, commented'
      },
      action_data: {
        type: Sequelize.JSON,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('alert_actions', ['alert_id']);
    await queryInterface.addIndex('alert_actions', ['user_id']);
    await queryInterface.addIndex('alert_actions', ['action_type']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('alert_actions');
    await queryInterface.dropTable('alert_subscriptions');
    await queryInterface.dropTable('system_alerts');
  }
};
