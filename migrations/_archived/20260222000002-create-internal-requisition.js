'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create internal_requisitions table for SCM
    await queryInterface.createTable('internal_requisitions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      ir_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      requesting_branch_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      fulfilling_branch_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      request_type: {
        type: Sequelize.ENUM('restock', 'new_item', 'emergency', 'scheduled', 'transfer'),
        defaultValue: 'restock'
      },
      priority: {
        type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'),
        defaultValue: 'normal'
      },
      status: {
        type: Sequelize.ENUM(
          'draft',
          'submitted',
          'under_review',
          'approved',
          'partially_approved',
          'rejected',
          'processing',
          'ready_to_ship',
          'in_transit',
          'delivered',
          'completed',
          'cancelled'
        ),
        defaultValue: 'draft'
      },
      requested_delivery_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      actual_delivery_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      total_items: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      total_quantity: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      estimated_value: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      requested_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      reviewed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      reviewed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      consolidated_po_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create internal_requisition_items table
    await queryInterface.createTable('internal_requisition_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      requisition_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'internal_requisitions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      requested_quantity: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      approved_quantity: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      fulfilled_quantity: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      unit: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      current_stock: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      min_stock: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      estimated_unit_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      estimated_total_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'partially_approved', 'rejected', 'fulfilled'),
        defaultValue: 'pending'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create indexes
    await queryInterface.addIndex('internal_requisitions', ['ir_number']);
    await queryInterface.addIndex('internal_requisitions', ['requesting_branch_id']);
    await queryInterface.addIndex('internal_requisitions', ['status']);
    await queryInterface.addIndex('internal_requisitions', ['priority']);
    await queryInterface.addIndex('internal_requisitions', ['created_at']);
    await queryInterface.addIndex('internal_requisition_items', ['requisition_id']);
    await queryInterface.addIndex('internal_requisition_items', ['product_id']);
    await queryInterface.addIndex('internal_requisition_items', ['status']);
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes and drop tables
    await queryInterface.dropTable('internal_requisition_items');
    await queryInterface.dropTable('internal_requisitions');
  }
};
