'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Categories table
    await queryInterface.createTable('categories', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      parent_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'categories',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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
    }).catch(() => { console.log('⚠️ categories table may already exist'); });

    // 2. Suppliers table
    await queryInterface.createTable('suppliers', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      code: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: true
      },
      contact_person: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      country: {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: 'Indonesia'
      },
      tax_number: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      payment_terms: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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
    }).catch(() => { console.log('⚠️ suppliers table may already exist'); });

    // 3. Locations table
    await queryInterface.createTable('locations', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      code: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: true
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'warehouse',
        comment: 'warehouse, store, branch'
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      manager: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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
    }).catch(() => { console.log('⚠️ locations table may already exist'); });

    // 4. Products table
    await queryInterface.createTable('products', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      sku: {
        type: Sequelize.STRING(100),
        unique: true,
        allowNull: false
      },
      barcode: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'categories',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      supplier_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'suppliers',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      unit: {
        type: Sequelize.STRING(50),
        defaultValue: 'pcs'
      },
      buy_price: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      sell_price: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      minimum_stock: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      maximum_stock: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      reorder_point: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      is_trackable: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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
    }).catch(() => { console.log('⚠️ products table may already exist'); });

    // 5. Inventory stock table
    await queryInterface.createTable('inventory_stock', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      location_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'locations',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      reserved_quantity: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      last_stock_take_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      last_movement_date: {
        type: Sequelize.DATE,
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
    }).catch(() => { console.log('⚠️ inventory_stock table may already exist'); });

    // Add unique constraint for product_id + location_id
    await queryInterface.addIndex('inventory_stock', ['product_id', 'location_id'], {
      unique: true,
      name: 'inventory_stock_product_location_unique'
    }).catch(() => {});

    // 6. Stock movements table
    await queryInterface.createTable('stock_movements', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      location_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'locations',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      movement_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'in, out, adjustment, transfer_in, transfer_out'
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      reference_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'purchase, sale, transfer, adjustment, return'
      },
      reference_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      reference_number: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      batch_number: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      expiry_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      cost_price: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_by: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }).catch(() => { console.log('⚠️ stock_movements table may already exist'); });

    // 7. Stock adjustments table
    await queryInterface.createTable('stock_adjustments', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      adjustment_number: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false
      },
      location_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'locations',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      adjustment_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      adjustment_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'increase, decrease, damage, expired, lost, found'
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.STRING(20),
        defaultValue: 'draft',
        comment: 'draft, approved, completed'
      },
      approved_by: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_by: {
        type: Sequelize.STRING(100),
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
    }).catch(() => { console.log('⚠️ stock_adjustments table may already exist'); });

    // 8. Stock adjustment items table
    await queryInterface.createTable('stock_adjustment_items', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      adjustment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'stock_adjustments',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      current_stock: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      adjusted_quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      new_stock: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }).catch(() => { console.log('⚠️ stock_adjustment_items table may already exist'); });

    // Add indexes (with catch to handle existing)
    const indexes = [
      { table: 'categories', fields: ['parent_id'], name: 'idx_categories_parent_id' },
      { table: 'categories', fields: ['is_active'], name: 'idx_categories_is_active' },
      { table: 'suppliers', fields: ['code'], name: 'idx_suppliers_code' },
      { table: 'suppliers', fields: ['is_active'], name: 'idx_suppliers_is_active' },
      { table: 'locations', fields: ['code'], name: 'idx_locations_code' },
      { table: 'locations', fields: ['type'], name: 'idx_locations_type' },
      { table: 'locations', fields: ['is_active'], name: 'idx_locations_is_active' },
      { table: 'products', fields: ['sku'], name: 'idx_products_sku' },
      { table: 'products', fields: ['barcode'], name: 'idx_products_barcode' },
      { table: 'products', fields: ['category_id'], name: 'idx_products_category_id' },
      { table: 'products', fields: ['supplier_id'], name: 'idx_products_supplier_id' },
      { table: 'products', fields: ['is_active'], name: 'idx_products_is_active' },
      { table: 'inventory_stock', fields: ['product_id'], name: 'idx_inventory_stock_product_id' },
      { table: 'inventory_stock', fields: ['location_id'], name: 'idx_inventory_stock_location_id' },
      { table: 'inventory_stock', fields: ['quantity'], name: 'idx_inventory_stock_quantity' },
      { table: 'stock_movements', fields: ['product_id'], name: 'idx_stock_movements_product_id' },
      { table: 'stock_movements', fields: ['location_id'], name: 'idx_stock_movements_location_id' },
      { table: 'stock_movements', fields: ['movement_type'], name: 'idx_stock_movements_movement_type' },
      { table: 'stock_movements', fields: ['reference_type', 'reference_id'], name: 'idx_stock_movements_reference' },
      { table: 'stock_movements', fields: ['created_at'], name: 'idx_stock_movements_created_at' },
      { table: 'stock_adjustments', fields: ['adjustment_number'], name: 'idx_stock_adjustments_number' },
      { table: 'stock_adjustments', fields: ['location_id'], name: 'idx_stock_adjustments_location_id' },
      { table: 'stock_adjustments', fields: ['status'], name: 'idx_stock_adjustments_status' },
      { table: 'stock_adjustments', fields: ['adjustment_date'], name: 'idx_stock_adjustments_date' },
      { table: 'stock_adjustment_items', fields: ['adjustment_id'], name: 'idx_stock_adjustment_items_adjustment_id' },
      { table: 'stock_adjustment_items', fields: ['product_id'], name: 'idx_stock_adjustment_items_product_id' },
    ];

    for (const idx of indexes) {
      await queryInterface.addIndex(idx.table, idx.fields, { name: idx.name }).catch(() => {});
    }

    console.log('✅ Created inventory system tables');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('stock_adjustment_items').catch(() => {});
    await queryInterface.dropTable('stock_adjustments').catch(() => {});
    await queryInterface.dropTable('stock_movements').catch(() => {});
    await queryInterface.dropTable('inventory_stock').catch(() => {});
    await queryInterface.dropTable('products').catch(() => {});
    await queryInterface.dropTable('locations').catch(() => {});
    await queryInterface.dropTable('suppliers').catch(() => {});
    await queryInterface.dropTable('categories').catch(() => {});
  }
};
