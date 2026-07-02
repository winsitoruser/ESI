'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table already exists
    const tables = await queryInterface.showAllTables();
    
    if (!tables.includes('branches')) {
      await queryInterface.createTable('branches', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        store_id: {
          type: Sequelize.UUID,
          allowNull: true
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
        type: {
          type: Sequelize.ENUM('main', 'branch', 'warehouse', 'kiosk'),
          defaultValue: 'branch'
        },
        address: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        city: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        province: {
          type: Sequelize.STRING(255),
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
          allowNull: true,
          validate: {
            isEmail: true
          }
        },
        manager_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        operating_hours: {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: []
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
      await queryInterface.addIndex('branches', ['code'], {
        name: 'branches_code_idx',
        unique: true
      });

      await queryInterface.addIndex('branches', ['store_id'], {
        name: 'branches_store_id_idx'
      });

      await queryInterface.addIndex('branches', ['manager_id'], {
        name: 'branches_manager_id_idx'
      });

      await queryInterface.addIndex('branches', ['is_active'], {
        name: 'branches_is_active_idx'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('branches');
  }
};
