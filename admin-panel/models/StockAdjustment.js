const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const StockAdjustment = sequelize.define('StockAdjustment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  adjustmentNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Branches',
      key: 'id'
    }
  },
  adjustmentDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  adjustmentType: {
    type: DataTypes.ENUM('count', 'damage', 'expired', 'lost', 'found', 'correction'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'approved', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'draft'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Employees',
      key: 'id'
    }
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Employees',
      key: 'id'
    }
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'stock_adjustments',
  timestamps: true,
  indexes: [
    {
      fields: ['adjustmentNumber'],
      unique: true
    },
    {
      fields: ['branchId']
    },
    {
      fields: ['adjustmentDate']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = StockAdjustment;
