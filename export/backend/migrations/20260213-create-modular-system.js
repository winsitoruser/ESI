'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create business_types table
    await queryInterface.createTable('business_types', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      code: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: Sequelize.TEXT,
      icon: Sequelize.STRING(50),
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 2. Create modules table
    await queryInterface.createTable('modules', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      code: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: Sequelize.TEXT,
      icon: Sequelize.STRING(50),
      route: Sequelize.STRING(100),
      parent_module_id: {
        type: Sequelize.UUID,
        references: {
          model: 'modules',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      sort_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      is_core: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 3. Create business_type_modules junction table
    await queryInterface.createTable('business_type_modules', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      business_type_id: {
        type: Sequelize.UUID,
        references: {
          model: 'business_types',
          key: 'id'
        },
        onDelete: 'CASCADE',
        allowNull: false
      },
      module_id: {
        type: Sequelize.UUID,
        references: {
          model: 'modules',
          key: 'id'
        },
        onDelete: 'CASCADE',
        allowNull: false
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      is_optional: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 4. Create tenant_modules table
    await queryInterface.createTable('tenant_modules', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onDelete: 'CASCADE',
        allowNull: false
      },
      module_id: {
        type: Sequelize.UUID,
        references: {
          model: 'modules',
          key: 'id'
        },
        onDelete: 'CASCADE',
        allowNull: false
      },
      is_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      enabled_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      disabled_at: Sequelize.DATE,
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 5. Add indexes
    await queryInterface.addIndex('tenant_modules', ['tenant_id'], {
      name: 'idx_tenant_modules_tenant'
    });
    
    await queryInterface.addIndex('tenant_modules', ['tenant_id', 'is_enabled'], {
      name: 'idx_tenant_modules_enabled'
    });

    // 6. Add unique constraints
    await queryInterface.addConstraint('business_type_modules', {
      fields: ['business_type_id', 'module_id'],
      type: 'unique',
      name: 'unique_business_type_module'
    });

    await queryInterface.addConstraint('tenant_modules', {
      fields: ['tenant_id', 'module_id'],
      type: 'unique',
      name: 'unique_tenant_module'
    });

    // 7. Update tenants table - add business type fields
    await queryInterface.addColumn('tenants', 'business_type_id', {
      type: Sequelize.UUID,
      references: {
        model: 'business_types',
        key: 'id'
      },
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('tenants', 'business_name', {
      type: Sequelize.STRING(255)
    });

    await queryInterface.addColumn('tenants', 'business_address', {
      type: Sequelize.TEXT
    });

    await queryInterface.addColumn('tenants', 'business_phone', {
      type: Sequelize.STRING(50)
    });

    await queryInterface.addColumn('tenants', 'business_email', {
      type: Sequelize.STRING(255)
    });

    await queryInterface.addColumn('tenants', 'setup_completed', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });

    await queryInterface.addColumn('tenants', 'onboarding_step', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    });

    // 8. Update users table - add tenant and role
    await queryInterface.addColumn('users', 'tenant_id', {
      type: Sequelize.UUID,
      references: {
        model: 'tenants',
        key: 'id'
      },
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('users', 'role', {
      type: Sequelize.STRING(50),
      defaultValue: 'staff'
    });

    // 9. Add index for users.tenant_id
    await queryInterface.addIndex('users', ['tenant_id'], {
      name: 'idx_users_tenant'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove in reverse order
    await queryInterface.removeIndex('users', 'idx_users_tenant');
    await queryInterface.removeColumn('users', 'role');
    await queryInterface.removeColumn('users', 'tenant_id');
    
    await queryInterface.removeColumn('tenants', 'onboarding_step');
    await queryInterface.removeColumn('tenants', 'setup_completed');
    await queryInterface.removeColumn('tenants', 'business_email');
    await queryInterface.removeColumn('tenants', 'business_phone');
    await queryInterface.removeColumn('tenants', 'business_address');
    await queryInterface.removeColumn('tenants', 'business_name');
    await queryInterface.removeColumn('tenants', 'business_type_id');
    
    await queryInterface.removeConstraint('tenant_modules', 'unique_tenant_module');
    await queryInterface.removeConstraint('business_type_modules', 'unique_business_type_module');
    
    await queryInterface.removeIndex('tenant_modules', 'idx_tenant_modules_enabled');
    await queryInterface.removeIndex('tenant_modules', 'idx_tenant_modules_tenant');
    
    await queryInterface.dropTable('tenant_modules');
    await queryInterface.dropTable('business_type_modules');
    await queryInterface.dropTable('modules');
    await queryInterface.dropTable('business_types');
  }
};
