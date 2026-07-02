'use strict';
const { Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    sku: {
      type: DataTypes.STRING,
      unique: true
    },
    barcode: {
      type: DataTypes.STRING
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    supplier_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT
    },
    unit: {
      type: DataTypes.STRING
    },
    buy_price: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    sell_price: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    minimum_stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    maximum_stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    reorder_point: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_trackable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    // Virtual fields for backward compatibility
    price: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue('sell_price');
      },
      set(value) {
        this.setDataValue('sell_price', value);
      }
    },
    stock: {
      type: DataTypes.VIRTUAL,
      get() {
        // Will be populated from inventory_stock relation
        const stockData = this.getDataValue('stock_data');
        if (stockData && stockData.length > 0) {
          return stockData.reduce((sum, s) => sum + parseFloat(s.quantity || 0), 0);
        }
        return 0;
      }
    },
    minStock: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue('minimum_stock');
      }
    },
    maxStock: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue('maximum_stock');
      }
    },
    category: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue('category_id');
      }
    }
  }, {
    tableName: 'products',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
      {
        fields: ['category_id']
      },
      {
        fields: ['name']
      },
      {
        fields: ['sku'],
        unique: true,
        where: {
          sku: { [Op.ne]: null }
        }
      },
      {
        fields: ['supplier_id']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  Product.associate = function(models) {
    // Relasi dengan TransactionItem
    if (models.TransactionItem) {
      Product.hasMany(models.TransactionItem, {
        foreignKey: 'productId',
        as: 'transactionItems'
      });
    }
    
    // Relasi dengan Supplier
    if (models.Supplier) {
      Product.belongsTo(models.Supplier, {
        foreignKey: 'supplier_id',
        as: 'supplierData'
      });
    }
    
    // Relasi dengan InventoryStock (PENTING untuk stock data)
    if (models.Stock) {
      Product.hasMany(models.Stock, {
        foreignKey: 'product_id',
        as: 'stock_data'
      });
    }
    
    // Relasi dengan ProductPrice
    if (models.ProductPrice) {
      Product.hasMany(models.ProductPrice, {
        foreignKey: 'product_id',
        as: 'prices'
      });
    }
    
    // Relasi dengan ProductVariant
    if (models.ProductVariant) {
      Product.hasMany(models.ProductVariant, {
        foreignKey: 'product_id',
        as: 'variants'
      });
    }
    
    // Relasi dengan Recipe
    if (models.Recipe) {
      Product.belongsTo(models.Recipe, {
        foreignKey: 'recipe_id',
        as: 'recipe'
      });
    }
  };

  return Product;
};
