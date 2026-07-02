const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const ShiftHandover = sequelize.define('ShiftHandover', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  shiftId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'shifts',
      key: 'id'
    }
  },
  handoverFrom: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Employees',
      key: 'id'
    }
  },
  handoverTo: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Employees',
      key: 'id'
    }
  },
  handoverAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  finalCashAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'rejected'),
    allowNull: false,
    defaultValue: 'completed'
  }
}, {
  tableName: 'shift_handovers',
  timestamps: true,
  indexes: [
    {
      fields: ['shiftId']
    },
    {
      fields: ['handoverFrom', 'handoverTo']
    }
  ]
});

module.exports = ShiftHandover;
