const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const PointTransaction = sequelize.define('PointTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  customerLoyaltyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'customer_loyalty',
      key: 'id'
    }
  },
  transactionType: {
    type: DataTypes.ENUM('earn', 'redeem', 'expire', 'adjust', 'refund'),
    allowNull: false
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Positive for earn, negative for redeem/expire'
  },
  referenceType: {
    type: DataTypes.ENUM('pos_transaction', 'reward_redemption', 'manual', 'expiry', 'refund'),
    allowNull: false
  },
  referenceId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID of related transaction (POS transaction, reward redemption, etc.)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  balanceBefore: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  balanceAfter: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Expiry date for earned points'
  },
  processedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Employees',
      key: 'id'
    },
    comment: 'Employee who processed manual adjustments'
  },
  transactionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'point_transactions',
  timestamps: true,
  indexes: [
    {
      fields: ['customerLoyaltyId', 'transactionDate']
    },
    {
      fields: ['transactionType']
    },
    {
      fields: ['referenceType', 'referenceId']
    },
    {
      fields: ['expiryDate']
    }
  ]
});

module.exports = PointTransaction;
