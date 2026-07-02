const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const RewardRedemption = sequelize.define('RewardRedemption', {
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
  rewardId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'loyalty_rewards',
      key: 'id'
    }
  },
  pointsUsed: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  redemptionCode: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'used', 'expired', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  redemptionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  usedDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  usedInTransactionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'pos_transactions',
      key: 'id'
    }
  },
  processedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Employees',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'reward_redemptions',
  timestamps: true,
  indexes: [
    {
      fields: ['customerLoyaltyId']
    },
    {
      fields: ['rewardId']
    },
    {
      fields: ['redemptionCode'],
      unique: true
    },
    {
      fields: ['status']
    },
    {
      fields: ['expiryDate']
    }
  ]
});

module.exports = RewardRedemption;
