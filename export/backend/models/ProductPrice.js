'use strict';

module.exports = (sequelize, DataTypes) => {
  const ProductPrice = sequelize.define('ProductPrice', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    price_type: {
      type: DataTypes.ENUM('regular', 'member', 'tier_bronze', 'tier_silver', 'tier_gold', 'tier_platinum'),
      allowNull: false,
      defaultValue: 'regular'
    },
    tier_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    discount_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    discount_amount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    min_quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    max_quantity: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Menu Locking - Harga standar dari Pusat
    is_standard: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Jika true, harga ini adalah harga standar dari Pusat dan tidak bisa diubah oleh BRANCH_MANAGER'
    },
    // Branch-specific pricing
    branch_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Jika null, berlaku untuk semua cabang. Jika diisi, harga khusus untuk cabang tertentu'
    },
    // Regional Pricing Tier
    price_tier_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Zona/tier harga (misal: Bandara, Mall, Ruko)'
    },
    // Audit trail untuk perubahan harga
    locked_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User ID yang mengunci harga ini sebagai standar'
    },
    locked_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Waktu harga dikunci sebagai standar'
    },
    // Approval workflow
    requires_approval: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Jika true, perubahan harga memerlukan approval dari Pusat'
    },
    approval_status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: true
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'product_prices',
    timestamps: true,
    underscored: true
  });

  ProductPrice.associate = (models) => {
    // Belongs to Product
    ProductPrice.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });

    // Belongs to LoyaltyTier (optional)
    if (models.LoyaltyTier) {
      ProductPrice.belongsTo(models.LoyaltyTier, {
        foreignKey: 'tier_id',
        as: 'tier'
      });
    }

    // Belongs to Branch (optional - for branch-specific pricing)
    if (models.Branch) {
      ProductPrice.belongsTo(models.Branch, {
        foreignKey: 'branch_id',
        as: 'branch'
      });
    }

    // Belongs to PriceTier (optional - for regional pricing)
    if (models.PriceTier) {
      ProductPrice.belongsTo(models.PriceTier, {
        foreignKey: 'price_tier_id',
        as: 'priceTier'
      });
    }

    // Belongs to User (locked by)
    if (models.User) {
      ProductPrice.belongsTo(models.User, {
        foreignKey: 'locked_by',
        as: 'lockedByUser'
      });
      ProductPrice.belongsTo(models.User, {
        foreignKey: 'approved_by',
        as: 'approvedByUser'
      });
    }
  };

  return ProductPrice;
};
