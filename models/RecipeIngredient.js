'use strict';

module.exports = (sequelize, DataTypes) => {
  const RecipeIngredient = sequelize.define('RecipeIngredient', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    recipe_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    unit_cost: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    subtotal_cost: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    is_optional: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    preparation_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'recipe_ingredients',
    timestamps: true,
    underscored: true
  });

  RecipeIngredient.associate = (models) => {
    // Belongs to Recipe
    RecipeIngredient.belongsTo(models.Recipe, {
      foreignKey: 'recipe_id',
      as: 'recipe'
    });

    // Belongs to Product (the raw material)
    RecipeIngredient.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'material'
    });
  };

  return RecipeIngredient;
};
