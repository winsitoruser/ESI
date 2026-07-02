const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Subscription = sequelize.define('Subscription', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'tenants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    planId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'plans',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    status: {
      type: DataTypes.ENUM('trial', 'active', 'past_due', 'cancelled', 'expired'),
      allowNull: false,
      defaultValue: 'trial'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    trialEndsAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    currentPeriodStart: {
      type: DataTypes.DATE,
      allowNull: false
    },
    currentPeriodEnd: {
      type: DataTypes.DATE,
      allowNull: false
    },
    cancelAtPeriodEnd: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'subscriptions',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['tenant_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['current_period_end']
      },
      {
        fields: ['plan_id']
      }
    ]
  });

  Subscription.associate = (models) => {
    // Subscription belongs to tenant
    Subscription.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });

    // Subscription belongs to plan
    Subscription.belongsTo(models.Plan, {
      foreignKey: 'planId',
      as: 'plan'
    });

    // Subscription has many billing cycles
    Subscription.hasMany(models.BillingCycle, {
      foreignKey: 'subscriptionId',
      as: 'billingCycles'
    });

    // Subscription has many invoices
    Subscription.hasMany(models.Invoice, {
      foreignKey: 'subscriptionId',
      as: 'invoices'
    });
  };

  // Instance methods
  Subscription.prototype.isInTrial = function() {
    return this.status === 'trial' && this.trialEndsAt && this.trialEndsAt > new Date();
  };

  Subscription.prototype.isActive = function() {
    return ['trial', 'active'].includes(this.status);
  };

  Subscription.prototype.isPastDue = function() {
    return this.status === 'past_due';
  };

  Subscription.prototype.isCancelled = function() {
    return this.status === 'cancelled';
  };

  Subscription.prototype.getDaysUntilRenewal = function() {
    const now = new Date();
    const renewalDate = new Date(this.currentPeriodEnd);
    const diffTime = renewalDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  Subscription.prototype.getTrialDaysLeft = function() {
    if (!this.isInTrial()) return 0;
    const now = new Date();
    const trialEnd = new Date(this.trialEndsAt);
    const diffTime = trialEnd - now;
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  Subscription.prototype.canUpgrade = function() {
    return this.isActive() && !this.cancelAtPeriodEnd;
  };

  Subscription.prototype.extendTrial = function(days) {
    if (this.trialEndsAt) {
      const newEndDate = new Date(this.trialEndsAt);
      newEndDate.setDate(newEndDate.getDate() + days);
      this.trialEndsAt = newEndDate;
    }
  };

  Subscription.prototype.cancel = function(atPeriodEnd = false) {
    if (atPeriodEnd) {
      this.cancelAtPeriodEnd = true;
    } else {
      this.status = 'cancelled';
      this.cancelledAt = new Date();
    }
  };

  // Hooks
  Subscription.beforeCreate(async (subscription) => {
    // Set default period dates if not provided
    if (!subscription.currentPeriodStart) {
      subscription.currentPeriodStart = new Date();
    }
    
    if (!subscription.currentPeriodEnd) {
      const plan = await sequelize.models.Plan.findByPk(subscription.planId);
      const periodEnd = new Date(subscription.currentPeriodStart);
      const days = plan.billingInterval === 'monthly' ? 30 : 365;
      periodEnd.setDate(periodEnd.getDate() + days);
      subscription.currentPeriodEnd = periodEnd;
    }

    // Set trial end date if in trial
    if (subscription.status === 'trial' && !subscription.trialEndsAt) {
      const plan = await sequelize.models.Plan.findByPk(subscription.planId);
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + plan.trialDays);
      subscription.trialEndsAt = trialEnd;
    }
  });

  // Class methods
  Subscription.findActiveByTenant = function(tenantId) {
    return this.findOne({
      where: {
        tenantId,
        status: ['trial', 'active']
      },
      include: [{
        model: sequelize.models.Plan,
        as: 'plan'
      }]
    });
  };

  Subscription.findExpiringTrials = function(days = 3) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    
    return this.findAll({
      where: {
        status: 'trial',
        trialEndsAt: {
          [sequelize.Sequelize.Op.lte]: expiryDate
        }
      },
      include: [{
        model: sequelize.models.Tenant,
        as: 'tenant'
      }]
    });
  };

  Subscription.findPastDueSubscriptions = function() {
    return this.findAll({
      where: {
        status: 'active',
        currentPeriodEnd: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      },
      include: [{
        model: sequelize.models.Plan,
        as: 'plan'
      }]
    });
  };

  return Subscription;
};
