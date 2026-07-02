'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create wastage_records table
    await queryInterface.createTable('wastage_records', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      wasteNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        field: 'waste_number'
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'branch_id',
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'product_id',
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      unit: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      costPerUnit: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        field: 'cost_per_unit'
      },
      totalCost: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        field: 'total_cost'
      },
      wasteType: {
        type: Sequelize.ENUM('spoilage', 'error', 'theft', 'expired', 'damage', 'other'),
        allowNull: false,
        field: 'waste_type'
      },
      reason: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      wasteDate: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'waste_date'
      },
      reportedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'reported_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      verifiedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'verified_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      verifiedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'verified_at'
      },
      actionTaken: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'action_taken'
      },
      photoUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
        field: 'photo_url'
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
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'updated_at'
      }
    });

    // Create inter_branch_balances table
    await queryInterface.createTable('inter_branch_balances', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      fromBranchId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'from_branch_id',
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      toBranchId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'to_branch_id',
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      transactionType: {
        type: Sequelize.ENUM('stock_transfer', 'settlement', 'loan', 'payment'),
        allowNull: false,
        field: 'transaction_type'
      },
      referenceId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'reference_id',
        comment: 'Reference to transfer, settlement, or other transaction'
      },
      referenceType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        field: 'reference_type'
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Amount owed (positive) or to be received (negative)'
      },
      status: {
        type: Sequelize.ENUM('pending', 'partial', 'cleared', 'overdue'),
        allowNull: false,
        defaultValue: 'pending'
      },
      dueDate: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'due_date'
      },
      clearedAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'cleared_amount'
      },
      lastPaymentDate: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'last_payment_date'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'created_by',
        references: {
          model: 'users',
          key: 'id'
        }
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
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'updated_at'
      }
    });

    // Add is_standard to product_prices table
    await queryInterface.addColumn('product_prices', 'is_standard', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_standard',
      comment: 'If true, branch cannot modify price locally'
    });

    // Add distributed_at to productions table
    await queryInterface.addColumn('productions', 'distributed_at', {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'distributed_at',
      comment: 'When production was distributed to branches'
    });

    // Add indexes for wastage_records
    await queryInterface.addIndex('wastage_records', ['waste_number'], { unique: true });
    await queryInterface.addIndex('wastage_records', ['branch_id']);
    await queryInterface.addIndex('wastage_records', ['product_id']);
    await queryInterface.addIndex('wastage_records', ['waste_type']);
    await queryInterface.addIndex('wastage_records', ['waste_date']);
    await queryInterface.addIndex('wastage_records', ['reported_by']);
    await queryInterface.addIndex('wastage_records', ['tenant_id']);

    // Add indexes for inter_branch_balances
    await queryInterface.addIndex('inter_branch_balances', ['from_branch_id', 'to_branch_id']);
    await queryInterface.addIndex('inter_branch_balances', ['reference_id', 'reference_type']);
    await queryInterface.addIndex('inter_branch_balances', ['transaction_type']);
    await queryInterface.addIndex('inter_branch_balances', ['status']);
    await queryInterface.addIndex('inter_branch_balances', ['due_date']);
    await queryInterface.addIndex('inter_branch_balances', ['tenant_id']);

    // Add index for product_prices is_standard
    await queryInterface.addIndex('product_prices', ['is_standard']);

    // Create trigger to update inter_branch_balances when transfers are completed
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION update_inter_branch_balance()
      RETURNS TRIGGER AS $$
      BEGIN
        -- When transfer is received, update the balance
        IF NEW.status = 'received' AND OLD.status != 'received' THEN
          UPDATE inter_branch_balances SET
            status = CASE 
              WHEN ABS(amount - cleared_amount - NEW.total_price) < 0.01 THEN 'cleared'
              WHEN cleared_amount > 0 THEN 'partial'
              ELSE 'pending'
            END,
            cleared_amount = LEAST(cleared_amount + NEW.total_price, amount),
            last_payment_date = NOW(),
            updated_at = NOW()
          WHERE reference_id = NEW.id
          AND reference_type = 'transfer';
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER trigger_update_inter_branch_balance
        AFTER UPDATE ON inventory_transfers
        FOR EACH ROW
        EXECUTE FUNCTION update_inter_branch_balance();
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop triggers
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trigger_update_inter_branch_balance');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS update_inter_branch_balance()');

    // Remove indexes
    await queryInterface.removeIndex('product_prices', ['is_standard']);
    
    await queryInterface.removeIndex('inter_branch_balances', ['tenant_id']);
    await queryInterface.removeIndex('inter_branch_balances', ['due_date']);
    await queryInterface.removeIndex('inter_branch_balances', ['status']);
    await queryInterface.removeIndex('inter_branch_balances', ['transaction_type']);
    await queryInterface.removeIndex('inter_branch_balances', ['reference_id', 'reference_type']);
    await queryInterface.removeIndex('inter_branch_balances', ['from_branch_id', 'to_branch_id']);
    
    await queryInterface.removeIndex('wastage_records', ['tenant_id']);
    await queryInterface.removeIndex('wastage_records', ['reported_by']);
    await queryInterface.removeIndex('wastage_records', ['waste_date']);
    await queryInterface.removeIndex('wastage_records', ['waste_type']);
    await queryInterface.removeIndex('wastage_records', ['product_id']);
    await queryInterface.removeIndex('wastage_records', ['branch_id']);
    await queryInterface.removeIndex('wastage_records', ['waste_number']);

    // Remove columns
    await queryInterface.removeColumn('productions', 'distributed_at');
    await queryInterface.removeColumn('product_prices', 'is_standard');

    // Drop tables
    await queryInterface.dropTable('inter_branch_balances');
    await queryInterface.dropTable('wastage_records');
  }
};
