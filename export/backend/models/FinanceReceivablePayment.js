const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const FinanceReceivablePayment = sequelize.define('FinanceReceivablePayment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  receivableId: {
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
  receivedBy: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'finance_receivable_payments',
  timestamps: true
});

FinanceReceivablePayment.associate = function(models) {
  FinanceReceivablePayment.belongsTo(models.FinanceReceivable, {
    foreignKey: 'receivableId',
    as: 'receivable'
  });
};

module.exports = FinanceReceivablePayment;
