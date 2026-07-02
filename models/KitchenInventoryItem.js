const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const KitchenInventoryItem = sequelize.define('KitchenInventoryItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'tenant_id'
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'product_id',
    references: {
      model: 'products',
      key: 'id'
    },
    comment: 'Link to main inventory product for sync'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Protein, Vegetables, Carbs, Spices, etc.'
  },
  currentStock: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 0,
    field: 'current_stock'
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'kg, gram, liter, ml, pcs, etc.'
  },
  minStock: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 0,
    field: 'min_stock'
  },
  maxStock: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 0,
    field: 'max_stock'
  },
  reorderPoint: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 0,
    field: 'reorder_point'
  },
  unitCost: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'unit_cost'
  },
  totalValue: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'total_value',
    comment: 'current_stock * unit_cost'
  },
  lastRestocked: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_restocked'
  },
  status: {
    type: DataTypes.ENUM('good', 'low', 'critical', 'overstock'),
    allowNull: false,
    defaultValue: 'good'
  },
  warehouseId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'warehouse_id',
    references: {
      model: 'warehouses',
      key: 'id'
    }
  },
  locationId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'location_id',
    references: {
      model: 'locations',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'kitchen_inventory_items',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['product_id'] },
    { fields: ['category'] },
    { fields: ['status'] },
    { fields: ['warehouse_id'] },
    { fields: ['location_id'] }
  ],
  hooks: {
    beforeSave: async (item) => {
      // Calculate total value
      if (item.currentStock && item.unitCost) {
        item.totalValue = item.currentStock * item.unitCost;
      }
      
      // Determine status based on stock levels
      if (item.currentStock <= 0) {
        item.status = 'critical';
      } else if (item.currentStock <= item.minStock) {
        item.status = 'critical';
      } else if (item.currentStock <= item.reorderPoint) {
        item.status = 'low';
      } else if (item.currentStock >= item.maxStock) {
        item.status = 'overstock';
      } else {
        item.status = 'good';
      }
    }
  }
});

// Associations
KitchenInventoryItem.associate = (models) => {
  if (models.Product) {
    KitchenInventoryItem.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });
  }

  KitchenInventoryItem.hasMany(models.KitchenInventoryTransaction, {
    foreignKey: 'inventory_item_id',
    as: 'transactions'
  });

  if (models.Warehouse) {
    KitchenInventoryItem.belongsTo(models.Warehouse, {
      foreignKey: 'warehouse_id',
      as: 'warehouse'
    });
  }

  if (models.Location) {
    KitchenInventoryItem.belongsTo(models.Location, {
      foreignKey: 'location_id',
      as: 'location'
    });
  }
};

module.exports = KitchenInventoryItem;
