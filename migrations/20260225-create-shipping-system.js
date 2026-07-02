'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create requisition_shipments table
    await queryInterface.createTable('requisition_shipments', {
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
      shipment_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      tracking_number: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      carrier: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'internal, jne, jnt, sicepat, etc.'
      },
      driver_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      driver_phone: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      vehicle_number: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      shipped_from_branch_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'branches',
          key: 'id'
        }
      },
      shipped_to_branch_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'branches',
          key: 'id'
        }
      },
      shipped_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      shipped_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      estimated_delivery_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      actual_delivery_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      delivery_instructions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      total_packages: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      total_weight: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'in kg'
      },
      total_volume: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'in m3'
      },
      shipping_cost: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      insurance_cost: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      status: {
        type: Sequelize.STRING(50),
        defaultValue: 'pending',
        comment: 'pending, picked_up, in_transit, out_for_delivery, delivered, failed, returned'
      },
      packing_list_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      delivery_note_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      shipping_label_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for requisition_shipments
    await queryInterface.addIndex('requisition_shipments', ['requisition_id'], {
      name: 'idx_shipments_requisition'
    });
    await queryInterface.addIndex('requisition_shipments', ['tracking_number'], {
      name: 'idx_shipments_tracking'
    });
    await queryInterface.addIndex('requisition_shipments', ['status'], {
      name: 'idx_shipments_status'
    });
    await queryInterface.addIndex('requisition_shipments', ['shipped_at'], {
      name: 'idx_shipments_shipped_at'
    });

    // 2. Create shipment_tracking_updates table
    await queryInterface.createTable('shipment_tracking_updates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      shipment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'requisition_shipments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for shipment_tracking_updates
    await queryInterface.addIndex('shipment_tracking_updates', ['shipment_id'], {
      name: 'idx_tracking_shipment'
    });
    await queryInterface.addIndex('shipment_tracking_updates', ['created_at'], {
      name: 'idx_tracking_created'
    });

    // 3. Create delivery_confirmations table
    await queryInterface.createTable('delivery_confirmations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      shipment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'requisition_shipments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      received_by_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      received_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      received_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      items_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      condition_good: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      all_items_received: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      has_discrepancies: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      missing_items: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Array of {productId, name, quantityMissing}'
      },
      damaged_items: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Array of {productId, name, quantityDamaged, description}'
      },
      extra_items: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Array of {productId, name, quantityExtra}'
      },
      signature_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      photo_urls: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Array of photo URLs'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for delivery_confirmations
    await queryInterface.addIndex('delivery_confirmations', ['shipment_id'], {
      name: 'idx_delivery_shipment'
    });
    await queryInterface.addIndex('delivery_confirmations', ['requisition_id'], {
      name: 'idx_delivery_requisition'
    });

    // 4. Create shipment_items table
    await queryInterface.createTable('shipment_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      shipment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'requisition_shipments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      requisition_item_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'internal_requisition_items',
          key: 'id'
        }
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      product_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      sku: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      quantity_shipped: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      quantity_received: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      unit: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      package_number: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Which package this item is in'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for shipment_items
    await queryInterface.addIndex('shipment_items', ['shipment_id'], {
      name: 'idx_shipment_items_shipment'
    });
    await queryInterface.addIndex('shipment_items', ['product_id'], {
      name: 'idx_shipment_items_product'
    });

    // 5. Add columns to internal_requisitions table
    await queryInterface.addColumn('internal_requisitions', 'current_shipment_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'requisition_shipments',
        key: 'id'
      }
    });

    await queryInterface.addColumn('internal_requisitions', 'total_shipments', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    });

    await queryInterface.addColumn('internal_requisitions', 'shipping_status', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'not_shipped, partially_shipped, fully_shipped, delivered'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns from internal_requisitions
    await queryInterface.removeColumn('internal_requisitions', 'shipping_status');
    await queryInterface.removeColumn('internal_requisitions', 'total_shipments');
    await queryInterface.removeColumn('internal_requisitions', 'current_shipment_id');

    // Drop tables in reverse order
    await queryInterface.dropTable('shipment_items');
    await queryInterface.dropTable('delivery_confirmations');
    await queryInterface.dropTable('shipment_tracking_updates');
    await queryInterface.dropTable('requisition_shipments');
  }
};
