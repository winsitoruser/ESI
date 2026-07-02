const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const FinancePayablePayment = sequelize.define('FinancePayablePayment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  payableId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  paymentDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  reference: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  paidBy: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'finance_payable_payments',
  timestamps: true
});

FinancePayablePayment.associate = function(models) {
  FinancePayablePayment.belongsTo(models.FinancePayable, {
    foreignKey: 'payableId',
    as: 'payable'
  });
};

module.exports = FinancePayablePayment;
