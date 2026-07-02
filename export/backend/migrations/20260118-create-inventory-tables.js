module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create stocks table
    await queryInterface.createTable('stocks', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Products',
          key: 'id'
        }
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Branches',
          key: 'id'
        }
      },
      warehouseLocation: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      quantity: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      reservedQuantity: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      minimumStock: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      maximumStock: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      reorderPoint: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      reorderQuantity: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      lastStockCount: {
        type: Sequelize.DATE,
        allowNull: true
      },
      lastRestockDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      averageCost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create stock_movements table
    await queryInterface.createTable('stock_movements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Products',
          key: 'id'
        }
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Branches',
          key: 'id'
        }
      },
      movementType: {
        type: Sequelize.ENUM('in', 'out', 'transfer', 'adjustment', 'return', 'damage', 'expired', 'sale', 'purchase'),
        allowNull: false
      },
      quantity: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      unitCost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      totalCost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      referenceType: {
        type: Sequelize.ENUM('purchase_order', 'sales_order', 'pos_transaction', 'stock_transfer', 'stock_adjustment', 'manual'),
        allowNull: false
      },
      referenceId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      referenceNumber: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      fromBranchId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Branches',
          key: 'id'
        }
      },
      toBranchId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Branches',
          key: 'id'
        }
      },
      batchNumber: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      expiryDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      performedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Employees',
          key: 'id'
        }
      },
      approvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Employees',
          key: 'id'
        }
      },
      movementDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      balanceBefore: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      balanceAfter: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create purchase_orders table
    await queryInterface.createTable('purchase_orders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      poNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      supplierId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'suppliers',
          key: 'id'
        }
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Branches',
          key: 'id'
        }
      },
      orderDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      expectedDeliveryDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      actualDeliveryDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('draft', 'pending', 'approved', 'ordered', 'partial', 'received', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft'
      },
      subtotal: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      taxAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      discountAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      shippingCost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      totalAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      paymentTerms: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      paymentStatus: {
        type: Sequelize.ENUM('unpaid', 'partial', 'paid'),
        allowNull: false,
        defaultValue: 'unpaid'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Employees',
          key: 'id'
        }
      },
      approvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Employees',
          key: 'id'
        }
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      cancelledBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Employees',
          key: 'id'
        }
      },
      cancelledAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      cancellationReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create purchase_order_items table
    await queryInterface.createTable('purchase_order_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      purchaseOrderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'purchase_orders',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Products',
          key: 'id'
        }
      },
      quantity: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      receivedQuantity: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      unitPrice: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      taxRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0
      },
      taxAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      discountRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0
      },
      discountAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      subtotal: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      totalAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create goods_receipts table
    await queryInterface.createTable('goods_receipts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      grNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      purchaseOrderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'purchase_orders',
          key: 'id'
        }
      },
      receiptDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      receivedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Employees',
          key: 'id'
        }
      },
      status: {
        type: Sequelize.ENUM('draft', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      invoiceNumber: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      deliveryNote: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create goods_receipt_items table
    await queryInterface.createTable('goods_receipt_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      goodsReceiptId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'goods_receipts',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      purchaseOrderItemId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'purchase_order_items',
          key: 'id'
        }
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Products',
          key: 'id'
        }
      },
      orderedQuantity: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      receivedQuantity: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      acceptedQuantity: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      rejectedQuantity: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      batchNumber: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      expiryDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      manufacturingDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      unitCost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      totalCost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      rejectionReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create sales_orders table
    await queryInterface.createTable('sales_orders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      soNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      customerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Customers',
          key: 'id'
        }
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Branches',
          key: 'id'
        }
      },
      orderDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      requiredDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      shippedDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('draft', 'pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'completed'),
        allowNull: false,
        defaultValue: 'draft'
      },
      paymentStatus: {
        type: Sequelize.ENUM('unpaid', 'partial', 'paid'),
        allowNull: false,
        defaultValue: 'unpaid'
      },
      subtotal: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      taxAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      discountAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      shippingCost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      totalAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      shippingAddress: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      shippingMethod: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      trackingNumber: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Employees',
          key: 'id'
        }
      },
      approvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Employees',
          key: 'id'
        }
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      cancelledBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Employees',
          key: 'id'
        }
      },
      cancelledAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      cancellationReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create sales_order_items table
    await queryInterface.createTable('sales_order_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      salesOrderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'sales_orders',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Products',
          key: 'id'
        }
      },
      quantity: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      shippedQuantity: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      unitPrice: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      taxRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0
      },
      taxAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      discountRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0
      },
      discountAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      subtotal: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      totalAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create stock_adjustments table
    await queryInterface.createTable('stock_adjustments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      adjustmentNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Branches',
          key: 'id'
        }
      },
      adjustmentDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      adjustmentType: {
        type: Sequelize.ENUM('count', 'damage', 'expired', 'lost', 'found', 'correction'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('draft', 'pending', 'approved', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft'
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Employees',
          key: 'id'
        }
      },
      approvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Employees',
          key: 'id'
        }
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create stock_adjustment_items table
    await queryInterface.createTable('stock_adjustment_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      stockAdjustmentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'stock_adjustments',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Products',
          key: 'id'
        }
      },
      systemQuantity: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      physicalQuantity: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      unitCost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      totalCost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      batchNumber: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      expiryDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes
    await queryInterface.addIndex('stocks', ['productId', 'branchId'], { unique: true });
    await queryInterface.addIndex('stocks', ['quantity']);
    await queryInterface.addIndex('stocks', ['minimumStock']);
    
    await queryInterface.addIndex('stock_movements', ['productId', 'movementDate']);
    await queryInterface.addIndex('stock_movements', ['movementType']);
    await queryInterface.addIndex('stock_movements', ['referenceType', 'referenceId']);
    await queryInterface.addIndex('stock_movements', ['batchNumber']);
    await queryInterface.addIndex('stock_movements', ['expiryDate']);
    
    await queryInterface.addIndex('purchase_orders', ['poNumber'], { unique: true });
    await queryInterface.addIndex('purchase_orders', ['supplierId']);
    await queryInterface.addIndex('purchase_orders', ['status']);
    await queryInterface.addIndex('purchase_orders', ['orderDate']);
    
    await queryInterface.addIndex('goods_receipts', ['grNumber'], { unique: true });
    await queryInterface.addIndex('goods_receipts', ['purchaseOrderId']);
    
    await queryInterface.addIndex('sales_orders', ['soNumber'], { unique: true });
    await queryInterface.addIndex('sales_orders', ['customerId']);
    await queryInterface.addIndex('sales_orders', ['status']);
    await queryInterface.addIndex('sales_orders', ['orderDate']);
    
    await queryInterface.addIndex('stock_adjustments', ['adjustmentNumber'], { unique: true });
    await queryInterface.addIndex('stock_adjustments', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('stock_adjustment_items');
    await queryInterface.dropTable('stock_adjustments');
    await queryInterface.dropTable('sales_order_items');
    await queryInterface.dropTable('sales_orders');
    await queryInterface.dropTable('goods_receipt_items');
    await queryInterface.dropTable('goods_receipts');
    await queryInterface.dropTable('purchase_order_items');
    await queryInterface.dropTable('purchase_orders');
    await queryInterface.dropTable('stock_movements');
    await queryInterface.dropTable('stocks');
  }
};
