'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create kitchen_inventory_items table
    await queryInterface.createTable('kitchen_inventory_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Link to main inventory product for sync (removed FK due to type mismatch)'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Protein, Vegetables, Carbs, Spices, etc.'
      },
      current_stock: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
      },
      unit: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'kg, gram, liter, ml, pcs, etc.'
      },
      min_stock: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
      },
      max_stock: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
      },
      reorder_point: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
      },
      unit_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      total_value: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        comment: 'current_stock * unit_cost'
      },
      last_restocked: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('good', 'low', 'critical', 'overstock'),
        allowNull: false,
        defaultValue: 'good'
      },
      warehouse_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Reference to warehouse (removed FK due to missing table)'
      },
      location_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Reference to location (removed FK due to missing table)'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
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

    // Create indexes
    await queryInterface.addIndex('kitchen_inventory_items', ['tenant_id']);
    await queryInterface.addIndex('kitchen_inventory_items', ['product_id']);
    await queryInterface.addIndex('kitchen_inventory_items', ['category']);
    await queryInterface.addIndex('kitchen_inventory_items', ['status']);
    await queryInterface.addIndex('kitchen_inventory_items', ['warehouse_id']);
    await queryInterface.addIndex('kitchen_inventory_items', ['location_id']);

    // Create kitchen_inventory_transactions table
    await queryInterface.createTable('kitchen_inventory_transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      inventory_item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'Reference to kitchen inventory item'
      },
      transaction_type: {
        type: Sequelize.ENUM('in', 'out', 'adjustment', 'waste', 'transfer'),
        allowNull: false
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: false
      },
      unit: {
        type: Sequelize.STRING,
        allowNull: false
      },
      previous_stock: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true
      },
      new_stock: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true
      },
      reference_type: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'kitchen_order, recipe, manual, etc.'
      },
      reference_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      performed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Reference to user who performed transaction'
      },
      transaction_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
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

    // Create indexes for transactions
    await queryInterface.addIndex('kitchen_inventory_transactions', ['tenant_id']);
    await queryInterface.addIndex('kitchen_inventory_transactions', ['inventory_item_id']);
    await queryInterface.addIndex('kitchen_inventory_transactions', ['transaction_type']);
    await queryInterface.addIndex('kitchen_inventory_transactions', ['transaction_date']);
    await queryInterface.addIndex('kitchen_inventory_transactions', ['reference_type', 'reference_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('kitchen_inventory_transactions');
    await queryInterface.dropTable('kitchen_inventory_items');
  }
};
