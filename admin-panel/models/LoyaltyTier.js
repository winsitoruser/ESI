const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const LoyaltyTier = sequelize.define('LoyaltyTier', {
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
  tierName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  tierLevel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Tier hierarchy level (1 = lowest)'
  },
  minSpending: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Minimum total spending to reach this tier'
  },
  pointMultiplier: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 1.0,
    comment: 'Points multiplier for this tier'
  },
  discountPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Discount percentage for this tier'
  },
  benefits: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of benefit descriptions'
  },
  color: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Gradient color classes for UI'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'loyalty_tiers',
  timestamps: true,
  indexes: [
    {
      fields: ['programId', 'tierLevel']
    },
    {
      fields: ['minSpending']
    }
  ]
});

module.exports = LoyaltyTier;
