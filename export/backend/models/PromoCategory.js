const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const PromoCategory = sequelize.define('PromoCategory', {
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
  categoryId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Category ID from inventory'
  },
  categoryName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Category name (cached)'
  },
  discountType: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    allowNull: false,
    defaultValue: 'percentage'
  },
  discountValue: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Discount value'
  },
  minQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
    comment: 'Min quantity from this category'
  },
  maxDiscount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Max discount for this category'
  },
  allowMixMatch: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Allow mixing products from this category'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'promo_categories',
  timestamps: true,
  indexes: [
    {
      fields: ['promoId']
    },
    {
      fields: ['categoryId']
    }
  ]
});

// Define associations
PromoCategory.associate = function(models) {
  PromoCategory.belongsTo(models.Promo, {
    foreignKey: 'promoId',
    as: 'promo'
  });
};

module.exports = PromoCategory;
