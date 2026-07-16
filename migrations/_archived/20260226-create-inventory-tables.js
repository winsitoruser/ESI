'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create inventory_products table
    await queryInterface.createTable('inventory_products', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      sku: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      categoryId: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      subCategory: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      unit: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      barcode: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      costPrice: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      sellingPrice: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      taxRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      trackInventory: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      minStockLevel: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      maxStockLevel: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      reorderPoint: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      reorderQuantity: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      images: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      specifications: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('inventory_products', ['tenantId']);
    await queryInterface.addIndex('inventory_products', ['category']);
    await queryInterface.addIndex('inventory_products', ['isActive']);
    await queryInterface.addIndex('inventory_products', ['barcode']);

    // Create inventory_stocks table
    await queryInterface.createTable('inventory_stocks', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'branches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      warehouseId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'inventory_warehouses',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'inventory_products',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      reservedQuantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      availableQuantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      unitCost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      totalValue: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      lastRestockDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      lastSyncDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('in_stock', 'low_stock', 'out_of_stock', 'overstock'),
        allowNull: false,
        defaultValue: 'in_stock',
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('inventory_stocks', ['tenantId']);
    await queryInterface.addIndex('inventory_stocks', ['branchId']);
    await queryInterface.addIndex('inventory_stocks', ['productId']);
    await queryInterface.addIndex('inventory_stocks', ['status']);
    await queryInterface.addIndex('inventory_stocks', ['branchId', 'productId'], { unique: true });

    // Create inventory_stock_movements table
    await queryInterface.createTable('inventory_stock_movements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'branches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'inventory_products',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      type: {
        type: Sequelize.ENUM('in', 'out', 'transfer', 'adjustment', 'return'),
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      fromBranchId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'branches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      toBranchId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'branches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      referenceType: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      referenceId: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      unitCost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      totalCost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      reason: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      performedBy: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      performedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('inventory_stock_movements', ['tenantId']);
    await queryInterface.addIndex('inventory_stock_movements', ['branchId']);
    await queryInterface.addIndex('inventory_stock_movements', ['productId']);
    await queryInterface.addIndex('inventory_stock_movements', ['type']);
    await queryInterface.addIndex('inventory_stock_movements', ['performedAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('inventory_stock_movements');
    await queryInterface.dropTable('inventory_stocks');
    await queryInterface.dropTable('inventory_products');
  }
};
