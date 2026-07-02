'use strict';

module.exports = (sequelize, DataTypes) => {
  const RecipeHistory = sequelize.define('RecipeHistory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    recipe_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    change_type: {
      type: DataTypes.ENUM('created', 'updated', 'archived', 'restored'),
      allowNull: false
    },
    changed_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    changes_summary: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    changes_json: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    snapshot_data: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'recipe_history',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  RecipeHistory.associate = (models) => {
    // Belongs to Recipe
    RecipeHistory.belongsTo(models.Recipe, {
      foreignKey: 'recipe_id',
      as: 'recipe'
    });

    // Belongs to User (who made the change)
    if (models.User) {
      RecipeHistory.belongsTo(models.User, {
        foreignKey: 'changed_by',
        as: 'changedBy'
      });
    }
  };

  return RecipeHistory;
};
