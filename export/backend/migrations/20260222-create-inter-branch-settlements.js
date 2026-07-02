'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create inter-branch settlements table
    await queryInterface.createTable('inter_branch_settlements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      settlementNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
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
      settlementType: {
        type: Sequelize.ENUM(
          'cash_transfer',
          'stock_transfer_value',
          'expense_sharing',
          'revenue_sharing',
          'loan_repayment',
          'other'
        ),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'IDR'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      referenceType: {
        type: Sequelize.ENUM(
          'inventory_transfer',
          'expense_report',
          'revenue_report',
          'manual',
          'other'
        ),
        allowNull: false,
        defaultValue: 'manual'
      },
      referenceId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'reference_id',
        comment: 'Reference to related document (e.g., inventory transfer ID)'
      },
      settlementDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      dueDate: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'due_date',
        comment: 'Due date for payment if this is a payable'
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'paid', 'cancelled', 'overdue'),
        allowNull: false,
        defaultValue: 'pending'
      },
      approvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'approved_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'approved_at'
      },
      paidBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'paid_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      paidAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'paid_at'
      },
      paymentMethod: {
        type: Sequelize.ENUM('cash', 'transfer', 'bank_transfer', 'offset'),
        allowNull: true,
        field: 'payment_method'
      },
      paymentReference: {
        type: Sequelize.STRING(100),
        allowNull: true,
        field: 'payment_reference',
        comment: 'Bank transfer reference, check number, etc.'
      },
      attachments: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of supporting document URLs'
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
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'updated_by',
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

    // Add indexes
    await queryInterface.addIndex('inter_branch_settlements', ['settlement_number'], { unique: true });
    await queryInterface.addIndex('inter_branch_settlements', ['from_branch_id']);
    await queryInterface.addIndex('inter_branch_settlements', ['to_branch_id']);
    await queryInterface.addIndex('inter_branch_settlements', ['status']);
    await queryInterface.addIndex('inter_branch_settlements', ['settlement_type']);
    await queryInterface.addIndex('inter_branch_settlements', ['settlement_date']);
    await queryInterface.addIndex('inter_branch_settlements', ['due_date']);
    await queryInterface.addIndex('inter_branch_settlements', ['tenant_id']);

    // Create settlement history table for audit trail
    await queryInterface.createTable('inter_branch_settlement_history', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      settlementId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'settlement_id',
        references: {
          model: 'inter_branch_settlements',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      action: {
        type: Sequelize.ENUM('created', 'approved', 'paid', 'cancelled', 'modified'),
        allowNull: false
      },
      oldValue: {
        type: Sequelize.JSON,
        allowNull: true,
        field: 'old_value'
      },
      newValue: {
        type: Sequelize.JSON,
        allowNull: true,
        field: 'new_value'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      ipAddress: {
        type: Sequelize.STRING(45),
        allowNull: true,
        field: 'ip_address'
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'user_agent'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
      }
    });

    // Add indexes for history table
    await queryInterface.addIndex('inter_branch_settlement_history', ['settlement_id']);
    await queryInterface.addIndex('inter_branch_settlement_history', ['action']);
    await queryInterface.addIndex('inter_branch_settlement_history', ['user_id']);
    await queryInterface.addIndex('inter_branch_settlement_history', ['created_at']);

    // Add petty cash accounts per branch
    await queryInterface.createTable('branch_petty_cash', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        field: 'branch_id',
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      currentBalance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'current_balance'
      },
      lastReplenishedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'last_replenished_at'
      },
      lastReplenishedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'last_replenished_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      monthlyLimit: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        field: 'monthly_limit',
        comment: 'Monthly limit for petty cash usage'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
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

    // Add indexes for petty cash table
    await queryInterface.addIndex('branch_petty_cash', ['branch_id'], { unique: true });
    await queryInterface.addIndex('branch_petty_cash', ['tenant_id']);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop indexes first
    await queryInterface.removeIndex('branch_petty_cash', ['tenant_id']);
    await queryInterface.removeIndex('branch_petty_cash', ['branch_id']);
    
    await queryInterface.removeIndex('inter_branch_settlement_history', ['created_at']);
    await queryInterface.removeIndex('inter_branch_settlement_history', ['user_id']);
    await queryInterface.removeIndex('inter_branch_settlement_history', ['action']);
    await queryInterface.removeIndex('inter_branch_settlement_history', ['settlement_id']);
    
    await queryInterface.removeIndex('inter_branch_settlements', ['tenant_id']);
    await queryInterface.removeIndex('inter_branch_settlements', ['due_date']);
    await queryInterface.removeIndex('inter_branch_settlements', ['settlement_date']);
    await queryInterface.removeIndex('inter_branch_settlements', ['settlement_type']);
    await queryInterface.removeIndex('inter_branch_settlements', ['status']);
    await queryInterface.removeIndex('inter_branch_settlements', ['to_branch_id']);
    await queryInterface.removeIndex('inter_branch_settlements', ['from_branch_id']);
    await queryInterface.removeIndex('inter_branch_settlements', ['settlement_number']);

    // Drop tables
    await queryInterface.dropTable('branch_petty_cash');
    await queryInterface.dropTable('inter_branch_settlement_history');
    await queryInterface.dropTable('inter_branch_settlements');
  }
};
