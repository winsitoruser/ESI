const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const KitchenInventoryTransaction = sequelize.define('KitchenInventoryTransaction', {
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
  inventoryItemId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'inventory_item_id',
    references: {
      model: 'kitchen_inventory_items',
      key: 'id'
    }
  },
  transactionType: {
    type: DataTypes.ENUM('in', 'out', 'adjustment', 'waste', 'transfer'),
    allowNull: false,
    field: 'transaction_type'
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  previousStock: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: true,
    field: 'previous_stock'
  },
  newStock: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: true,
    field: 'new_stock'
  },
  referenceType: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'reference_type',
    comment: 'kitchen_order, recipe, manual, etc.'
  },
  referenceId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'reference_id'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  performedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'performed_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  transactionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'transaction_date'
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
  tableName: 'kitchen_inventory_transactions',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['inventory_item_id'] },
    { fields: ['transaction_type'] },
    { fields: ['transaction_date'] },
    { fields: ['reference_type', 'reference_id'] }
  ]
});

// Associations
KitchenInventoryTransaction.associate = (models) => {
  KitchenInventoryTransaction.belongsTo(models.KitchenInventoryItem, {
    foreignKey: 'inventory_item_id',
    as: 'inventoryItem'
  });

  if (models.User) {
    KitchenInventoryTransaction.belongsTo(models.User, {
      foreignKey: 'performed_by',
      as: 'performedByUser'
    });
  }
};

module.exports = KitchenInventoryTransaction;
