const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PaymentTransaction = sequelize.define('PaymentTransaction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'invoice_id',
      references: { model: 'invoices', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    billingCycleId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'billing_cycle_id',
      references: { model: 'billing_cycles', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'IDR'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'refunded'),
      allowNull: false,
      defaultValue: 'pending'
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    providerTransactionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'provider_transaction_id'
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'payment_method'
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'failure_reason'
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'processed_at'
    },
    rawPayload: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'raw_payload'
    }
  }, {
    tableName: 'payment_transactions',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['invoice_id'] },
      { fields: ['status'] },
      { fields: ['provider'] }
    ]
  });

  PaymentTransaction.associate = (models) => {
    if (models.Invoice) {
      PaymentTransaction.belongsTo(models.Invoice, { foreignKey: 'invoiceId', as: 'invoice' });
    }
    if (models.BillingCycle) {
      PaymentTransaction.belongsTo(models.BillingCycle, { foreignKey: 'billingCycleId', as: 'billingCycle' });
    }
  };

  PaymentTransaction.prototype.markCompleted = function(providerTxId, method) {
    this.status = 'completed';
    this.processedAt = new Date();
    if (providerTxId) this.providerTransactionId = providerTxId;
    if (method) this.paymentMethod = method;
  };

  PaymentTransaction.prototype.markFailed = function(reason) {
    this.status = 'failed';
    this.failureReason = reason || null;
    this.processedAt = new Date();
  };

  return PaymentTransaction;
};
