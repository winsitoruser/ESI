const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Invoice = sequelize.define('Invoice', {
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
    billingCycleId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'billing_cycles',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'subscriptions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    invoiceNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded'),
      allowNull: false,
      defaultValue: 'draft'
    },
    issuedDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    paidDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    discountAmount: {
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
    // Payment details
    paymentProvider: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'stripe, midtrans, manual'
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'credit_card, bank_transfer, ewallet'
    },
    externalId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'External payment ID'
    },
    paymentFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    // Customer details
    customerName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    customerEmail: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    customerPhone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    customerAddress: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'invoices',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['invoice_number']
      },
      {
        fields: ['tenant_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['due_date']
      },
      {
        fields: ['billing_cycle_id']
      },
      {
        fields: ['subscription_id']
      }
    ]
  });

  Invoice.associate = (models) => {
    // Invoice belongs to tenant
    Invoice.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });

    // Invoice belongs to billing cycle
    Invoice.belongsTo(models.BillingCycle, {
      foreignKey: 'billingCycleId',
      as: 'billingCycle'
    });

    // Invoice belongs to subscription
    Invoice.belongsTo(models.Subscription, {
      foreignKey: 'subscriptionId',
      as: 'subscription'
    });

    // Invoice has many invoice items
    Invoice.hasMany(models.InvoiceItem, {
      foreignKey: 'invoiceId',
      as: 'items'
    });

    // Invoice has many payment transactions
    Invoice.hasMany(models.PaymentTransaction, {
      foreignKey: 'invoiceId',
      as: 'paymentTransactions'
    });
  };

  // Instance methods
  Invoice.prototype.isDraft = function() {
    return this.status === 'draft';
  };

  Invoice.prototype.isSent = function() {
    return this.status === 'sent';
  };

  Invoice.prototype.isPaid = function() {
    return this.status === 'paid';
  };

  Invoice.prototype.isOverdue = function() {
    return this.status === 'overdue' || 
           (['sent', 'paid'].includes(this.status) && new Date() > this.dueDate && !this.isPaid());
  };

  Invoice.prototype.isCancelled = function() {
    return this.status === 'cancelled';
  };

  Invoice.prototype.getDaysOverdue = function() {
    if (!this.isOverdue()) return 0;
    const now = new Date();
    const diffTime = now - this.dueDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  Invoice.prototype.markAsSent = function() {
    this.status = 'sent';
    this.issuedDate = new Date();
  };

  Invoice.prototype.markAsPaid = function(paymentDate = new Date()) {
    this.status = 'paid';
    this.paidDate = paymentDate;
  };

  Invoice.prototype.markAsOverdue = function() {
    if (this.status === 'sent') {
      this.status = 'overdue';
    }
  };

  Invoice.prototype.cancel = function(reason) {
    this.status = 'cancelled';
    this.metadata = {
      ...this.metadata,
      cancellationReason: reason,
      cancelledAt: new Date()
    };
  };

  Invoice.prototype.calculateTotal = function() {
    this.totalAmount = this.subtotal + this.taxAmount - this.discountAmount;
    return this.totalAmount;
  };

  Invoice.prototype.getFormattedTotal = function() {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: this.currency
    }).format(this.totalAmount);
  };

  // Hooks
  Invoice.beforeCreate(async (invoice) => {
    // Generate invoice number
    if (!invoice.invoiceNumber) {
      const prefix = 'INV';
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      
      // Get sequential number for the month
      const count = await Invoice.count({
        where: {
          invoiceNumber: { [sequelize.Sequelize.Op.like]: `${prefix}${year}${month}%` }
        }
      });
      
      const sequence = String(count + 1).padStart(4, '0');
      invoice.invoiceNumber = `${prefix}${year}${month}${sequence}`;
    }
    
    // Auto-calculate total
    invoice.calculateTotal();
  });

  Invoice.beforeSave((invoice) => {
    // Recalculate total if components change
    if (invoice.changed('subtotal') || 
        invoice.changed('taxAmount') || 
        invoice.changed('discountAmount')) {
      invoice.calculateTotal();
    }
  });

  // Class methods
  Invoice.findByTenant = function(tenantId, options = {}) {
    return this.findAll({
      where: { tenantId },
      include: [{
        model: sequelize.models.InvoiceItem,
        as: 'items'
      }],
      order: [['issuedDate', 'DESC']],
      ...options
    });
  };

  Invoice.findOverdue = function() {
    return this.findAll({
      where: {
        status: { [sequelize.Sequelize.Op.notIn]: ['paid', 'cancelled', 'refunded'] },
        dueDate: { [sequelize.Sequelize.Op.lt]: new Date() }
      },
      include: [{
        model: sequelize.models.Tenant,
        as: 'tenant'
      }]
    });
  };

  Invoice.findPendingPayment = function() {
    return this.findAll({
      where: {
        status: 'sent'
      },
      include: [{
        model: sequelize.models.Tenant,
        as: 'tenant'
      }]
    });
  };

  Invoice.generateFromBillingCycle = async function(billingCycle) {
    const subscription = billingCycle.subscription;
    const tenant = await subscription.getTenant();
    
    // Create invoice
    const invoice = await this.create({
      tenantId: billingCycle.subscription.tenantId,
      billingCycleId: billingCycle.id,
      subscriptionId: billingCycle.subscriptionId,
      subtotal: billingCycle.baseAmount + billingCycle.overageAmount,
      taxAmount: billingCycle.taxAmount,
      discountAmount: billingCycle.discountAmount,
      totalAmount: billingCycle.totalAmount,
      currency: billingCycle.currency,
      dueDate: billingCycle.dueDate,
      customerName: tenant.businessName,
      customerEmail: tenant.businessEmail,
      customerPhone: tenant.businessPhone,
      customerAddress: tenant.businessAddress,
      status: 'draft'
    });
    
    // Create invoice items
    if (billingCycle.baseAmount > 0) {
      await sequelize.models.InvoiceItem.create({
        invoiceId: invoice.id,
        description: `${subscription.plan.name} - ${subscription.plan.billingInterval}`,
        quantity: 1,
        unitPrice: billingCycle.baseAmount,
        amount: billingCycle.baseAmount,
        type: 'plan',
        referenceType: 'plan',
        referenceId: subscription.planId
      });
    }
    
    if (billingCycle.overageAmount > 0) {
      await sequelize.models.InvoiceItem.create({
        invoiceId: invoice.id,
        description: 'Usage Overage Charges',
        quantity: 1,
        unitPrice: billingCycle.overageAmount,
        amount: billingCycle.overageAmount,
        type: 'overage'
      });
    }
    
    return invoice;
  };

  return Invoice;
};
