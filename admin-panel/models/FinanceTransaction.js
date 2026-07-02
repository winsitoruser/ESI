const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const FinanceTransaction = sequelize.define('FinanceTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  transactionNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Nomor transaksi unik'
  },
  transactionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Tanggal transaksi'
  },
  transactionType: {
    type: DataTypes.ENUM('income', 'expense', 'transfer'),
    allowNull: false,
    comment: 'Tipe transaksi'
  },
  accountId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'finance_accounts',
      key: 'id'
    },
    comment: 'Akun terkait'
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Kategori transaksi'
  },
  subcategory: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Sub-kategori transaksi'
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Jumlah transaksi'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Deskripsi transaksi'
  },
  referenceType: {
    type: DataTypes.ENUM('invoice', 'bill', 'order', 'manual', 'other'),
    allowNull: true,
    comment: 'Tipe referensi'
  },
  referenceId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID referensi (invoice, bill, etc.)'
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'bank_transfer', 'credit_card', 'debit_card', 'e_wallet', 'other'),
    allowNull: true,
    comment: 'Metode pembayaran'
  },
  contactId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID kontak (customer/supplier)'
  },
  contactName: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Nama kontak'
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of attachment URLs'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Catatan tambahan'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of tags'
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'completed',
    comment: 'Status transaksi'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'User yang membuat transaksi'
  },
  isRecurring: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Apakah transaksi berulang'
  },
  recurringPattern: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Pattern untuk recurring transaction'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'finance_transactions',
  timestamps: true,
  indexes: [
    {
      fields: ['transactionNumber'],
      unique: true
    },
    {
      fields: ['transactionDate']
    },
    {
      fields: ['transactionType']
    },
    {
      fields: ['accountId']
    },
    {
      fields: ['category']
    },
    {
      fields: ['status']
    }
  ]
});

// Define associations
FinanceTransaction.associate = function(models) {
  FinanceTransaction.belongsTo(models.FinanceAccount, {
    foreignKey: 'accountId',
    as: 'account'
  });
};

module.exports = FinanceTransaction;
