'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create productions table
    await queryInterface.createTable('productions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      batch_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      recipe_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'recipes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      planned_quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      produced_quantity: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('planned', 'in_progress', 'completed', 'cancelled'),
        defaultValue: 'planned'
      },
      production_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completion_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      total_cost: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      labor_cost: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      overhead_cost: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      waste_quantity: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      waste_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0
      },
      quality_grade: {
        type: Sequelize.ENUM('A', 'B', 'C', 'reject'),
        allowNull: true
      },
      produced_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      supervisor_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      issues: {
        type: Sequelize.TEXT,
        allowNull: true
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

    // Create production_materials table
    await queryInterface.createTable('production_materials', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      production_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'productions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      planned_quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      used_quantity: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      unit_cost: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      total_cost: {
        type: Sequelize.DECIMAL(15, 2),
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

    // Create production_history table
    await queryInterface.createTable('production_history', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      production_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'productions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      action_type: {
        type: Sequelize.ENUM('created', 'started', 'updated', 'completed', 'cancelled', 'quality_checked'),
        allowNull: false
      },
      previous_status: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      new_status: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      changed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      changes_summary: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      changes_json: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      snapshot_data: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('productions', ['batch_number']);
    await queryInterface.addIndex('productions', ['recipe_id']);
    await queryInterface.addIndex('productions', ['status']);
    await queryInterface.addIndex('productions', ['production_date']);
    
    await queryInterface.addIndex('production_materials', ['production_id']);
    await queryInterface.addIndex('production_materials', ['product_id']);
    
    await queryInterface.addIndex('production_history', ['production_id']);
    await queryInterface.addIndex('production_history', ['action_type']);
    await queryInterface.addIndex('production_history', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('production_history');
    await queryInterface.dropTable('production_materials');
    await queryInterface.dropTable('productions');
  }
};
