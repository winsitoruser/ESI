'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create kitchen_orders table
    await queryInterface.createTable('kitchen_orders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      order_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      pos_transaction_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'pos_transactions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      table_number: {
        type: Sequelize.STRING,
        allowNull: true
      },
      order_type: {
        type: Sequelize.ENUM('dine-in', 'takeaway', 'delivery'),
        allowNull: false,
        defaultValue: 'dine-in'
      },
      customer_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('new', 'preparing', 'ready', 'served', 'cancelled'),
        allowNull: false,
        defaultValue: 'new'
      },
      priority: {
        type: Sequelize.ENUM('normal', 'urgent'),
        allowNull: false,
        defaultValue: 'normal'
      },
      received_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      served_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      estimated_time: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Estimated preparation time in minutes'
      },
      actual_prep_time: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Actual preparation time in minutes'
      },
      assignedChefId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'assigned_chef_id'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      total_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
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
    await queryInterface.addIndex('kitchen_orders', ['tenant_id']);
    await queryInterface.addIndex('kitchen_orders', ['order_number']);
    await queryInterface.addIndex('kitchen_orders', ['status']);
    await queryInterface.addIndex('kitchen_orders', ['order_type']);
    await queryInterface.addIndex('kitchen_orders', ['received_at']);
    await queryInterface.addIndex('kitchen_orders', ['pos_transaction_id']);

    // Create kitchen_order_items table
    await queryInterface.createTable('kitchen_order_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      kitchenOrderId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'kitchen_order_id'
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'product_id'
      },
      recipeId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'recipe_id'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Special instructions or modifications'
      },
      modifiers: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of modifiers like extra sauce, no onions, etc.'
      },
      status: {
        type: Sequelize.ENUM('pending', 'preparing', 'ready'),
        allowNull: false,
        defaultValue: 'pending'
      },
      preparedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'prepared_by'
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

    // Create indexes for kitchen_order_items
    await queryInterface.addIndex('kitchen_order_items', ['kitchen_order_id']);
    await queryInterface.addIndex('kitchen_order_items', ['product_id']);
    await queryInterface.addIndex('kitchen_order_items', ['recipe_id']);
    await queryInterface.addIndex('kitchen_order_items', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('kitchen_order_items');
    await queryInterface.dropTable('kitchen_orders');
  }
};
