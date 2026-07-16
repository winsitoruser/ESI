'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create purchase_requisitions table
    await queryInterface.createTable('purchase_requisitions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      prNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        field: 'pr_number'
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
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
      department: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'medium'
      },
      expectedDeliveryDate: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'expected_delivery_date'
      },
      vendorId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'vendor_id',
        references: {
          model: 'vendors',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'ordered', 'received', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      requestedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'requested_by',
        references: {
          model: 'users',
          key: 'id'
        }
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
      rejectionReason: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'rejection_reason'
      },
      orderReference: {
        type: Sequelize.STRING(100),
        allowNull: true,
        field: 'order_reference'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      attachmentUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
        field: 'attachment_url'
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

    // Create purchase_requisition_items table
    await queryInterface.createTable('purchase_requisition_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      prId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'pr_id',
        references: {
          model: 'purchase_requisitions',
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
      productName: {
        type: Sequelize.STRING(200),
        allowNull: false,
        field: 'product_name'
      },
      sku: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      unit: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      unitPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        field: 'unit_price'
      },
      totalPrice: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        field: 'total_price'
      },
      receivedQuantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'received_quantity'
      },
      notes: {
        type: Sequelize.TEXT,
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

    // Add indexes for purchase_requisitions
    await queryInterface.addIndex('purchase_requisitions', ['pr_number'], { unique: true });
    await queryInterface.addIndex('purchase_requisitions', ['branch_id']);
    await queryInterface.addIndex('purchase_requisitions', ['vendor_id']);
    await queryInterface.addIndex('purchase_requisitions', ['status']);
    await queryInterface.addIndex('purchase_requisitions', ['priority']);
    await queryInterface.addIndex('purchase_requisitions', ['department']);
    await queryInterface.addIndex('purchase_requisitions', ['requested_by']);
    await queryInterface.addIndex('purchase_requisitions', ['approved_by']);
    await queryInterface.addIndex('purchase_requisitions', ['tenant_id']);
    await queryInterface.addIndex('purchase_requisitions', ['created_at']);

    // Add indexes for purchase_requisition_items
    await queryInterface.addIndex('purchase_requisition_items', ['pr_id']);
    await queryInterface.addIndex('purchase_requisition_items', ['product_id']);
    await queryInterface.addIndex('purchase_requisition_items', ['sku']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('purchase_requisition_items', ['sku']);
    await queryInterface.removeIndex('purchase_requisition_items', ['product_id']);
    await queryInterface.removeIndex('purchase_requisition_items', ['pr_id']);
    
    await queryInterface.removeIndex('purchase_requisitions', ['created_at']);
    await queryInterface.removeIndex('purchase_requisitions', ['tenant_id']);
    await queryInterface.removeIndex('purchase_requisitions', ['approved_by']);
    await queryInterface.removeIndex('purchase_requisitions', ['requested_by']);
    await queryInterface.removeIndex('purchase_requisitions', ['department']);
    await queryInterface.removeIndex('purchase_requisitions', ['priority']);
    await queryInterface.removeIndex('purchase_requisitions', ['status']);
    await queryInterface.removeIndex('purchase_requisitions', ['vendor_id']);
    await queryInterface.removeIndex('purchase_requisitions', ['branch_id']);
    await queryInterface.removeIndex('purchase_requisitions', ['pr_number']);

    // Drop tables
    await queryInterface.dropTable('purchase_requisition_items');
    await queryInterface.dropTable('purchase_requisitions');
  }
};
