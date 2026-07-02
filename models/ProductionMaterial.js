'use strict';

module.exports = (sequelize, DataTypes) => {
  const ProductionMaterial = sequelize.define('ProductionMaterial', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    production_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    planned_quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    used_quantity: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    unit_cost: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    total_cost: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    }
  }, {
    tableName: 'production_materials',
    timestamps: true,
    underscored: true
  });

  ProductionMaterial.associate = (models) => {
    ProductionMaterial.belongsTo(models.Production, {
      foreignKey: 'production_id',
      as: 'production'
    });

    ProductionMaterial.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'material'
    });
  };

  return ProductionMaterial;
};
