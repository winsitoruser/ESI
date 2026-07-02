const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const GoodsReceiptItem = sequelize.define('GoodsReceiptItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  goodsReceiptId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'goods_receipts',
      key: 'id'
    }
  },
  purchaseOrderItemId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'purchase_order_items',
      key: 'id'
    }
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Products',
      key: 'id'
    }
  },
  orderedQuantity: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  receivedQuantity: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  acceptedQuantity: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  rejectedQuantity: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  batchNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  manufacturingDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  unitCost: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  totalCost: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'goods_receipt_items',
  timestamps: true,
  indexes: [
    {
      fields: ['goodsReceiptId']
    },
    {
      fields: ['purchaseOrderItemId']
    },
    {
      fields: ['productId']
    },
    {
      fields: ['batchNumber']
    },
    {
      fields: ['expiryDate']
    }
  ]
});

module.exports = GoodsReceiptItem;
