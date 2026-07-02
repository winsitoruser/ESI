'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create inventory_transfers table
    await queryInterface.createTable('inventory_transfers', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      transfer_number: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false,
        comment: 'Nomor unik transfer (TRF-YYYY-####)'
      },
      from_location_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      to_location_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      request_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      priority: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'normal',
        comment: 'normal, urgent, emergency'
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'requested',
        comment: 'requested, approved, rejected, in_preparation, in_transit, received, completed, cancelled'
      },
      approved_by: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      approval_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      approval_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      shipment_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      tracking_number: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      courier: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      estimated_arrival: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      shipped_by: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      received_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      received_by: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      receipt_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      total_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      shipping_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      handling_fee: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      attachments: {
        type: Sequelize.JSON,
        allowNull: true
      },
      requested_by: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create inventory_transfer_items table
    await queryInterface.createTable('inventory_transfer_items', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      transfer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'inventory_transfers',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      product_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      product_sku: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      quantity_requested: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      quantity_approved: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      quantity_shipped: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      quantity_received: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      condition_on_receipt: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'good, damaged, missing, partial'
      },
      unit_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      subtotal: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create inventory_transfer_history table
    await queryInterface.createTable('inventory_transfer_history', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      transfer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'inventory_transfers',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      status_from: {
        type: Sequelize.STRING(30),
        allowNull: true
      },
      status_to: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      changed_by: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      changed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('inventory_transfers', ['transfer_number'], { name: 'idx_transfers_number' });
    await queryInterface.addIndex('inventory_transfers', ['from_location_id'], { name: 'idx_transfers_from_location' });
    await queryInterface.addIndex('inventory_transfers', ['to_location_id'], { name: 'idx_transfers_to_location' });
    await queryInterface.addIndex('inventory_transfers', ['status'], { name: 'idx_transfers_status' });
    await queryInterface.addIndex('inventory_transfers', ['request_date'], { name: 'idx_transfers_request_date' });
    await queryInterface.addIndex('inventory_transfers', ['priority'], { name: 'idx_transfers_priority' });
    await queryInterface.addIndex('inventory_transfers', ['requested_by'], { name: 'idx_transfers_requested_by' });

    await queryInterface.addIndex('inventory_transfer_items', ['transfer_id'], { name: 'idx_transfer_items_transfer' });
    await queryInterface.addIndex('inventory_transfer_items', ['product_id'], { name: 'idx_transfer_items_product' });

    await queryInterface.addIndex('inventory_transfer_history', ['transfer_id'], { name: 'idx_transfer_history_transfer' });
    await queryInterface.addIndex('inventory_transfer_history', ['changed_at'], { name: 'idx_transfer_history_date' });

    console.log('✅ Created inventory transfers tables');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('inventory_transfer_history');
    await queryInterface.dropTable('inventory_transfer_items');
    await queryInterface.dropTable('inventory_transfers');
  }
};
