'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create finance_reconciliations table
    await queryInterface.createTable('finance_reconciliations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
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
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'start_date'
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'end_date'
      },
      posTotal: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        field: 'pos_total',
        comment: 'Total from POS transactions'
      },
      financeTotal: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        field: 'finance_total',
        comment: 'Total from finance transactions'
      },
      cashExpected: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        field: 'cash_expected',
        comment: 'Expected cash from shifts'
      },
      cashActual: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        field: 'cash_actual',
        comment: 'Actual cash counted'
      },
      cashDifference: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        field: 'cash_difference',
        comment: 'Difference between expected and actual cash'
      },
      status: {
        type: Sequelize.ENUM('balanced', 'minor_issues', 'requires_attention'),
        allowNull: false,
        defaultValue: 'balanced'
      },
      discrepanciesData: {
        type: Sequelize.JSON,
        allowNull: true,
        field: 'discrepancies_data',
        comment: 'Details of any discrepancies found'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      reviewedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'reviewed_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      reviewedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'reviewed_at'
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
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
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
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'updated_at'
      }
    });

    // Add indexes
    await queryInterface.addIndex('finance_reconciliations', ['branch_id']);
    await queryInterface.addIndex('finance_reconciliations', ['start_date', 'end_date']);
    await queryInterface.addIndex('finance_reconciliations', ['status']);
    await queryInterface.addIndex('finance_reconciliations', ['tenant_id']);
    await queryInterface.addIndex('finance_reconciliations', ['created_at']);

    // Add unique constraint for branch and date range
    await queryInterface.addIndex('finance_reconciliations', ['branch_id', 'start_date', 'end_date'], {
      unique: true,
      name: 'finance_reconciliation_branch_date_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('finance_reconciliations', 'finance_reconciliation_branch_date_unique');
    await queryInterface.removeIndex('finance_reconciliations', ['created_at']);
    await queryInterface.removeIndex('finance_reconciliations', ['tenant_id']);
    await queryInterface.removeIndex('finance_reconciliations', ['status']);
    await queryInterface.removeIndex('finance_reconciliations', ['start_date', 'end_date']);
    await queryInterface.removeIndex('finance_reconciliations', ['branch_id']);

    // Drop table
    await queryInterface.dropTable('finance_reconciliations');
  }
};
