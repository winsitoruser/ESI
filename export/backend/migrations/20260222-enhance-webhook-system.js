'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create webhook_event_configs table
    await queryInterface.createTable('webhook_event_configs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      eventType: {
        type: Sequelize.STRING(100),
        allowNull: false,
        field: 'event_type',
        comment: 'Event type (e.g., transaction_voided, low_stock)'
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      thresholds: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Threshold conditions for triggering'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active'
      },
      emailRecipients: {
        type: Sequelize.JSON,
        allowNull: true,
        field: 'email_recipients',
        comment: 'List of email recipients'
      },
      emailTemplate: {
        type: Sequelize.STRING(100),
        allowNull: true,
        field: 'email_template'
      },
      whatsappRecipients: {
        type: Sequelize.JSON,
        allowNull: true,
        field: 'whatsapp_recipients',
        comment: 'List of WhatsApp recipients'
      },
      webhookUrls: {
        type: Sequelize.JSON,
        allowNull: true,
        field: 'webhook_urls',
        comment: 'Additional webhook URLs'
      },
      retryConfig: {
        type: Sequelize.JSON,
        allowNull: true,
        field: 'retry_config',
        comment: 'Retry configuration'
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

    // Create webhook_dispatch_logs table
    await queryInterface.createTable('webhook_dispatch_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      eventType: {
        type: Sequelize.STRING(100),
        allowNull: false,
        field: 'event_type'
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Full payload sent'
      },
      priority: {
        type: Sequelize.ENUM('low', 'normal', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'normal'
      },
      channels: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Channels used for dispatch'
      },
      targetBranches: {
        type: Sequelize.JSON,
        allowNull: true,
        field: 'target_branches',
        comment: 'Target branches (null = all)'
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'pending'
      },
      dispatchedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'dispatched_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      processedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'processed_at'
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'error_message'
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
      }
    });

    // Create webhook_results table for individual channel results
    await queryInterface.createTable('webhook_results', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      dispatchLogId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'dispatch_log_id',
        references: {
          model: 'webhook_dispatch_logs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      channel: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Channel used (webhook, email, whatsapp, dashboard)'
      },
      endpoint: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Target endpoint for webhook channel'
      },
      success: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      responseCode: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'response_code'
      },
      responseMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'response_message'
      },
      attemptCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: 'attempt_count'
      },
      nextRetryAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'next_retry_at'
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'completed_at'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
      }
    });

    // Create dashboard_notifications table
    await queryInterface.createTable('dashboard_notifications', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      priority: {
        type: Sequelize.ENUM('low', 'normal', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'normal'
      },
      data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional data payload'
      },
      isRead: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_read'
      },
      readAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'read_at'
      },
      actionUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
        field: 'action_url'
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'expires_at'
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
      }
    });

    // Add isLockedByHQ to product_prices table
    await queryInterface.addColumn('product_prices', 'is_locked_by_hq', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_locked_by_hq',
      comment: 'If true, price cannot be modified by branch managers'
    });

    // Add indexes
    await queryInterface.addIndex('webhook_event_configs', ['event_type', 'tenant_id'], { unique: true });
    await queryInterface.addIndex('webhook_event_configs', ['is_active']);
    await queryInterface.addIndex('webhook_event_configs', ['tenant_id']);

    await queryInterface.addIndex('webhook_dispatch_logs', ['event_type']);
    await queryInterface.addIndex('webhook_dispatch_logs', ['status']);
    await queryInterface.addIndex('webhook_dispatch_logs', ['created_at']);
    await queryInterface.addIndex('webhook_dispatch_logs', ['tenant_id']);

    await queryInterface.addIndex('webhook_results', ['dispatch_log_id']);
    await queryInterface.addIndex('webhook_results', ['channel']);
    await queryInterface.addIndex('webhook_results', ['success']);
    await queryInterface.addIndex('webhook_results', ['next_retry_at']);

    await queryInterface.addIndex('dashboard_notifications', ['user_id', 'is_read']);
    await queryInterface.addIndex('dashboard_notifications', ['type']);
    await queryInterface.addIndex('dashboard_notifications', ['priority']);
    await queryInterface.addIndex('dashboard_notifications', ['expires_at']);
    await queryInterface.addIndex('dashboard_notifications', ['tenant_id']);

    await queryInterface.addIndex('product_prices', ['is_locked_by_hq']);

    // Insert default event configurations
    await queryInterface.sequelize.query(`
      INSERT INTO webhook_event_configs (
        id, event_type, name, description, thresholds, is_active,
        email_recipients, whatsapp_recipients, created_by, tenant_id, created_at, updated_at
      )
      SELECT 
        uuid_generate_v4(),
        'transaction_voided',
        'Transaction Voided',
        'Alert when a transaction is voided',
        '{"minAmount": 100000, "businessHoursOnly": false}',
        true,
        '["manager@company.com", "supervisor@company.com"]',
        '["+628123456789", "+628987654321"]',
        u.id,
        t.id,
        NOW(),
        NOW()
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.role = 'super_admin'
      AND NOT EXISTS (
        SELECT 1 FROM webhook_event_configs 
        WHERE event_type = 'transaction_voided' AND tenant_id = t.id
      )
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO webhook_event_configs (
        id, event_type, name, description, thresholds, is_active,
        email_recipients, created_by, tenant_id, created_at, updated_at
      )
      SELECT 
        uuid_generate_v4(),
        'low_stock',
        'Low Stock Alert',
        'Alert when product stock is low',
        '{"minStockLevel": 0, "percentageThreshold": 20}',
        true,
        '["inventory@company.com"]',
        u.id,
        t.id,
        NOW(),
        NOW()
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.role = 'super_admin'
      AND NOT EXISTS (
        SELECT 1 FROM webhook_event_configs 
        WHERE event_type = 'low_stock' AND tenant_id = t.id
      )
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO webhook_event_configs (
        id, event_type, name, description, thresholds, is_active,
        email_recipients, whatsapp_recipients, created_by, tenant_id, created_at, updated_at
      )
      SELECT 
        uuid_generate_v4(),
        'suspicious_activity',
        'Suspicious Activity',
        'Alert for suspicious activities (large voids, unusual patterns)',
        '{"minAmount": 5000000, "businessHoursOnly": false}',
        true,
        '["security@company.com", "manager@company.com"]',
        '["+628123456789"]',
        u.id,
        t.id,
        NOW(),
        NOW()
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.role = 'super_admin'
      AND NOT EXISTS (
        SELECT 1 FROM webhook_event_configs 
        WHERE event_type = 'suspicious_activity' AND tenant_id = t.id
      )
    `);

    // Create function to check price lock before update
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION check_price_lock()
      RETURNS TRIGGER AS $$
      DECLARE
        is_locked BOOLEAN;
        user_role TEXT;
      BEGIN
        -- Check if price is locked by HQ
        SELECT is_locked_by_hq INTO is_locked
        FROM product_prices
        WHERE id = NEW.id;
        
        -- Get current user role (this would need to be passed in the application context)
        -- For now, we'll use a placeholder
        user_role := current_setting('app.current_user_role', true);
        
        -- If locked and user is not super_admin or admin, prevent update
        IF is_locked = true AND user_role NOT IN ('super_admin', 'admin') THEN
          RAISE EXCEPTION 'Price is locked by HQ. Cannot modify.';
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Note: The trigger would need to be implemented at the application level
    // since we can't easily pass user context to database triggers
  },

  down: async (queryInterface, Sequelize) => {
    // Drop function
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS check_price_lock()');

    // Remove indexes
    await queryInterface.removeIndex('product_prices', ['is_locked_by_hq']);
    
    await queryInterface.removeIndex('dashboard_notifications', ['tenant_id']);
    await queryInterface.removeIndex('dashboard_notifications', ['expires_at']);
    await queryInterface.removeIndex('dashboard_notifications', ['priority']);
    await queryInterface.removeIndex('dashboard_notifications', ['type']);
    await queryInterface.removeIndex('dashboard_notifications', ['user_id', 'is_read']);
    
    await queryInterface.removeIndex('webhook_results', ['next_retry_at']);
    await queryInterface.removeIndex('webhook_results', ['success']);
    await queryInterface.removeIndex('webhook_results', ['channel']);
    await queryInterface.removeIndex('webhook_results', ['dispatch_log_id']);
    
    await queryInterface.removeIndex('webhook_dispatch_logs', ['tenant_id']);
    await queryInterface.removeIndex('webhook_dispatch_logs', ['created_at']);
    await queryInterface.removeIndex('webhook_dispatch_logs', ['status']);
    await queryInterface.removeIndex('webhook_dispatch_logs', ['event_type']);
    
    await queryInterface.removeIndex('webhook_event_configs', ['tenant_id']);
    await queryInterface.removeIndex('webhook_event_configs', ['is_active']);
    await queryInterface.removeIndex('webhook_event_configs', ['event_type', 'tenant_id']);

    // Drop tables
    await queryInterface.dropTable('dashboard_notifications');
    await queryInterface.dropTable('webhook_results');
    await queryInterface.dropTable('webhook_dispatch_logs');
    await queryInterface.dropTable('webhook_event_configs');

    // Remove column
    await queryInterface.removeColumn('product_prices', 'is_locked_by_hq');
  }
};
