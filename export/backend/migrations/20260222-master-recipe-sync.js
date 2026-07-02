'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add master recipe fields to recipes table
    await queryInterface.addColumn('recipes', 'is_master', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this is a master recipe from HQ'
    });

    await queryInterface.addColumn('recipes', 'master_recipe_id', {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'master_recipe_id',
      references: {
        model: 'recipes',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Reference to master recipe if this is a branch copy'
    });

    await queryInterface.addColumn('recipes', 'sync_status', {
      type: Sequelize.ENUM('pending', 'synced', 'modified', 'conflict'),
      allowNull: true,
      defaultValue: null,
      field: 'sync_status',
      comment: 'Sync status for branch recipes'
    });

    await queryInterface.addColumn('recipes', 'last_synced_at', {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'last_synced_at',
      comment: 'Last time this recipe was synced from master'
    });

    await queryInterface.addColumn('recipes', 'sync_version', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'sync_version',
      comment: 'Version number for recipe sync tracking'
    });

    await queryInterface.addColumn('recipes', 'branch_id', {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'branch_id',
      references: {
        model: 'branches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Branch that owns this recipe (null for master recipes)'
    });

    await queryInterface.addColumn('recipes', 'tenant_id', {
      type: Sequelize.UUID,
      allowNull: false,
      field: 'tenant_id',
      references: {
        model: 'tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Tenant that owns this recipe'
    });

    // Add indexes
    await queryInterface.addIndex('recipes', ['is_master']);
    await queryInterface.addIndex('recipes', ['master_recipe_id']);
    await queryInterface.addIndex('recipes', ['sync_status']);
    await queryInterface.addIndex('recipes', ['branch_id']);
    await queryInterface.addIndex('recipes', ['tenant_id']);
    await queryInterface.addIndex('recipes', ['sync_version']);

    // Create recipe sync log table
    await queryInterface.createTable('recipe_sync_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      masterRecipeId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'master_recipe_id',
        references: {
          model: 'recipes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'branch_id',
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      syncType: {
        type: Sequelize.ENUM('create', 'update', 'delete', 'restore'),
        allowNull: false,
        field: 'sync_type'
      },
      syncVersion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'sync_version'
      },
      oldData: {
        type: Sequelize.JSON,
        allowNull: true,
        field: 'old_data',
        comment: 'Previous recipe data before sync'
      },
      newData: {
        type: Sequelize.JSON,
        allowNull: true,
        field: 'new_data',
        comment: 'New recipe data after sync'
      },
      changes: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Specific changes made during sync'
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'conflict'),
        allowNull: false,
        defaultValue: 'pending'
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'error_message'
      },
      syncedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'synced_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      syncedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'synced_at'
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

    // Add indexes for sync logs
    await queryInterface.addIndex('recipe_sync_logs', ['master_recipe_id']);
    await queryInterface.addIndex('recipe_sync_logs', ['branch_id']);
    await queryInterface.addIndex('recipe_sync_logs', ['sync_type']);
    await queryInterface.addIndex('recipe_sync_logs', ['status']);
    await queryInterface.addIndex('recipe_sync_logs', ['synced_at']);
    await queryInterface.addIndex('recipe_sync_logs', ['tenant_id']);

    // Add branch_id to recipe_ingredients for regional pricing
    await queryInterface.addColumn('recipe_ingredients', 'branch_id', {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'branch_id',
      references: {
        model: 'branches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Override ingredient cost for specific branch'
    });

    await queryInterface.addColumn('recipe_ingredients', 'cost_override', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      field: 'cost_override',
      comment: 'Override ingredient cost for regional pricing'
    });

    await queryInterface.addIndex('recipe_ingredients', ['branch_id']);
    await queryInterface.addIndex('recipe_ingredients', ['recipe_id', 'branch_id']);

    // Update existing recipes to have tenant_id
    await queryInterface.sequelize.query(`
      UPDATE recipes r
      SET tenant_id = COALESCE(
        (SELECT tenant_id FROM products p WHERE p.id = r.product_id LIMIT 1),
        (SELECT tenant_id FROM branches b WHERE b.is_main_branch = true LIMIT 1),
        'default'
      )
      WHERE r.tenant_id IS NULL
    `);

    // Mark existing recipes as master recipes if they don't have branch_id
    await queryInterface.sequelize.query(`
      UPDATE recipes
      SET is_master = true
      WHERE branch_id IS NULL AND is_master = false
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('recipe_ingredients', ['recipe_id', 'branch_id']);
    await queryInterface.removeIndex('recipe_ingredients', ['branch_id']);
    
    await queryInterface.removeIndex('recipe_sync_logs', ['tenant_id']);
    await queryInterface.removeIndex('recipe_sync_logs', ['synced_at']);
    await queryInterface.removeIndex('recipe_sync_logs', ['status']);
    await queryInterface.removeIndex('recipe_sync_logs', ['sync_type']);
    await queryInterface.removeIndex('recipe_sync_logs', ['branch_id']);
    await queryInterface.removeIndex('recipe_sync_logs', ['master_recipe_id']);
    
    await queryInterface.removeIndex('recipes', ['sync_version']);
    await queryInterface.removeIndex('recipes', ['tenant_id']);
    await queryInterface.removeIndex('recipes', ['branch_id']);
    await queryInterface.removeIndex('recipes', ['sync_status']);
    await queryInterface.removeIndex('recipes', ['master_recipe_id']);
    await queryInterface.removeIndex('recipes', ['is_master']);

    // Drop tables
    await queryInterface.dropTable('recipe_sync_logs');

    // Remove columns from recipe_ingredients
    await queryInterface.removeColumn('recipe_ingredients', 'cost_override');
    await queryInterface.removeColumn('recipe_ingredients', 'branch_id');

    // Remove columns from recipes
    await queryInterface.removeColumn('recipes', 'tenant_id');
    await queryInterface.removeColumn('recipes', 'branch_id');
    await queryInterface.removeColumn('recipes', 'sync_version');
    await queryInterface.removeColumn('recipes', 'last_synced_at');
    await queryInterface.removeColumn('recipes', 'sync_status');
    await queryInterface.removeColumn('recipes', 'master_recipe_id');
    await queryInterface.removeColumn('recipes', 'is_master');
  }
};
