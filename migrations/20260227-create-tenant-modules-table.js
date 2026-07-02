'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tenant_modules', {
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
      is_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      enabled_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      disabled_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      enabled_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      configured_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      config_data: {
        type: Sequelize.JSONB,
        allowNull: true,
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

    // Add indexes
    await queryInterface.addIndex('tenant_modules', ['tenant_id'], {
      name: 'tenant_modules_tenant_id_idx'
    });

    await queryInterface.addIndex('tenant_modules', ['module_id'], {
      name: 'tenant_modules_module_id_idx'
    });

    await queryInterface.addIndex('tenant_modules', ['tenant_id', 'module_id'], {
      name: 'tenant_modules_tenant_module_unique_idx',
      unique: true
    });

    await queryInterface.addIndex('tenant_modules', ['is_enabled'], {
      name: 'tenant_modules_is_enabled_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tenant_modules');
  }
};
