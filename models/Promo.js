const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const Promo = sequelize.define('Promo', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Nama promo'
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Kode promo unik'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Deskripsi promo'
  },
  type: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    allowNull: false,
    defaultValue: 'percentage',
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
    comment: 'Minimum pembelian untuk menggunakan promo'
  },
  maxDiscount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Maximum diskon yang bisa didapat (untuk percentage)'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Tanggal mulai promo'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Tanggal berakhir promo'
  },
  usageLimit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Batas penggunaan promo (null = unlimited)'
  },
  usageCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Jumlah penggunaan promo'
  },
  perUserLimit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Batas penggunaan per user (null = unlimited)'
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
    comment: 'Status promo'
  },
  promoScope: {
    type: DataTypes.ENUM('general', 'product_specific', 'category', 'bundle'),
    allowNull: false,
    defaultValue: 'general',
    comment: 'Scope of promo application'
  },
  autoApply: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Auto-apply promo at checkout'
  },
  stackable: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Can be combined with other promos'
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Priority for auto-apply (higher = first)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'promos',
  timestamps: true,
  indexes: [
    {
      fields: ['code'],
      unique: true
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
Promo.associate = function(models) {
  Promo.hasMany(models.PromoProduct, {
    foreignKey: 'promoId',
    as: 'promoProducts'
  });
  
  Promo.hasMany(models.PromoBundle, {
    foreignKey: 'promoId',
    as: 'promoBundles'
  });
  
  Promo.hasMany(models.PromoCategory, {
    foreignKey: 'promoId',
    as: 'promoCategories'
  });
};

module.exports = Promo;
