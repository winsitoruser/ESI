'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create module_features table
    await queryInterface.createTable('module_features', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      module_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'modules',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      code: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      business_types: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of business type codes this feature is available for'
      },
      configuration: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Feature-specific configuration schema'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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

    // Create tenant_module_features table
    await queryInterface.createTable('tenant_module_features', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      module_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'modules',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      feature_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'module_features',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      is_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      configuration: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Tenant-specific feature configuration'
      },
      enabled_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      enabled_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
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

    // Create module_integration_flows table
    await queryInterface.createTable('module_integration_flows', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      code: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      source_module_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'modules',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      target_module_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'modules',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      event_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Event type that triggers this flow'
      },
      handler_config: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Flow handler configuration'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Execution priority (higher = earlier)'
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

    // Create tenant_integration_flows table
    await queryInterface.createTable('tenant_integration_flows', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      flow_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'module_integration_flows',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      configuration: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Tenant-specific flow configuration'
      },
      activated_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      activated_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
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

    // Create event_logs table for debugging
    await queryInterface.createTable('event_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      event_id: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      event_type: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('success', 'error', 'pending'),
        defaultValue: 'success'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      correlation_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('module_features', ['module_id']);
    await queryInterface.addIndex('module_features', ['code']);
    await queryInterface.addIndex('module_features', ['is_active']);
    
    await queryInterface.addIndex('tenant_module_features', ['tenant_id', 'module_id']);
    await queryInterface.addIndex('tenant_module_features', ['feature_id']);
    await queryInterface.addIndex('tenant_module_features', ['is_enabled']);
    
    await queryInterface.addIndex('module_integration_flows', ['source_module_id']);
    await queryInterface.addIndex('module_integration_flows', ['target_module_id']);
    await queryInterface.addIndex('module_integration_flows', ['event_type']);
    await queryInterface.addIndex('module_integration_flows', ['is_active']);
    
    await queryInterface.addIndex('tenant_integration_flows', ['tenant_id']);
    await queryInterface.addIndex('tenant_integration_flows', ['flow_id']);
    await queryInterface.addIndex('tenant_integration_flows', ['is_active']);
    
    await queryInterface.addIndex('event_logs', ['tenant_id']);
    await queryInterface.addIndex('event_logs', ['event_type']);
    await queryInterface.addIndex('event_logs', ['correlation_id']);
    await queryInterface.addIndex('event_logs', ['created_at']);

    console.log('✅ Module features, integration flows, and event logs tables created');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('event_logs');
    await queryInterface.dropTable('tenant_integration_flows');
    await queryInterface.dropTable('module_integration_flows');
    await queryInterface.dropTable('tenant_module_features');
    await queryInterface.dropTable('module_features');
  }
};
