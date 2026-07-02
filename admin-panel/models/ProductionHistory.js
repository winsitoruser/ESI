'use strict';

module.exports = (sequelize, DataTypes) => {
  const ProductionHistory = sequelize.define('ProductionHistory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    production_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    action_type: {
      type: DataTypes.ENUM('created', 'started', 'updated', 'completed', 'cancelled', 'quality_checked'),
      allowNull: false
    },
    previous_status: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    new_status: {
      type: DataTypes.STRING(50),
      allowNull: true
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
    tableName: 'production_history',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  ProductionHistory.associate = (models) => {
    ProductionHistory.belongsTo(models.Production, {
      foreignKey: 'production_id',
      as: 'production'
    });

    if (models.User) {
      ProductionHistory.belongsTo(models.User, {
        foreignKey: 'changed_by',
        as: 'changedBy'
      });
    }
  };

  return ProductionHistory;
};
