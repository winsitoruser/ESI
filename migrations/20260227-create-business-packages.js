'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create business_packages table
    await queryInterface.createTable('business_packages', {
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
        type: Sequelize.TEXT
      },
      industry_type: {
        type: Sequelize.STRING(50),
        comment: 'fnb, retail, service, manufacturing'
      },
      business_type_id: {
        type: Sequelize.UUID,
        references: {
          model: 'business_types',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      category: {
        type: Sequelize.STRING(50),
        defaultValue: 'starter',
        comment: 'starter, professional, enterprise, custom'
      },
      icon: {
        type: Sequelize.STRING(100)
      },
      color: {
        type: Sequelize.STRING(20),
        defaultValue: '#3B82F6'
      },
      pricing_tier: {
        type: Sequelize.STRING(50),
        defaultValue: 'basic'
      },
      base_price: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      is_featured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      sort_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {}
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

    // Create package_modules table
    await queryInterface.createTable('package_modules', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      package_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'business_packages',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      module_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'modules',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      is_required: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      is_default_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      configuration: {
        type: Sequelize.JSON,
        defaultValue: {}
      },
      sort_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0
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

    // Create package_features table
    await queryInterface.createTable('package_features', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      package_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'business_packages',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      feature_code: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      feature_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      is_enabled: {
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

    // Create dashboard_configurations table
    await queryInterface.createTable('dashboard_configurations', {
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
      industry_type: {
        type: Sequelize.STRING(50)
      },
      business_type_id: {
        type: Sequelize.UUID,
        references: {
          model: 'business_types',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      layout_type: {
        type: Sequelize.STRING(50),
        defaultValue: 'grid',
        comment: 'grid, masonry, flex'
      },
      widgets: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      theme: {
        type: Sequelize.JSON,
        defaultValue: {}
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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

    // Create tenant_packages table
    await queryInterface.createTable('tenant_packages', {
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
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      package_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'business_packages',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      activated_at: {
        type: Sequelize.DATE
      },
      activated_by: {
        type: Sequelize.INTEGER,
        comment: 'User ID who activated the package'
      },
      configuration: {
        type: Sequelize.JSON,
        defaultValue: {}
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

    // Create tenant_dashboards table
    await queryInterface.createTable('tenant_dashboards', {
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
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      dashboard_config_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'dashboard_configurations',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      customization: {
        type: Sequelize.JSON,
        defaultValue: {},
        comment: 'Tenant-specific widget customizations'
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

    // Add indexes
    await queryInterface.addIndex('business_packages', ['industry_type']);
    await queryInterface.addIndex('business_packages', ['business_type_id']);
    await queryInterface.addIndex('business_packages', ['is_active']);
    await queryInterface.addIndex('package_modules', ['package_id']);
    await queryInterface.addIndex('package_modules', ['module_id']);
    await queryInterface.addIndex('package_modules', ['package_id', 'module_id'], { unique: true });
    await queryInterface.addIndex('dashboard_configurations', ['industry_type']);
    await queryInterface.addIndex('dashboard_configurations', ['business_type_id']);
    await queryInterface.addIndex('tenant_packages', ['tenant_id']);
    await queryInterface.addIndex('tenant_packages', ['package_id']);
    await queryInterface.addIndex('tenant_dashboards', ['tenant_id']);
    await queryInterface.addIndex('tenant_dashboards', ['dashboard_config_id']);

    console.log('✅ Created business packages and dashboard configuration tables');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tenant_dashboards');
    await queryInterface.dropTable('tenant_packages');
    await queryInterface.dropTable('dashboard_configurations');
    await queryInterface.dropTable('package_features');
    await queryInterface.dropTable('package_modules');
    await queryInterface.dropTable('business_packages');
  }
};
