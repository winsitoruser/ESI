const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const FinanceReceivable = sequelize.define('FinanceReceivable', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  customerName: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  customerPhone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  invoiceId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  invoiceNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  salesOrderNumber: {
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
  status: {
    type: DataTypes.ENUM('unpaid', 'partial', 'paid', 'overdue'),
    defaultValue: 'unpaid'
  },
  paymentTerms: {
    type: DataTypes.STRING(50),
    defaultValue: 'NET 30'
  },
  daysPastDue: {
    type: DataTypes.INTEGER,
    defaultValue: 0
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
  tableName: 'finance_receivables',
  timestamps: true,
  indexes: [
    { fields: ['invoiceNumber'], unique: true },
    { fields: ['status'] },
    { fields: ['customerId'] },
    { fields: ['dueDate'] }
  ]
});

FinanceReceivable.associate = function(models) {
  FinanceReceivable.hasMany(models.FinanceReceivablePayment, {
    foreignKey: 'receivableId',
    as: 'payments'
  });
};

module.exports = FinanceReceivable;
