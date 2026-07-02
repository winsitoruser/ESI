const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const KitchenOrderItem = sequelize.define('KitchenOrderItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  kitchenOrderId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'kitchen_order_id',
    references: {
      model: 'kitchen_orders',
      key: 'id'
    }
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'product_id',
    references: {
      model: 'products',
      key: 'id'
    }
  },
  recipeId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'recipe_id',
    references: {
      model: 'kitchen_recipes',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Special instructions or modifications'
  },
  modifiers: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of modifiers like extra sauce, no onions, etc.'
  },
  status: {
    type: DataTypes.ENUM('pending', 'preparing', 'ready'),
    allowNull: false,
    defaultValue: 'pending'
  },
  preparedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'prepared_by',
    references: {
      model: 'kitchen_staff',
      key: 'id'
    }
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
  tableName: 'kitchen_order_items',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['kitchen_order_id'] },
    { fields: ['product_id'] },
    { fields: ['recipe_id'] },
    { fields: ['status'] }
  ]
});

// Associations
KitchenOrderItem.associate = (models) => {
  KitchenOrderItem.belongsTo(models.KitchenOrder, {
    foreignKey: 'kitchen_order_id',
    as: 'order'
  });

  if (models.Product) {
    KitchenOrderItem.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });
  }

  KitchenOrderItem.belongsTo(models.KitchenRecipe, {
    foreignKey: 'recipe_id',
    as: 'recipe'
  });

  KitchenOrderItem.belongsTo(models.KitchenStaff, {
    foreignKey: 'prepared_by',
    as: 'chef'
  });
};

module.exports = KitchenOrderItem;
