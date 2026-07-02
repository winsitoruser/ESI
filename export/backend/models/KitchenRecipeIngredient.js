const { DataTypes } = require('sequelize');
const { sequelize } = require('../lib/sequelizeClient');

const KitchenRecipeIngredient = sequelize.define('KitchenRecipeIngredient', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  recipeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'recipe_id',
    references: {
      model: 'kitchen_recipes',
      key: 'id'
    }
  },
  inventoryItemId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'inventory_item_id',
    references: {
      model: 'kitchen_inventory_items',
      key: 'id'
    }
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'product_id',
    references: {
      model: 'products',
      key: 'id'
    },
    comment: 'Link to main inventory product if applicable'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'kg, gram, liter, ml, pcs, etc.'
  },
  unitCost: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'unit_cost'
  },
  totalCost: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'total_cost',
    comment: 'quantity * unit_cost'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'kitchen_recipe_ingredients',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['recipe_id'] },
    { fields: ['inventory_item_id'] },
    { fields: ['product_id'] }
  ]
});

// Associations
KitchenRecipeIngredient.associate = (models) => {
  KitchenRecipeIngredient.belongsTo(models.KitchenRecipe, {
    foreignKey: 'recipe_id',
    as: 'recipe'
  });

  KitchenRecipeIngredient.belongsTo(models.KitchenInventoryItem, {
    foreignKey: 'inventory_item_id',
    as: 'inventoryItem'
  });

  if (models.Product) {
    KitchenRecipeIngredient.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });
  }
};

module.exports = KitchenRecipeIngredient;
