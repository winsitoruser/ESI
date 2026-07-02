const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const PartnerSubscription = sequelize.define('PartnerSubscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  partnerId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'partner_id'
  },
  packageId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'package_id'
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'active',
    validate: {
      isIn: [['active', 'expired', 'cancelled', 'suspended']]
    }
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'end_date'
  },
  autoRenew: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'auto_renew'
  },
  paymentMethod: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'payment_method'
  },
  lastPaymentDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_payment_date'
  },
  nextBillingDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'next_billing_date'
  },
  totalPaid: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'total_paid'
  }
}, {
  tableName: 'partner_subscriptions',
  timestamps: true,
  underscored: true
});

// Define associations
PartnerSubscription.associate = function(models) {
  PartnerSubscription.belongsTo(models.Partner, {
    foreignKey: 'partner_id',
    as: 'partner'
  });
  
  PartnerSubscription.belongsTo(models.SubscriptionPackage, {
    foreignKey: 'package_id',
    as: 'package'
  });
};

module.exports = PartnerSubscription;
