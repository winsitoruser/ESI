const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const Shift = sequelize.define('Shift', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  shiftName: {
    type: DataTypes.ENUM('Pagi', 'Siang', 'Malam'),
    allowNull: false
  },
  shiftDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  openedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Employees',
      key: 'id'
    }
  },
  openedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  closedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Employees',
      key: 'id'
    }
  },
  closedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  initialCashAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  finalCashAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  expectedCashAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  cashDifference: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  totalSales: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  totalTransactions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'branch_id',
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('open', 'closed'),
    allowNull: false,
    defaultValue: 'open'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'shifts',
  timestamps: true,
  indexes: [
    {
      fields: ['shiftDate', 'status']
    },
    {
      fields: ['openedBy']
    },
    {
      fields: ['branch_id']
    }
  ]
});

// Define associations
Shift.associate = (models) => {
  Shift.belongsTo(models.Employee, {
    foreignKey: 'openedBy',
    as: 'opener'
  });
  
  Shift.belongsTo(models.Employee, {
    foreignKey: 'closedBy',
    as: 'closer'
  });
  
  Shift.belongsTo(models.Branch, {
    foreignKey: 'branchId',
    as: 'branch'
  });
  
  Shift.hasMany(models.PosTransaction, {
    foreignKey: 'shiftId',
    as: 'transactions'
  });
};

module.exports = Shift;
