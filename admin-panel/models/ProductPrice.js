'use strict';

module.exports = (sequelize, DataTypes) => {
  const ProductPrice = sequelize.define('ProductPrice', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    price_type: {
      type: DataTypes.ENUM('regular', 'member', 'tier_bronze', 'tier_silver', 'tier_gold', 'tier_platinum'),
      allowNull: false,
      defaultValue: 'regular'
    },
    tier_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    discount_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    discount_amount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    min_quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    max_quantity: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'product_prices',
    timestamps: true,
    underscored: true
  });

  ProductPrice.associate = (models) => {
    // Belongs to Product
    ProductPrice.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });

    // Belongs to LoyaltyTier (optional)
    if (models.LoyaltyTier) {
      ProductPrice.belongsTo(models.LoyaltyTier, {
        foreignKey: 'tier_id',
        as: 'tier'
      });
    }
  };

  return ProductPrice;
};
