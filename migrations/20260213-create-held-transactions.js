'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('held_transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      holdNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        field: 'hold_number'
      },
      cashierId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'employees',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        field: 'cashier_id'
      },
      customerName: {
        type: Sequelize.STRING(255),
        allowNull: true,
        field: 'customer_name'
      },
      customerId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'customers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        field: 'customer_id'
      },
      
      // Transaction Data (JSON)
      cartItems: {
        type: Sequelize.JSONB,
        allowNull: false,
        field: 'cart_items'
      },
      subtotal: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      discount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      tax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      total: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      
      // Customer & Discount Info
      customerType: {
        type: Sequelize.STRING(20),
        defaultValue: 'walk-in',
        field: 'customer_type'
      },
      selectedMember: {
        type: Sequelize.JSONB,
        allowNull: true,
        field: 'selected_member'
      },
      selectedVoucher: {
        type: Sequelize.JSONB,
        allowNull: true,
        field: 'selected_voucher'
      },
      
      // Metadata
      holdReason: {
        type: Sequelize.STRING(255),
        allowNull: true,
        field: 'hold_reason'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      // Status & Timestamps
      status: {
        type: Sequelize.ENUM('held', 'resumed', 'cancelled', 'completed'),
        allowNull: false,
        defaultValue: 'held'
      },
      heldAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'held_at'
      },
      resumedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'resumed_at'
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'completed_at'
      },
      cancelledAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'cancelled_at'
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

    // Add indexes
    await queryInterface.addIndex('held_transactions', ['cashier_id'], {
      name: 'idx_held_transactions_cashier'
    });
    
    await queryInterface.addIndex('held_transactions', ['status'], {
      name: 'idx_held_transactions_status'
    });
    
    await queryInterface.addIndex('held_transactions', ['held_at'], {
      name: 'idx_held_transactions_held_at'
    });
    
    await queryInterface.addIndex('held_transactions', ['hold_number'], {
      name: 'idx_held_transactions_hold_number'
    });

    // Add columns to pos_transactions table
    await queryInterface.addColumn('pos_transactions', 'held_transaction_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'held_transactions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('pos_transactions', 'was_held', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns from pos_transactions
    await queryInterface.removeColumn('pos_transactions', 'was_held');
    await queryInterface.removeColumn('pos_transactions', 'held_transaction_id');
    
    // Drop table
    await queryInterface.dropTable('held_transactions');
  }
};
