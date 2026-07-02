const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const FinanceInvoicePayment = sequelize.define('FinanceInvoicePayment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  invoiceId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  paymentDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  reference: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  receivedBy: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'finance_invoice_payments',
  timestamps: true
});

FinanceInvoicePayment.associate = function(models) {
  FinanceInvoicePayment.belongsTo(models.FinanceInvoice, {
    foreignKey: 'invoiceId',
    as: 'invoice'
  });
};

module.exports = FinanceInvoicePayment;
