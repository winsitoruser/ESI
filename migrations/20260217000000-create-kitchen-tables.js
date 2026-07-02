'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create kitchen_settings table
    await queryInterface.createTable('kitchen_settings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'tenants',
          key: 'id'
        }
      },
      auto_accept_orders: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      default_prep_time: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 15
      },
      enable_kds: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      kds_refresh_interval: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30
      },
      sound_notifications: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      auto_deduct_inventory: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      low_stock_alert: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      critical_stock_alert: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      waste_tracking: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      performance_tracking: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      order_priority_rules: {
        type: Sequelize.JSON,
        allowNull: true
      },
      working_hours: {
        type: Sequelize.JSON,
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

    // Create kitchen_staff table
    await queryInterface.createTable('kitchen_staff', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM('head_chef', 'sous_chef', 'line_cook', 'prep_cook'),
        allowNull: false,
        defaultValue: 'line_cook'
      },
      shift: {
        type: Sequelize.ENUM('morning', 'afternoon', 'night'),
        allowNull: false,
        defaultValue: 'morning'
      },
      status: {
        type: Sequelize.ENUM('active', 'off', 'leave'),
        allowNull: false,
        defaultValue: 'active'
      },
      performance: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0
      },
      orders_completed: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      avg_prep_time: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      join_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    // Create kitchen_orders table
    await queryInterface.createTable('kitchen_orders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      order_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      pos_transaction_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'pos_transactions',
          key: 'id'
        }
      },
      table_number: {
        type: Sequelize.STRING,
        allowNull: true
      },
      order_type: {
        type: Sequelize.ENUM('dine-in', 'takeaway', 'delivery'),
        allowNull: false,
        defaultValue: 'dine-in'
      },
      customer_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('new', 'preparing', 'ready', 'served', 'cancelled'),
        allowNull: false,
        defaultValue: 'new'
      },
      priority: {
        type: Sequelize.ENUM('normal', 'urgent'),
        allowNull: false,
        defaultValue: 'normal'
      },
      received_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      served_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      estimated_time: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      actual_prep_time: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      assigned_chef_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'kitchen_staff',
          key: 'id'
        }
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      total_amount: {
        type: Sequelize.DECIMAL(15, 2),
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

    // Create kitchen_order_items table
    await queryInterface.createTable('kitchen_order_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      kitchen_order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'kitchen_orders',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        }
      },
      recipe_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'kitchen_recipes',
          key: 'id'
        }
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      modifiers: {
        type: Sequelize.JSON,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'preparing', 'ready'),
        allowNull: false,
        defaultValue: 'pending'
      },
      prepared_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'kitchen_staff',
          key: 'id'
        }
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

    // Create kitchen_recipes table
    await queryInterface.createTable('kitchen_recipes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'products',
          key: 'id'
        }
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      prep_time: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      cook_time: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      servings: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      difficulty: {
        type: Sequelize.ENUM('easy', 'medium', 'hard'),
        allowNull: false,
        defaultValue: 'medium'
      },
      instructions: {
        type: Sequelize.JSON,
        allowNull: true
      },
      total_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      selling_price: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      image_url: {
        type: Sequelize.STRING,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    // Create kitchen_inventory_items table
    await queryInterface.createTable('kitchen_inventory_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'products',
          key: 'id'
        }
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true
      },
      current_stock: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
      },
      unit: {
        type: Sequelize.STRING,
        allowNull: false
      },
      min_stock: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
      },
      max_stock: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
      },
      reorder_point: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
      },
      unit_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      total_value: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      last_restocked: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('good', 'low', 'critical', 'overstock'),
        allowNull: false,
        defaultValue: 'good'
      },
      warehouse_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'warehouses',
          key: 'id'
        }
      },
      location_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'locations',
          key: 'id'
        }
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    // Create kitchen_recipe_ingredients table
    await queryInterface.createTable('kitchen_recipe_ingredients', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      recipe_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'kitchen_recipes',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      inventory_item_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'kitchen_inventory_items',
          key: 'id'
        }
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'products',
          key: 'id'
        }
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: false
      },
      unit: {
        type: Sequelize.STRING,
        allowNull: false
      },
      unit_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      total_cost: {
        type: Sequelize.DECIMAL(15, 2),
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

    // Create kitchen_inventory_transactions table
    await queryInterface.createTable('kitchen_inventory_transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      inventory_item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'kitchen_inventory_items',
          key: 'id'
        }
      },
      transaction_type: {
        type: Sequelize.ENUM('in', 'out', 'adjustment', 'waste', 'transfer'),
        allowNull: false
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: false
      },
      unit: {
        type: Sequelize.STRING,
        allowNull: false
      },
      previous_stock: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true
      },
      new_stock: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true
      },
      reference_type: {
        type: Sequelize.STRING,
        allowNull: true
      },
      reference_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      performed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      transaction_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
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

    // Add indexes
    await queryInterface.addIndex('kitchen_settings', ['tenant_id'], { unique: true });
    await queryInterface.addIndex('kitchen_staff', ['tenant_id']);
    await queryInterface.addIndex('kitchen_staff', ['role']);
    await queryInterface.addIndex('kitchen_staff', ['shift']);
    await queryInterface.addIndex('kitchen_orders', ['tenant_id']);
    await queryInterface.addIndex('kitchen_orders', ['order_number']);
    await queryInterface.addIndex('kitchen_orders', ['status']);
    await queryInterface.addIndex('kitchen_orders', ['order_type']);
    await queryInterface.addIndex('kitchen_order_items', ['kitchen_order_id']);
    await queryInterface.addIndex('kitchen_recipes', ['tenant_id']);
    await queryInterface.addIndex('kitchen_recipes', ['category']);
    await queryInterface.addIndex('kitchen_inventory_items', ['tenant_id']);
    await queryInterface.addIndex('kitchen_inventory_items', ['status']);
    await queryInterface.addIndex('kitchen_recipe_ingredients', ['recipe_id']);
    await queryInterface.addIndex('kitchen_inventory_transactions', ['inventory_item_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('kitchen_inventory_transactions');
    await queryInterface.dropTable('kitchen_recipe_ingredients');
    await queryInterface.dropTable('kitchen_inventory_items');
    await queryInterface.dropTable('kitchen_recipes');
    await queryInterface.dropTable('kitchen_order_items');
    await queryInterface.dropTable('kitchen_orders');
    await queryInterface.dropTable('kitchen_staff');
    await queryInterface.dropTable('kitchen_settings');
  }
};
