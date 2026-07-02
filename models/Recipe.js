'use strict';

module.exports = (sequelize, DataTypes) => {
  const Recipe = sequelize.define('Recipe', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    batch_size: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1
    },
    batch_unit: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pcs'
    },
    estimated_yield: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    yield_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 100
    },
    preparation_time_minutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    cooking_time_minutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_time_minutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_cost: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    labor_cost: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    overhead_cost: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    total_production_cost: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    cost_per_unit: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    difficulty_level: {
      type: DataTypes.ENUM('easy', 'medium', 'hard'),
      defaultValue: 'medium'
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'archived'),
      defaultValue: 'draft'
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'recipes',
    timestamps: true,
    underscored: true
  });

  Recipe.associate = (models) => {
    // Recipe belongs to a Product (the finished product)
    Recipe.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });

    // Recipe has many ingredients
    Recipe.hasMany(models.RecipeIngredient, {
      foreignKey: 'recipe_id',
      as: 'ingredients'
    });

    // Recipe created by User
    if (models.User) {
      Recipe.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });
    }
  };

  return Recipe;
};
