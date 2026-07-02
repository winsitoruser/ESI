'use strict';

module.exports = (sequelize, DataTypes) => {
  const ProductVariant = sequelize.define('ProductVariant', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    variant_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    variant_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    sku: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true
    },
    barcode: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    cost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    stock: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    weight: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true
    },
    dimensions: {
      type: DataTypes.JSON,
      allowNull: true
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    attributes: {
      type: DataTypes.JSON,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'product_variants',
    timestamps: true,
    underscored: true
  });

  ProductVariant.associate = (models) => {
    ProductVariant.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });
  };

  return ProductVariant;
};
