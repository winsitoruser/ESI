const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const PosTransaction = sequelize.define('PosTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  transactionNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  shiftId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'shifts',
      key: 'id'
    }
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Customers',
      key: 'id'
    }
  },
  customerName: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  cashierId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Employees',
      key: 'id'
    }
  },
  transactionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  subtotal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  discount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  tax: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.ENUM('Cash', 'Card', 'Transfer', 'QRIS', 'E-Wallet'),
    allowNull: false,
    defaultValue: 'Cash'
  },
  paidAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  changeAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'cancelled', 'refunded'),
    allowNull: false,
    defaultValue: 'completed'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'pos_transactions',
  timestamps: true,
  indexes: [
    {
      fields: ['transactionNumber']
    },
    {
      fields: ['transactionDate']
    },
    {
      fields: ['shiftId']
    },
    {
      fields: ['cashierId']
    },
    {
      fields: ['status']
    }
  ]
});

// Define associations
PosTransaction.associate = (models) => {
  PosTransaction.hasMany(models.PosTransactionItem, {
    foreignKey: 'transactionId',
    as: 'items'
  });
  
  PosTransaction.belongsTo(models.Customer, {
    foreignKey: 'customerId',
    as: 'customer'
  });
  
  PosTransaction.belongsTo(models.Employee, {
    foreignKey: 'cashierId',
    as: 'cashier'
  });
  
  PosTransaction.belongsTo(models.Shift, {
    foreignKey: 'shiftId',
    as: 'shift'
  });
};

module.exports = PosTransaction;
