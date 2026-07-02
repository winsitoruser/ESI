'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create pos_transactions table
    await queryInterface.createTable('pos_transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      transactionNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        field: 'transaction_number'
      },
      shiftId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'shift_id'
      },
      customerId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'customer_id'
      },
      customerName: {
        type: Sequelize.STRING(255),
        allowNull: true,
        field: 'customer_name'
      },
      cashierId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'cashier_id'
      },
      transactionDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'transaction_date'
      },
      subtotal: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      taxAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'tax_amount'
      },
      discountAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'discount_amount'
      },
      serviceCharge: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'service_charge'
      },
      totalAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        field: 'total_amount'
      },
      paymentMethod: {
        type: Sequelize.ENUM('cash', 'card', 'transfer', 'ewallet', 'mixed'),
        allowNull: false,
        field: 'payment_method'
      },
      paymentStatus: {
        type: Sequelize.ENUM('pending', 'paid', 'refunded', 'void'),
        allowNull: false,
        defaultValue: 'paid',
        field: 'payment_status'
      },
      tableNumber: {
        type: Sequelize.STRING(20),
        allowNull: true,
        field: 'table_number'
      },
      orderType: {
        type: Sequelize.ENUM('dine-in', 'takeaway', 'delivery'),
        allowNull: false,
        defaultValue: 'dine-in',
        field: 'order_type'
      },
      status: {
        type: Sequelize.ENUM('open', 'closed', 'void'),
        allowNull: false,
        defaultValue: 'closed'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      kitchenOrderId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'kitchen_order_id'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'updated_at'
      }
    });

    // Create indexes
    await queryInterface.addIndex('pos_transactions', ['transaction_number']);
    await queryInterface.addIndex('pos_transactions', ['cashier_id']);
    await queryInterface.addIndex('pos_transactions', ['customer_id']);
    await queryInterface.addIndex('pos_transactions', ['transaction_date']);
    await queryInterface.addIndex('pos_transactions', ['status']);
    await queryInterface.addIndex('pos_transactions', ['kitchen_order_id']);

    // Create pos_transaction_items table
    await queryInterface.createTable('pos_transaction_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      posTransactionId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'pos_transaction_id',
        references: {
          model: 'pos_transactions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'product_id'
      },
      productName: {
        type: Sequelize.STRING(255),
        allowNull: false,
        field: 'product_name'
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      unitPrice: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        field: 'unit_price'
      },
      totalPrice: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        field: 'total_price'
      },
      discountAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'discount_amount'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      modifiers: {
        type: Sequelize.JSON,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'updated_at'
      }
    });

    // Create indexes for pos_transaction_items
    await queryInterface.addIndex('pos_transaction_items', ['pos_transaction_id']);
    await queryInterface.addIndex('pos_transaction_items', ['product_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('pos_transaction_items');
    await queryInterface.dropTable('pos_transactions');
  }
};
