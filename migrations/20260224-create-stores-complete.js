'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    
    if (!tables.includes('stores')) {
      await queryInterface.createTable('stores', {
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
        code: {
          type: Sequelize.STRING(50),
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
        owner_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        business_type: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        address: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        city: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        province: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        postal_code: {
          type: Sequelize.STRING(10),
          allowNull: true
        },
        phone: {
          type: Sequelize.STRING(20),
          allowNull: true
        },
        email: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        settings: {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: {}
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      });

      // Add indexes
      await queryInterface.addIndex('stores', ['tenant_id'], {
        name: 'stores_tenant_id_idx'
      });

      await queryInterface.addIndex('stores', ['code'], {
        name: 'stores_code_unique_idx',
        unique: true
      });

      await queryInterface.addIndex('stores', ['owner_id'], {
        name: 'stores_owner_id_idx'
      });

      await queryInterface.addIndex('stores', ['is_active'], {
        name: 'stores_is_active_idx'
      });

      // Composite index for tenant + active stores
      await queryInterface.addIndex('stores', ['tenant_id', 'is_active'], {
        name: 'stores_tenant_active_idx'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('stores');
  }
};
