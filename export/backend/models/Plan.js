const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Plan = sequelize.define('Plan', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    billingInterval: {
      type: DataTypes.ENUM('monthly', 'yearly'),
      allowNull: false,
      defaultValue: 'monthly'
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'IDR'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    features: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        pos: true,
        inventory: true,
        kitchen: false,
        tables: false,
        reservations: false,
        finance: false,
        reports: true,
        admin: false
      }
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    trialDays: {
      type: DataTypes.INTEGER,
      defaultValue: 14
    },
    maxUsers: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    maxBranches: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    maxProducts: {
      type: DataTypes.INTEGER,
      defaultValue: 100
    },
    maxTransactions: {
      type: DataTypes.INTEGER,
      defaultValue: 1000
    }
  }, {
    tableName: 'plans',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['is_active']
      },
      {
        fields: ['billing_interval']
      },
      {
        fields: ['sort_order']
      }
    ]
  });

  Plan.associate = (models) => {
    // Plans has many subscriptions
    Plan.hasMany(models.Subscription, {
      foreignKey: 'planId',
      as: 'subscriptions'
    });

    // Plans has many plan limits
    Plan.hasMany(models.PlanLimit, {
      foreignKey: 'planId',
      as: 'planLimits'
    });

    // Plans has many billing cycles
    Plan.hasMany(models.BillingCycle, {
      foreignKey: 'planId',
      as: 'billingCycles'
    });
  };

  // Instance methods
  Plan.prototype.getFormattedPrice = function() {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: this.currency
    }).format(this.price);
  };

  Plan.prototype.getIntervalDisplay = function() {
    return this.billingInterval === 'monthly' ? '/bulan' : '/tahun';
  };

  Plan.prototype.hasFeature = function(feature) {
    return this.features && this.features[feature] === true;
  };

  // Class methods
  Plan.getActivePlans = function() {
    return this.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC'], ['price', 'ASC']]
    });
  };

  Plan.findByInterval = function(interval) {
    return this.findAll({
      where: { 
        isActive: true,
        billingInterval: interval 
      },
      order: [['price', 'ASC']]
    });
  };

  return Plan;
};
