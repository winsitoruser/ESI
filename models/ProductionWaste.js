'use strict';

module.exports = (sequelize, DataTypes) => {
  const ProductionWaste = sequelize.define('ProductionWaste', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    waste_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    production_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    waste_type: {
      type: DataTypes.ENUM('raw_material', 'work_in_progress', 'finished_product', 'packaging', 'other'),
      allowNull: false
    },
    waste_category: {
      type: DataTypes.ENUM('defect', 'expired', 'damaged', 'overproduction', 'spillage', 'contamination'),
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
    cost_value: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    disposal_method: {
      type: DataTypes.ENUM('discard', 'recycle', 'rework', 'clearance_sale', 'donation'),
      allowNull: false
    },
    clearance_price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0
    },
    net_loss: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    recorded_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    waste_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    disposal_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('recorded', 'disposed', 'recovered'),
      defaultValue: 'recorded'
    }
  }, {
    tableName: 'production_waste',
    timestamps: true,
    underscored: true
  });

  ProductionWaste.associate = (models) => {
    ProductionWaste.belongsTo(models.Production, {
      foreignKey: 'production_id',
      as: 'production'
    });

    ProductionWaste.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });

    if (models.User) {
      ProductionWaste.belongsTo(models.User, {
        foreignKey: 'recorded_by',
        as: 'recorder'
      });
    }
  };

  return ProductionWaste;
};
