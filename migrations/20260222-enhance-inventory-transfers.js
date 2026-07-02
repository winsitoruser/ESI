'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if inventory_transfers table exists
    const tableExists = await queryInterface.describeTable('inventory_transfers');
    
    if (tableExists) {
      // Add new status to ENUM if not exists
      await queryInterface.changeColumn('inventory_transfers', 'status', {
        type: Sequelize.ENUM(
          'requested',
          'approved',
          'rejected',
          'in_transit',  // New status
          'received',
          'completed',
          'cancelled'
        ),
        allowNull: false,
        defaultValue: 'requested'
      });

      // Add tracking fields
      await queryInterface.addColumn('inventory_transfers', 'shipped_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When items were shipped from source'
      });

      await queryInterface.addColumn('inventory_transfers', 'shipped_by', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: 'User who marked as shipped'
      });

      await queryInterface.addColumn('inventory_transfers', 'received_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When items were received at destination'
      });

      await queryInterface.addColumn('inventory_transfers', 'received_by', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: 'User who confirmed receipt'
      });

      // Add branch IDs for multi-branch support
      await queryInterface.addColumn('inventory_transfers', 'from_branch_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });

      await queryInterface.addColumn('inventory_transfers', 'to_branch_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });

      // Add indexes
      await queryInterface.addIndex('inventory_transfers', ['status']);
      await queryInterface.addIndex('inventory_transfers', ['from_branch_id']);
      await queryInterface.addIndex('inventory_transfers', ['to_branch_id']);
      await queryInterface.addIndex('inventory_transfers', ['shipped_at']);
      await queryInterface.addIndex('inventory_transfers', ['received_at']);
    }

    // Update inventory_transfer_items table
    const itemsTableExists = await queryInterface.describeTable('inventory_transfer_items');
    
    if (itemsTableExists) {
      await queryInterface.addColumn('inventory_transfer_items', 'quantity_shipped', {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Actual quantity shipped'
      });

      await queryInterface.addColumn('inventory_transfer_items', 'quantity_received', {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Actual quantity received'
      });

      await queryInterface.addColumn('inventory_transfer_items', 'batch_number', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Batch/lot number for tracking'
      });

      await queryInterface.addColumn('inventory_transfer_items', 'expiry_date', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Expiry date for perishable items'
      });

      await queryInterface.addColumn('inventory_transfer_items', 'notes', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Item-specific notes'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('inventory_transfers', ['status']);
    await queryInterface.removeIndex('inventory_transfers', ['from_branch_id']);
    await queryInterface.removeIndex('inventory_transfers', ['to_branch_id']);
    await queryInterface.removeIndex('inventory_transfers', ['shipped_at']);
    await queryInterface.removeIndex('inventory_transfers', ['received_at']);

    // Remove columns from inventory_transfers
    await queryInterface.removeColumn('inventory_transfers', 'shipped_at');
    await queryInterface.removeColumn('inventory_transfers', 'shipped_by');
    await queryInterface.removeColumn('inventory_transfers', 'received_at');
    await queryInterface.removeColumn('inventory_transfers', 'received_by');
    await queryInterface.removeColumn('inventory_transfers', 'from_branch_id');
    await queryInterface.removeColumn('inventory_transfers', 'to_branch_id');

    // Revert status ENUM to original values
    await queryInterface.changeColumn('inventory_transfers', 'status', {
      type: Sequelize.ENUM(
        'requested',
        'approved',
        'rejected',
        'received',
        'completed',
        'cancelled'
      ),
      allowNull: false,
      defaultValue: 'requested'
    });

    // Remove columns from inventory_transfer_items
    await queryInterface.removeColumn('inventory_transfer_items', 'quantity_shipped');
    await queryInterface.removeColumn('inventory_transfer_items', 'quantity_received');
    await queryInterface.removeColumn('inventory_transfer_items', 'batch_number');
    await queryInterface.removeColumn('inventory_transfer_items', 'expiry_date');
    await queryInterface.removeColumn('inventory_transfer_items', 'notes');
  }
};
