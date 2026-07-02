const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const PromoProduct = sequelize.define('PromoProduct', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  promoId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'promos',
      key: 'id'
    },
    comment: 'Reference to promo'
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Product ID from inventory'
  },
  productName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Product name (cached for performance)'
  },
  productSku: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Product SKU'
  },
  discountType: {
    type: DataTypes.ENUM('percentage', 'fixed', 'override_price'),
    allowNull: false,
    defaultValue: 'percentage',
    comment: 'Type of discount for this product'
  },
  discountValue: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Discount value (percentage or amount)'
  },
  minQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
    comment: 'Minimum quantity to get discount'
  },
  maxQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Maximum quantity eligible for discount'
  },
  overridePrice: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Override price (if discountType is override_price)'
  },
  quantityTiers: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Quantity-based discount tiers: [{minQty, maxQty, discount}]'
  },
  checkStock: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Check stock before applying promo'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'promo_products',
  timestamps: true,
  indexes: [
    {
      fields: ['promoId']
    },
    {
      fields: ['productId']
    },
    {
      fields: ['promoId', 'productId'],
      unique: true
    }
  ]
});

// Define associations
PromoProduct.associate = function(models) {
  PromoProduct.belongsTo(models.Promo, {
    foreignKey: 'promoId',
    as: 'promo'
  });
};

module.exports = PromoProduct;
