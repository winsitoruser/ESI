'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    
    if (!tables.includes('tenants')) {
      await queryInterface.createTable('tenants', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true
        },
        business_type: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM('active', 'inactive', 'suspended', 'trial'),
          defaultValue: 'trial'
        },
        subscription_plan: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        subscription_start: {
          type: Sequelize.DATE,
          allowNull: true
        },
        subscription_end: {
          type: Sequelize.DATE,
          allowNull: true
        },
        max_users: {
          type: Sequelize.INTEGER,
          defaultValue: 5
        },
        max_branches: {
          type: Sequelize.INTEGER,
          defaultValue: 1
        },
        settings: {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: {}
        },
        contact_name: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        contact_email: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        contact_phone: {
          type: Sequelize.STRING(20),
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
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
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

      await queryInterface.addIndex('tenants', ['code'], {
        name: 'tenants_code_idx',
        unique: true
      });

      await queryInterface.addIndex('tenants', ['status'], {
        name: 'tenants_status_idx'
      });

      await queryInterface.addIndex('tenants', ['is_active'], {
        name: 'tenants_is_active_idx'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tenants');
  }
};
