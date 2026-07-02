'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    
    if (!tables.includes('sync_logs')) {
      await queryInterface.createTable('sync_logs', {
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
        branch_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'branches',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        sync_type: {
          type: Sequelize.ENUM('products', 'prices', 'promotions', 'settings', 'inventory', 'full'),
          allowNull: false
        },
        direction: {
          type: Sequelize.ENUM('hq_to_branch', 'branch_to_hq'),
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'failed'),
          defaultValue: 'pending'
        },
        items_synced: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        total_items: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        error_message: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        started_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        completed_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        initiated_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        metadata: {
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

      // Add indexes for performance
      await queryInterface.addIndex('sync_logs', ['tenant_id'], {
        name: 'sync_logs_tenant_id_idx'
      });

      await queryInterface.addIndex('sync_logs', ['branch_id'], {
        name: 'sync_logs_branch_id_idx'
      });

      await queryInterface.addIndex('sync_logs', ['status'], {
        name: 'sync_logs_status_idx'
      });

      await queryInterface.addIndex('sync_logs', ['created_at'], {
        name: 'sync_logs_created_at_idx'
      });

      // Composite index for tenant + branch + status
      await queryInterface.addIndex('sync_logs', ['tenant_id', 'branch_id', 'status'], {
        name: 'sync_logs_tenant_branch_status_idx'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('sync_logs');
  }
};
