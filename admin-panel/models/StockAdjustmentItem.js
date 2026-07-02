const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const StockAdjustmentItem = sequelize.define('StockAdjustmentItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  stockAdjustmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'stock_adjustments',
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
  systemQuantity: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Quantity in system before adjustment'
  },
  physicalQuantity: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Actual physical count'
  },
  adjustmentQuantity: {
    type: DataTypes.VIRTUAL,
    get() {
      return parseFloat(this.physicalQuantity) - parseFloat(this.systemQuantity);
    }
  },
  unitCost: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  totalCost: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  batchNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'stock_adjustment_items',
  timestamps: true,
  indexes: [
    {
      fields: ['stockAdjustmentId']
    },
    {
      fields: ['productId']
    }
  ]
});

module.exports = StockAdjustmentItem;
