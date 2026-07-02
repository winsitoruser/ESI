const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const PromoBundle = sequelize.define('PromoBundle', {
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
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Bundle name'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Bundle description'
  },
  bundleType: {
    type: DataTypes.ENUM('fixed_bundle', 'mix_match', 'buy_x_get_y', 'quantity_discount'),
    allowNull: false,
    defaultValue: 'fixed_bundle',
    comment: 'Type of bundle'
  },
  bundleProducts: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Array of {productId, quantity, isFree, discountPercent}'
  },
  minQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Minimum quantity to qualify'
  },
  maxQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Maximum quantity allowed'
  },
  bundlePrice: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Fixed bundle price (if applicable)'
  },
  discountType: {
    type: DataTypes.ENUM('percentage', 'fixed', 'free_item'),
    allowNull: false,
    defaultValue: 'percentage'
  },
  discountValue: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Discount value for bundle'
  },
  requireAllProducts: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Must buy all products in bundle'
  },
  checkStock: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Check stock availability'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'promo_bundles',
  timestamps: true,
  indexes: [
    {
      fields: ['promoId']
    },
    {
      fields: ['bundleType']
    }
  ]
});

// Define associations
PromoBundle.associate = function(models) {
  PromoBundle.belongsTo(models.Promo, {
    foreignKey: 'promoId',
    as: 'promo'
  });
};

module.exports = PromoBundle;
