'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create stock_opnames table
    await queryInterface.createTable('stock_opnames', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      opname_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      opname_type: {
        type: Sequelize.ENUM('full', 'cycle', 'spot'),
        defaultValue: 'full'
      },
      warehouse_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'warehouses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      location_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'locations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status: {
        type: Sequelize.ENUM('draft', 'in_progress', 'completed', 'approved', 'posted', 'cancelled'),
        defaultValue: 'draft'
      },
      scheduled_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      performed_by: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      supervised_by: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      approved_by: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      approved_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      total_items: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      counted_items: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      items_with_variance: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      total_variance_value: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      freeze_inventory: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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

    // Create stock_opname_items table
    await queryInterface.createTable('stock_opname_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      stock_opname_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'stock_opnames',
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
      location_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'locations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      system_stock: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      physical_stock: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      difference: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      variance_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0
      },
      unit_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      variance_value: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      variance_category: {
        type: Sequelize.ENUM('none', 'minor', 'moderate', 'major'),
        defaultValue: 'none'
      },
      status: {
        type: Sequelize.ENUM('pending', 'counted', 'verified', 'investigated', 'approved'),
        defaultValue: 'pending'
      },
      counted_by: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      count_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      recount_required: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      recount_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      recount_by: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      recount_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      root_cause: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      corrective_action: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      notes: {
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

    // Create incident_reports table
    await queryInterface.createTable('incident_reports', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      incident_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      stock_opname_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'stock_opnames',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      stock_opname_item_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'stock_opname_items',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
      variance_quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      variance_value: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      variance_category: {
        type: Sequelize.ENUM('minor', 'moderate', 'major'),
        allowNull: false
      },
      why_1: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      why_2: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      why_3: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      why_4: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      why_5: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      root_cause: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      evidence_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      witness_statement: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      immediate_action: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      corrective_action: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      preventive_action: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      responsible_person: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      target_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      approval_level: {
        type: Sequelize.ENUM('Supervisor', 'Manajer', 'Direktur/GM'),
        allowNull: false
      },
      approval_status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending'
      },
      approved_by: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      approved_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      approver_comments: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
    await queryInterface.addIndex('stock_opname_items', ['stock_opname_id']);
    await queryInterface.addIndex('stock_opname_items', ['product_id']);
    await queryInterface.addIndex('stock_opname_items', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('incident_reports');
    await queryInterface.dropTable('stock_opname_items');
    await queryInterface.dropTable('stock_opnames');
  }
};
