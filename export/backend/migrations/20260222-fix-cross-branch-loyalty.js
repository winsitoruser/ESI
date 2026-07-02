'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add tenant_id to customer_loyalty table for cross-branch support
    await queryInterface.addColumn('customer_loyalty', 'tenant_id', {
      type: Sequelize.UUID,
      allowNull: false,
      field: 'tenant_id',
      references: {
        model: 'tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Tenant ID for cross-branch loyalty support'
    });

    // Add index for tenant_id
    await queryInterface.addIndex('customer_loyalty', ['tenant_id']);

    // Create unique constraint for customer-program-tenant combination
    await queryInterface.addIndex('customer_loyalty', ['customerId', 'programId', 'tenant_id'], {
      unique: true,
      name: 'customer_loyalty_customer_program_tenant_unique'
    });

    // Update loyalty_points table to include tenant_id
    const loyaltyPointsTableExists = await queryInterface.describeTable('loyalty_points');
    
    if (loyaltyPointsTableExists) {
      await queryInterface.addColumn('loyalty_points', 'tenant_id', {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Tenant ID for cross-branch loyalty tracking'
      });

      await queryInterface.addColumn('loyalty_points', 'branch_id', {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'branch_id',
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Branch where points were earned/redeemed'
      });

      // Add indexes
      await queryInterface.addIndex('loyalty_points', ['tenant_id']);
      await queryInterface.addIndex('loyalty_points', ['branch_id']);
      await queryInterface.addIndex('loyalty_points', ['customer_id', 'tenant_id']);
    }

    // Create loyalty_transactions table for detailed tracking
    await queryInterface.createTable('loyalty_transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      customerId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'customer_id',
        references: {
          model: 'customers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'branch_id',
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      transactionType: {
        type: Sequelize.ENUM('earned', 'redeemed', 'expired', 'adjusted', 'refunded'),
        allowNull: false,
        field: 'transaction_type'
      },
      points: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Points amount (positive for earned, negative for redeemed)'
      },
      balanceAfter: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'balance_after',
        comment: 'Customer points balance after this transaction'
      },
      referenceType: {
        type: Sequelize.ENUM('pos_transaction', 'manual_adjustment', 'reward_redemption', 'expiry', 'refund'),
        allowNull: false,
        field: 'reference_type'
      },
      referenceId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'reference_id',
        comment: 'Reference to related transaction'
      },
      referenceNumber: {
        type: Sequelize.STRING(100),
        allowNull: true,
        field: 'reference_number',
        comment: 'Transaction number for reference'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Transaction description'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional transaction metadata'
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'created_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
      }
    });

    // Add indexes for loyalty_transactions
    await queryInterface.addIndex('loyalty_transactions', ['customer_id', 'tenant_id']);
    await queryInterface.addIndex('loyalty_transactions', ['branch_id']);
    await queryInterface.addIndex('loyalty_transactions', ['transaction_type']);
    await queryInterface.addIndex('loyalty_transactions', ['reference_type', 'reference_id']);
    await queryInterface.addIndex('loyalty_transactions', ['created_at']);

    // Update existing customer_loyalty records to have tenant_id
    // This assumes all existing loyalty records belong to their customer's tenant
    await queryInterface.sequelize.query(`
      UPDATE customer_loyalty cl
      SET tenant_id = c.tenant_id
      FROM customers c
      WHERE cl.customer_id = c.id
      AND cl.tenant_id IS NULL
    `);

    // Update existing loyalty_points if table exists
    if (loyaltyPointsTableExists) {
      await queryInterface.sequelize.query(`
        UPDATE loyalty_points lp
        SET tenant_id = c.tenant_id
        FROM customers c
        WHERE lp.customer_id = c.id
        AND lp.tenant_id IS NULL
      `);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Drop indexes first
    await queryInterface.removeIndex('loyalty_transactions', ['created_at']);
    await queryInterface.removeIndex('loyalty_transactions', ['reference_type', 'reference_id']);
    await queryInterface.removeIndex('loyalty_transactions', ['transaction_type']);
    await queryInterface.removeIndex('loyalty_transactions', ['branch_id']);
    await queryInterface.removeIndex('loyalty_transactions', ['customer_id', 'tenant_id']);
    
    // Drop tables
    await queryInterface.dropTable('loyalty_transactions');

    // Remove columns from loyalty_points if exists
    const loyaltyPointsTableExists = await queryInterface.describeTable('loyalty_points');
    if (loyaltyPointsTableExists) {
      await queryInterface.removeIndex('loyalty_points', ['customer_id', 'tenant_id']);
      await queryInterface.removeIndex('loyalty_points', ['branch_id']);
      await queryInterface.removeIndex('loyalty_points', ['tenant_id']);
      
      await queryInterface.removeColumn('loyalty_points', 'branch_id');
      await queryInterface.removeColumn('loyalty_points', 'tenant_id');
    }

    // Remove indexes and column from customer_loyalty
    await queryInterface.removeIndex('customer_loyalty', 'customer_loyalty_customer_program_tenant_unique');
    await queryInterface.removeIndex('customer_loyalty', ['tenant_id']);
    await queryInterface.removeColumn('customer_loyalty', 'tenant_id');
  }
};
