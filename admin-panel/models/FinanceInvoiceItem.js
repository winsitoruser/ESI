const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const FinanceInvoiceItem = sequelize.define('FinanceInvoiceItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  invoiceId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  productName: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  total: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  receivedQuantity: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'finance_invoice_items',
  timestamps: true,
  indexes: [
    { fields: ['invoiceId'] }
  ]
});

FinanceInvoiceItem.associate = function(models) {
  FinanceInvoiceItem.belongsTo(models.FinanceInvoice, {
    foreignKey: 'invoiceId',
    as: 'invoice'
  });
};

module.exports = FinanceInvoiceItem;
