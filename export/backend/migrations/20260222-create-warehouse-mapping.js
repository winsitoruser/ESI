'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add warehouse fields to branches table
    await queryInterface.addColumn('branches', 'warehouse_layout', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Warehouse layout configuration'
    });

    await queryInterface.addColumn('branches', 'warehouse_capacity', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Total warehouse capacity'
    });

    await queryInterface.addColumn('branches', 'warehouse_zones', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Warehouse zones configuration'
    });

    await queryInterface.addColumn('branches', 'storage_areas', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Storage areas configuration'
    });

    // Create warehouse_zones table
    await queryInterface.createTable('warehouse_zones', {
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
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      zoneType: {
        type: Sequelize.ENUM('receiving', 'storage', 'picking', 'packing', 'shipping', 'quarantine', 'returns'),
        allowNull: false,
        field: 'zone_type'
      },
      capacity: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Zone capacity in units or volume'
      },
      currentUtilization: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'current_utilization'
      },
      coordinates: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Zone coordinates for warehouse map'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      temperature: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Required temperature for this zone'
      },
      humidity: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Required humidity for this zone'
      },
      accessRestrictions: {
        type: Sequelize.JSON,
        allowNull: true,
        field: 'access_restrictions',
        comment: 'Access restrictions for this zone'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active'
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

    // Create storage_areas table
    await queryInterface.createTable('storage_areas', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      zoneId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'zone_id',
        references: {
          model: 'warehouse_zones',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      binCode: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        field: 'bin_code'
      },
      capacity: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Storage area capacity'
      },
      currentUtilization: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'current_utilization'
      },
      coordinatesX: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: true,
        field: 'coordinates_x'
      },
      coordinatesY: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: true,
        field: 'coordinates_y'
      },
      coordinatesZ: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: true,
        field: 'coordinates_z'
      },
      aisle: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      shelf: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      level: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      storageType: {
        type: Sequelize.ENUM('pallet', 'shelf', 'bin', 'floor', 'hanging', 'bulk'),
        allowNull: false,
        defaultValue: 'shelf',
        field: 'storage_type'
      },
      weightLimit: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        field: 'weight_limit'
      },
      dimensions: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Storage area dimensions (length, width, height)'
      },
      requirements: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Special requirements for this storage area'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active'
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

    // Add storage_area_id to products table
    await queryInterface.addColumn('products', 'storage_area_id', {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'storage_area_id',
      references: {
        model: 'storage_areas',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('products', 'warehouse_coordinates', {
      type: Sequelize.JSON,
      allowNull: true,
      field: 'warehouse_coordinates',
      comment: 'Product coordinates within warehouse'
    });

    // Create product_location_history table
    await queryInterface.createTable('product_location_history', {
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
      storageAreaId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'storage_area_id',
        references: {
          model: 'storage_areas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      coordinates: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Product coordinates at time of move'
      },
      movedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'moved_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      moveReason: {
        type: Sequelize.STRING(200),
        allowNull: true,
        field: 'move_reason'
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
      }
    });

    // Add indexes
    await queryInterface.addIndex('warehouse_zones', ['branch_id']);
    await queryInterface.addIndex('warehouse_zones', ['zone_type']);
    await queryInterface.addIndex('warehouse_zones', ['is_active']);
    await queryInterface.addIndex('warehouse_zones', ['tenant_id']);

    await queryInterface.addIndex('storage_areas', ['zone_id']);
    await queryInterface.addIndex('storage_areas', ['branch_id']);
    await queryInterface.addIndex('storage_areas', ['bin_code'], { unique: true });
    await queryInterface.addIndex('storage_areas', ['aisle', 'shelf', 'level']);
    await queryInterface.addIndex('storage_areas', ['is_active']);
    await queryInterface.addIndex('storage_areas', ['tenant_id']);

    await queryInterface.addIndex('products', ['storage_area_id']);
    await queryInterface.addIndex('product_location_history', ['product_id']);
    await queryInterface.addIndex('product_location_history', ['storage_area_id']);
    await queryInterface.addIndex('product_location_history', ['moved_by']);
    await queryInterface.addIndex('product_location_history', ['created_at']);
    await queryInterface.addIndex('product_location_history', ['tenant_id']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('product_location_history', ['tenant_id']);
    await queryInterface.removeIndex('product_location_history', ['created_at']);
    await queryInterface.removeIndex('product_location_history', ['moved_by']);
    await queryInterface.removeIndex('product_location_history', ['storage_area_id']);
    await queryInterface.removeIndex('product_location_history', ['product_id']);
    
    await queryInterface.removeIndex('products', ['storage_area_id']);
    
    await queryInterface.removeIndex('storage_areas', ['tenant_id']);
    await queryInterface.removeIndex('storage_areas', ['is_active']);
    await queryInterface.removeIndex('storage_areas', ['aisle', 'shelf', 'level']);
    await queryInterface.removeIndex('storage_areas', ['bin_code']);
    await queryInterface.removeIndex('storage_areas', ['branch_id']);
    await queryInterface.removeIndex('storage_areas', ['zone_id']);
    
    await queryInterface.removeIndex('warehouse_zones', ['tenant_id']);
    await queryInterface.removeIndex('warehouse_zones', ['is_active']);
    await queryInterface.removeIndex('warehouse_zones', ['zone_type']);
    await queryInterface.removeIndex('warehouse_zones', ['branch_id']);

    // Drop tables
    await queryInterface.dropTable('product_location_history');
    await queryInterface.dropTable('storage_areas');
    await queryInterface.dropTable('warehouse_zones');

    // Remove columns
    await queryInterface.removeColumn('products', 'warehouse_coordinates');
    await queryInterface.removeColumn('products', 'storage_area_id');
    await queryInterface.removeColumn('branches', 'storage_areas');
    await queryInterface.removeColumn('branches', 'warehouse_zones');
    await queryInterface.removeColumn('branches', 'warehouse_capacity');
    await queryInterface.removeColumn('branches', 'warehouse_layout');
  }
};
