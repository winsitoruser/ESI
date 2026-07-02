const { DataTypes } = require('sequelize');
const { sequelize } = require('../lib/sequelizeClient');

const KitchenRecipe = sequelize.define('KitchenRecipe', {
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
    comment: 'Link to menu item/product'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  prepTime: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Preparation time in minutes',
    field: 'prep_time'
  },
  cookTime: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Cooking time in minutes',
    field: 'cook_time'
  },
  servings: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'hard'),
    allowNull: false,
    defaultValue: 'medium'
  },
  instructions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of step-by-step instructions'
  },
  totalCost: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'total_cost',
    comment: 'Total cost of all ingredients'
  },
  sellingPrice: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'selling_price'
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'image_url'
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
  tableName: 'kitchen_recipes',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['product_id'] },
    { fields: ['category'] },
    { fields: ['is_active'] }
  ]
});

// Associations
KitchenRecipe.associate = (models) => {
  KitchenRecipe.hasMany(models.KitchenRecipeIngredient, {
    foreignKey: 'recipe_id',
    as: 'ingredients'
  });

  if (models.Product) {
    KitchenRecipe.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });
  }
};

module.exports = KitchenRecipe;
