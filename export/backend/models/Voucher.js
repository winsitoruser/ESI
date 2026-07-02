const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const Voucher = sequelize.define('Voucher', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Kode voucher unik'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Deskripsi voucher'
  },
  category: {
    type: DataTypes.ENUM('welcome', 'member', 'birthday', 'referral', 'seasonal', 'custom'),
    allowNull: false,
    defaultValue: 'custom',
    comment: 'Kategori voucher'
  },
  type: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    allowNull: false,
    defaultValue: 'fixed',
    comment: 'Tipe diskon: percentage atau fixed amount'
  },
  value: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Nilai diskon (persentase atau nominal)'
  },
  minPurchase: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Minimum pembelian untuk menggunakan voucher'
  },
  maxDiscount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Maximum diskon yang bisa didapat (untuk percentage)'
  },
  validFrom: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Tanggal mulai berlaku'
  },
  validUntil: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Tanggal berakhir voucher'
  },
  usageLimit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Batas total penggunaan voucher (null = unlimited)'
  },
  usageCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Jumlah penggunaan voucher'
  },
  perUserLimit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
    comment: 'Batas penggunaan per user (null = unlimited)'
  },
  applicableFor: {
    type: DataTypes.ENUM('all', 'new_customer', 'existing_customer', 'specific_customer'),
    allowNull: false,
    defaultValue: 'all',
    comment: 'Berlaku untuk siapa'
  },
  specificCustomers: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of customer IDs jika applicableFor = specific_customer'
  },
  applicableProducts: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of product IDs yang berlaku (null = all products)'
  },
  applicableCategories: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of category IDs yang berlaku (null = all categories)'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'expired'),
    allowNull: false,
    defaultValue: 'active',
    comment: 'Status voucher'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'vouchers',
  timestamps: true,
  indexes: [
    {
      fields: ['code'],
      unique: true
    },
    {
      fields: ['category']
    },
    {
      fields: ['status']
    },
    {
      fields: ['validFrom', 'validUntil']
    }
  ]
});

module.exports = Voucher;
