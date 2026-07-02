const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const FinanceAccount = sequelize.define('FinanceAccount', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  accountNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Nomor akun keuangan'
  },
  accountName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Nama akun'
  },
  accountType: {
    type: DataTypes.ENUM('asset', 'liability', 'equity', 'revenue', 'expense'),
    allowNull: false,
    comment: 'Tipe akun: asset, liability, equity, revenue, expense'
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Kategori akun (e.g., Cash, Bank, Inventory, etc.)'
  },
  parentAccountId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'finance_accounts',
      key: 'id'
    },
    comment: 'Parent account untuk hierarchical structure'
  },
  balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Saldo akun saat ini'
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'IDR',
    comment: 'Mata uang'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Deskripsi akun'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'finance_accounts',
  timestamps: true,
  indexes: [
    {
      fields: ['accountNumber'],
      unique: true
    },
    {
      fields: ['accountType']
    },
    {
      fields: ['category']
    }
  ]
});

// Define associations
FinanceAccount.associate = function(models) {
  FinanceAccount.hasMany(models.FinanceTransaction, {
    foreignKey: 'accountId',
    as: 'transactions'
  });
  
  FinanceAccount.belongsTo(FinanceAccount, {
    foreignKey: 'parentAccountId',
    as: 'parentAccount'
  });
  
  FinanceAccount.hasMany(FinanceAccount, {
    foreignKey: 'parentAccountId',
    as: 'subAccounts'
  });
};

module.exports = FinanceAccount;
