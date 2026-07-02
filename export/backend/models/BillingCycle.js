const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BillingCycle = sequelize.define('BillingCycle', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'subscriptions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    periodStart: {
      type: DataTypes.DATE,
      allowNull: false
    },
    periodEnd: {
      type: DataTypes.DATE,
      allowNull: false
    },
    baseAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    overageAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'IDR'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'paid', 'failed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'billing_cycles',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['subscription_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['due_date']
      },
      {
        fields: ['period_start', 'period_end']
      }
    ]
  });

  BillingCycle.associate = (models) => {
    // BillingCycle belongs to subscription
    BillingCycle.belongsTo(models.Subscription, {
      foreignKey: 'subscriptionId',
      as: 'subscription'
    });

    // BillingCycle has many invoices
    BillingCycle.hasMany(models.Invoice, {
      foreignKey: 'billingCycleId',
      as: 'invoices'
    });

    // BillingCycle has many payment transactions
    BillingCycle.hasMany(models.PaymentTransaction, {
      foreignKey: 'billingCycleId',
      as: 'paymentTransactions'
    });
  };

  // Instance methods
  BillingCycle.prototype.isPending = function() {
    return this.status === 'pending';
  };

  BillingCycle.prototype.isPaid = function() {
    return this.status === 'paid';
  };

  BillingCycle.prototype.isOverdue = function() {
    return !this.isPaid() && new Date() > this.dueDate;
  };

  BillingCycle.prototype.getDaysOverdue = function() {
    if (!this.isOverdue()) return 0;
    const now = new Date();
    const diffTime = now - this.dueDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  BillingCycle.prototype.markAsPaid = function() {
    this.status = 'paid';
    this.processedAt = new Date();
  };

  BillingCycle.prototype.markAsFailed = function(reason) {
    this.status = 'failed';
    this.metadata = {
      ...this.metadata,
      failureReason: reason,
      failedAt: new Date()
    };
  };

  BillingCycle.prototype.calculateTotal = function() {
    this.totalAmount = this.baseAmount + this.overageAmount - this.discountAmount + this.taxAmount;
    return this.totalAmount;
  };

  // Hooks
  BillingCycle.beforeSave((billingCycle) => {
    // Auto-calculate total if any component changes
    if (billingCycle.changed('baseAmount') || 
        billingCycle.changed('overageAmount') || 
        billingCycle.changed('discountAmount') || 
        billingCycle.changed('taxAmount')) {
      billingCycle.calculateTotal();
    }
  });

  // Class methods
  BillingCycle.findPendingCycles = function() {
    return this.findAll({
      where: { status: 'pending' },
      include: [{
        model: sequelize.models.Subscription,
        as: 'subscription',
        include: [{
          model: sequelize.models.Tenant,
          as: 'tenant'
        }]
      }]
    });
  };

  BillingCycle.findOverdueCycles = function() {
    return this.findAll({
      where: {
        status: { [sequelize.Sequelize.Op.notIn]: ['paid', 'cancelled'] },
        dueDate: { [sequelize.Sequelize.Op.lt]: new Date() }
      },
      include: [{
        model: sequelize.models.Subscription,
        as: 'subscription',
        include: [{
          model: sequelize.models.Tenant,
          as: 'tenant'
        }]
      }]
    });
  };

  BillingCycle.generateForSubscription = async function(subscription) {
    const plan = await sequelize.models.Plan.findByPk(subscription.planId);
    
    // Calculate base amount
    const baseAmount = plan.price;
    
    // Calculate overage charges
    const overageAmount = await this.calculateOverageCharges(
      subscription.tenantId,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd
    );
    
    // Create billing cycle
    const billingCycle = await this.create({
      subscriptionId: subscription.id,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      baseAmount,
      overageAmount,
      totalAmount: baseAmount + overageAmount,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'pending'
    });
    
    return billingCycle;
  };

  BillingCycle.calculateOverageCharges = async function(tenantId, periodStart, periodEnd) {
    const UsageMetric = sequelize.models.UsageMetric;
    
    const overageMetrics = await UsageMetric.findAll({
      where: {
        tenantId,
        metricName: { [sequelize.Sequelize.Op.like]: 'overage_%' },
        periodStart: { [sequelize.Sequelize.Op.gte]: periodStart },
        periodEnd: { [sequelize.Sequelize.Op.lte]: periodEnd }
      }
    });
    
    return overageMetrics.reduce((total, metric) => total + parseFloat(metric.metricValue), 0);
  };

  return BillingCycle;
};
