'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create rac_requests table
    await queryInterface.createTable('rac_requests', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      request_number: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false
      },
      request_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'rac, restock, emergency'
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
      required_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'draft',
        comment: 'draft, submitted, approved, rejected, processing, shipped, received, completed, cancelled'
      },
      priority: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'medium',
        comment: 'low, medium, high, critical'
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      requested_by: {
        type: Sequelize.STRING(100),
        allowNull: false
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
      processed_by: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      processing_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      shipped_by: {
        type: Sequelize.STRING(100),
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
      received_by: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      received_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      receipt_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      completed_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      cancelled_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      attachments: {
        type: Sequelize.JSON,
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

    // Create rac_request_items table
    await queryInterface.createTable('rac_request_items', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      request_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'rac_requests',
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
        allowNull: false
      },
      current_stock: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      requested_qty: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      approved_qty: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      shipped_qty: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      received_qty: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      unit: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'pcs'
      },
      urgency: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'normal',
        comment: 'normal, urgent, critical'
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

    // Create rac_request_history table
    await queryInterface.createTable('rac_request_history', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      request_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'rac_requests',
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
    await queryInterface.addIndex('rac_requests', ['request_number'], { name: 'idx_rac_requests_number' });
    await queryInterface.addIndex('rac_requests', ['from_location_id'], { name: 'idx_rac_requests_from_location' });
    await queryInterface.addIndex('rac_requests', ['to_location_id'], { name: 'idx_rac_requests_to_location' });
    await queryInterface.addIndex('rac_requests', ['status'], { name: 'idx_rac_requests_status' });
    await queryInterface.addIndex('rac_requests', ['priority'], { name: 'idx_rac_requests_priority' });
    await queryInterface.addIndex('rac_requests', ['request_date'], { name: 'idx_rac_requests_request_date' });
    await queryInterface.addIndex('rac_requests', ['required_date'], { name: 'idx_rac_requests_required_date' });
    await queryInterface.addIndex('rac_requests', ['requested_by'], { name: 'idx_rac_requests_requested_by' });
    await queryInterface.addIndex('rac_requests', ['request_type'], { name: 'idx_rac_requests_type' });

    await queryInterface.addIndex('rac_request_items', ['request_id'], { name: 'idx_rac_items_request_id' });
    await queryInterface.addIndex('rac_request_items', ['product_id'], { name: 'idx_rac_items_product_id' });
    await queryInterface.addIndex('rac_request_items', ['urgency'], { name: 'idx_rac_items_urgency' });

    await queryInterface.addIndex('rac_request_history', ['request_id'], { name: 'idx_rac_history_request_id' });
    await queryInterface.addIndex('rac_request_history', ['changed_at'], { name: 'idx_rac_history_changed_at' });

    console.log('✅ Created RAC system tables');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('rac_request_history');
    await queryInterface.dropTable('rac_request_items');
    await queryInterface.dropTable('rac_requests');
  }
};
