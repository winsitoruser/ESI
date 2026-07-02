'use strict';

module.exports = (sequelize, DataTypes) => {
  const Stock = sequelize.define('Stock', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'product_id',
    references: {
      model: 'products',
      key: 'id'
    }
  },
  location_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'location_id',
    references: {
      model: 'locations',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'quantity'
  },
  reserved_quantity: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'reserved_quantity'
  },
  available_quantity: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'available_quantity'
  },
  batch_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'batch_number'
  },
  expiry_date: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expiry_date'
  },
  last_stock_take_date: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_stock_take_date'
  },
  last_movement_date: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_movement_date'
  }
}, {
    tableName: 'inventory_stock',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Define associations
  Stock.associate = function(models) {
    Stock.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });
  };

  return Stock;
};
