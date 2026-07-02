'use strict';

module.exports = (sequelize, DataTypes) => {
  const PriceTier = sequelize.define('PriceTier', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Kode tier (misal: AIRPORT, MALL, STREET)'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nama tier (misal: Harga Bandara, Harga Mall)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    multiplier: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 1.00,
      comment: 'Pengali harga dari harga standar (misal: 1.20 = 20% lebih mahal)'
    },
    markup_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Persentase markup tambahan'
    },
    markup_amount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      comment: 'Nominal markup tetap'
    },
    region: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Wilayah/zona geografis'
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    province: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    location_type: {
      type: DataTypes.ENUM('airport', 'mall', 'street', 'tourist_area', 'residential', 'office_area', 'custom'),
      defaultValue: 'custom',
      comment: 'Tipe lokasi untuk kategori harga'
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Prioritas penerapan jika ada overlap (lebih tinggi = lebih prioritas)'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    effective_from: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Tanggal mulai berlaku'
    },
    effective_until: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Tanggal berakhir (null = tidak ada batas)'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'price_tiers',
    timestamps: true,
    underscored: true
  });

  PriceTier.associate = (models) => {
    // PriceTier has many ProductPrices
    PriceTier.hasMany(models.ProductPrice, {
      foreignKey: 'price_tier_id',
      as: 'prices'
    });

    // PriceTier has many Branches
    if (models.Branch) {
      PriceTier.hasMany(models.Branch, {
        foreignKey: 'price_tier_id',
        as: 'branches'
      });
    }

    // Created by User
    if (models.User) {
      PriceTier.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator'
      });
      PriceTier.belongsTo(models.User, {
        foreignKey: 'updated_by',
        as: 'updater'
      });
    }
  };

  return PriceTier;
};
