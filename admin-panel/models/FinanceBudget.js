const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const FinanceBudget = sequelize.define('FinanceBudget', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  budgetName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Nama budget'
  },
  budgetPeriod: {
    type: DataTypes.ENUM('monthly', 'quarterly', 'yearly'),
    allowNull: false,
    comment: 'Periode budget'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Tanggal mulai budget'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Tanggal akhir budget'
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Kategori budget'
  },
  accountId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'finance_accounts',
      key: 'id'
    },
    comment: 'Akun terkait (optional)'
  },
  budgetAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Jumlah budget yang dialokasikan'
  },
  spentAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Jumlah yang sudah terpakai'
  },
  remainingAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Sisa budget'
  },
  alertThreshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 80,
    comment: 'Persentase threshold untuk alert (default 80%)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Deskripsi budget'
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'exceeded', 'cancelled'),
    allowNull: false,
    defaultValue: 'active',
    comment: 'Status budget'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'finance_budgets',
  timestamps: true,
  indexes: [
    {
      fields: ['budgetPeriod']
    },
    {
      fields: ['category']
    },
    {
      fields: ['status']
    },
    {
      fields: ['startDate', 'endDate']
    }
  ]
});

// Define associations
FinanceBudget.associate = function(models) {
  FinanceBudget.belongsTo(models.FinanceAccount, {
    foreignKey: 'accountId',
    as: 'account'
  });
};

module.exports = FinanceBudget;
