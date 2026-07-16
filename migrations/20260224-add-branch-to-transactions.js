'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add branchId to PosTransactions
    try { await queryInterface.addColumn('pos_transactions', 'branch_id', {
      type: Sequelize.UUID,
      allowNull: true, // Allow null for existing data
      references: {
        model: 'branches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    }); } catch (err) {}

    // Add branchId to StockMovements
    try { await queryInterface.addColumn('stock_movements', 'branch_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    }); } catch (err) {}

    // Add branchId to FinanceTransactions
    try { await queryInterface.addColumn('finance_transactions', 'branch_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    }); } catch (err) {}

    // Add branchId to Productions
    try { await queryInterface.addColumn('productions', 'branch_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    }); } catch (err) {}

    // Add branchId to Shifts
    try { await queryInterface.addColumn('shifts', 'branch_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    }); } catch (err) {}

    // Add indexes for performance
    try { await queryInterface.addIndex('pos_transactions', ['branch_id']); } catch (err) {}
    try { await queryInterface.addIndex('stock_movements', ['branch_id']); } catch (err) {}
    try { await queryInterface.addIndex('finance_transactions', ['branch_id']); } catch (err) {}
    try { await queryInterface.addIndex('productions', ['branch_id']); } catch (err) {}
    try { await queryInterface.addIndex('shifts', ['branch_id']); } catch (err) {}
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('pos_transactions', ['branch_id']);
    await queryInterface.removeIndex('stock_movements', ['branch_id']);
    await queryInterface.removeIndex('finance_transactions', ['branch_id']);
    await queryInterface.removeIndex('productions', ['branch_id']);
    await queryInterface.removeIndex('shifts', ['branch_id']);

    // Remove columns
    await queryInterface.removeColumn('pos_transactions', 'branch_id');
    await queryInterface.removeColumn('stock_movements', 'branch_id');
    await queryInterface.removeColumn('finance_transactions', 'branch_id');
    await queryInterface.removeColumn('productions', 'branch_id');
    await queryInterface.removeColumn('shifts', 'branch_id');
  }
};
