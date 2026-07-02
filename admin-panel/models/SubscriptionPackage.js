const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const SubscriptionPackage = sequelize.define('SubscriptionPackage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  priceMonthly: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    field: 'price_monthly'
  },
  priceYearly: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'price_yearly'
  },
  maxOutlets: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'max_outlets'
  },
  maxUsers: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    field: 'max_users'
  },
  maxProducts: {
    type: DataTypes.INTEGER,
    defaultValue: 1000,
    field: 'max_products'
  },
  maxTransactionsPerMonth: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'max_transactions_per_month'
  },
  features: {
    type: DataTypes.JSONB,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('features');
      return rawValue ? rawValue : [];
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'subscription_packages',
  timestamps: true,
  underscored: true
});

// Define associations
SubscriptionPackage.associate = function(models) {
  SubscriptionPackage.hasMany(models.PartnerSubscription, {
    foreignKey: 'package_id',
    as: 'subscriptions'
  });
  
  SubscriptionPackage.hasMany(models.ActivationRequest, {
    foreignKey: 'package_id',
    as: 'activationRequests'
  });
};

module.exports = SubscriptionPackage;
