const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const FinanceInvoice = sequelize.define('FinanceInvoice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  invoiceNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  type: {
    type: DataTypes.ENUM('supplier', 'customer'),
    allowNull: false
  },
  supplierId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  supplierName: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  customerName: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  purchaseOrderId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  purchaseOrderNumber: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  invoiceDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  totalAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  paidAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  remainingAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  paymentStatus: {
    type: DataTypes.ENUM('unpaid', 'partial', 'paid'),
    defaultValue: 'unpaid'
  },
  inventoryStatus: {
    type: DataTypes.ENUM('pending', 'partial', 'complete'),
    defaultValue: 'pending'
  },
  status: {
    type: DataTypes.ENUM('pending', 'received', 'delivered', 'cancelled'),
    defaultValue: 'pending'
  },
  paymentTerms: {
    type: DataTypes.STRING(50),
    defaultValue: 'NET 30'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'finance_invoices',
  timestamps: true,
  indexes: [
    { fields: ['invoiceNumber'], unique: true },
    { fields: ['type'] },
    { fields: ['paymentStatus'] },
    { fields: ['status'] }
  ]
});

FinanceInvoice.associate = function(models) {
  FinanceInvoice.hasMany(models.FinanceInvoiceItem, {
    foreignKey: 'invoiceId',
    as: 'items'
  });
  
  FinanceInvoice.hasMany(models.FinanceInvoicePayment, {
    foreignKey: 'invoiceId',
    as: 'payments'
  });
};

module.exports = FinanceInvoice;
