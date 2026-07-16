'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create internal_requisitions table
    await queryInterface.createTable('internal_requisitions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      irNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        field: 'ir_number'
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
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
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'processing', 'completed', 'cancelled'),
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
      transferId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'transfer_id',
        references: {
          model: 'inventory_transfers',
          key: 'id'
        }
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

    // Create internal_requisition_items table
    await queryInterface.createTable('internal_requisition_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      irId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'ir_id',
        references: {
          model: 'internal_requisitions',
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

    // Create supplier_price_agreements table
    await queryInterface.createTable('supplier_price_agreements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      agreementNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        field: 'agreement_number'
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      supplierId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'supplier_id',
        references: {
          model: 'suppliers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      validFrom: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'valid_from'
      },
      validUntil: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'valid_until'
      },
      status: {
        type: Sequelize.ENUM('draft', 'active', 'expired', 'terminated'),
        allowNull: false,
        defaultValue: 'active'
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
      autoApply: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'auto_apply'
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

    // Create supplier_price_agreement_items table
    await queryInterface.createTable('supplier_price_agreement_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      agreementId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'agreement_id',
        references: {
          model: 'supplier_price_agreements',
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
      unitPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        field: 'unit_price'
      },
      minOrderQty: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        field: 'min_order_qty'
      },
      maxOrderQty: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        field: 'max_order_qty'
      },
      leadTimeDays: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'lead_time_days'
      },
      qualityGrade: {
        type: Sequelize.STRING(50),
        allowNull: true,
        field: 'quality_grade'
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

    // Add standard_cost to products table
    await queryInterface.addColumn('products', 'standard_cost', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      field: 'standard_cost',
      comment: 'Standard cost from supplier agreement'
    });

    // Create product_cost_history table
    await queryInterface.createTable('product_cost_history', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
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
      oldCost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        field: 'old_cost'
      },
      newCost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        field: 'new_cost'
      },
      reason: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      referenceType: {
        type: Sequelize.ENUM('supplier_agreement', 'manual_update', 'adjustment'),
        allowNull: true,
        field: 'reference_type'
      },
      referenceId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'reference_id'
      },
      changedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'changed_by',
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
      }
    });

    // Add indexes
    await queryInterface.addIndex('internal_requisitions', ['ir_number'], { unique: true });
    await queryInterface.addIndex('internal_requisitions', ['from_branch_id']);
    await queryInterface.addIndex('internal_requisitions', ['to_branch_id']);
    await queryInterface.addIndex('internal_requisitions', ['status']);
    await queryInterface.addIndex('internal_requisitions', ['priority']);
    await queryInterface.addIndex('internal_requisitions', ['requested_by']);
    await queryInterface.addIndex('internal_requisitions', ['approved_by']);
    await queryInterface.addIndex('internal_requisitions', ['tenant_id']);

    await queryInterface.addIndex('internal_requisition_items', ['ir_id']);
    await queryInterface.addIndex('internal_requisition_items', ['product_id']);

    await queryInterface.addIndex('supplier_price_agreements', ['agreement_number'], { unique: true });
    await queryInterface.addIndex('supplier_price_agreements', ['supplier_id']);
    await queryInterface.addIndex('supplier_price_agreements', ['status']);
    await queryInterface.addIndex('supplier_price_agreements', ['valid_from', 'valid_until']);
    await queryInterface.addIndex('supplier_price_agreements', ['tenant_id']);

    await queryInterface.addIndex('supplier_price_agreement_items', ['agreement_id']);
    await queryInterface.addIndex('supplier_price_agreement_items', ['product_id']);

    await queryInterface.addIndex('product_cost_history', ['product_id']);
    await queryInterface.addIndex('product_cost_history', ['created_at']);
    await queryInterface.addIndex('product_cost_history', ['reference_type', 'reference_id']);
    await queryInterface.addIndex('product_cost_history', ['tenant_id']);

    // Add unique constraint for product-supplier active agreement
    await queryInterface.addIndex('supplier_price_agreement_items', ['product_id'], {
      unique: true,
      name: 'spa_product_unique',
      where: {
        // This would need a trigger to enforce properly
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('product_cost_history', 'spa_product_unique');
    await queryInterface.removeIndex('product_cost_history', ['tenant_id']);
    await queryInterface.removeIndex('product_cost_history', ['reference_type', 'reference_id']);
    await queryInterface.removeIndex('product_cost_history', ['created_at']);
    await queryInterface.removeIndex('product_cost_history', ['product_id']);
    
    await queryInterface.removeIndex('supplier_price_agreement_items', ['product_id']);
    await queryInterface.removeIndex('supplier_price_agreement_items', ['agreement_id']);
    
    await queryInterface.removeIndex('supplier_price_agreements', ['tenant_id']);
    await queryInterface.removeIndex('supplier_price_agreements', ['valid_from', 'valid_until']);
    await queryInterface.removeIndex('supplier_price_agreements', ['status']);
    await queryInterface.removeIndex('supplier_price_agreements', ['supplier_id']);
    await queryInterface.removeIndex('supplier_price_agreements', ['agreement_number']);
    
    await queryInterface.removeIndex('internal_requisition_items', ['product_id']);
    await queryInterface.removeIndex('internal_requisition_items', ['ir_id']);
    
    await queryInterface.removeIndex('internal_requisitions', ['tenant_id']);
    await queryInterface.removeIndex('internal_requisitions', ['approved_by']);
    await queryInterface.removeIndex('internal_requisitions', ['requested_by']);
    await queryInterface.removeIndex('internal_requisitions', ['priority']);
    await queryInterface.removeIndex('internal_requisitions', ['status']);
    await queryInterface.removeIndex('internal_requisitions', ['to_branch_id']);
    await queryInterface.removeIndex('internal_requisitions', ['from_branch_id']);
    await queryInterface.removeIndex('internal_requisitions', ['ir_number']);

    // Drop tables
    await queryInterface.dropTable('product_cost_history');
    await queryInterface.dropTable('supplier_price_agreement_items');
    await queryInterface.dropTable('supplier_price_agreements');
    await queryInterface.dropTable('internal_requisition_items');
    await queryInterface.dropTable('internal_requisitions');

    // Remove column
    await queryInterface.removeColumn('products', 'standard_cost');
  }
};
