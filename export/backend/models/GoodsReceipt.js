const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const GoodsReceipt = sequelize.define('GoodsReceipt', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  grNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Goods Receipt Number'
  },
  purchaseOrderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'purchase_orders',
      key: 'id'
    }
  },
  receiptDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  receivedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Employees',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('draft', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'draft'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  invoiceNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Supplier invoice number'
  },
  deliveryNote: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  tableName: 'goods_receipts',
  timestamps: true,
  indexes: [
    {
      fields: ['grNumber'],
      unique: true
    },
    {
      fields: ['purchaseOrderId']
    },
    {
      fields: ['receiptDate']
    }
  ]
});

module.exports = GoodsReceipt;
