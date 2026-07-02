const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const LoyaltyReward = sequelize.define('LoyaltyReward', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  programId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'loyalty_programs',
      key: 'id'
    }
  },
  rewardName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  pointsRequired: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  rewardType: {
    type: DataTypes.ENUM('discount', 'product', 'shipping', 'voucher', 'service'),
    allowNull: false
  },
  rewardValue: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Value in Rupiah for discount/voucher'
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Products',
      key: 'id'
    },
    comment: 'Product ID if reward type is product'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Quantity for product rewards'
  },
  validityDays: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Validity period in days after redemption'
  },
  maxRedemptions: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Maximum number of redemptions allowed'
  },
  currentRedemptions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'loyalty_rewards',
  timestamps: true,
  indexes: [
    {
      fields: ['programId', 'isActive']
    },
    {
      fields: ['rewardType']
    },
    {
      fields: ['pointsRequired']
    }
  ]
});

module.exports = LoyaltyReward;
