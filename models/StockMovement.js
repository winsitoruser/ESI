const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const StockMovement = sequelize.define('StockMovement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Products',
      key: 'id'
    }
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Branches',
      key: 'id'
    }
  },
  movementType: {
    type: DataTypes.ENUM(
      'in',           // Stock masuk
      'out',          // Stock keluar
      'transfer',     // Transfer antar cabang
      'adjustment',   // Penyesuaian stok
      'return',       // Retur
      'damage',       // Barang rusak
      'expired',      // Barang kadaluarsa
      'sale',         // Penjualan
      'purchase'      // Pembelian
    ),
    allowNull: false
  },
  quantity: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Positive for IN, negative for OUT'
  },
  unitCost: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Cost per unit at time of movement'
  },
  totalCost: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Total cost of movement'
  },
  referenceType: {
    type: DataTypes.ENUM(
      'purchase_order',
      'sales_order',
      'pos_transaction',
      'stock_transfer',
      'stock_adjustment',
      'manual'
    ),
    allowNull: false
  },
  referenceId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID of related document'
  },
  referenceNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Document number (PO#, SO#, etc.)'
  },
  fromBranchId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Branches',
      key: 'id'
    },
    comment: 'For transfers'
  },
  toBranchId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Branches',
      key: 'id'
    },
    comment: 'For transfers'
  },
  batchNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  performedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Employees',
      key: 'id'
    }
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Employees',
      key: 'id'
    }
  },
  movementDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  balanceBefore: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Stock balance before movement'
  },
  balanceAfter: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Stock balance after movement'
  }
}, {
  tableName: 'stock_movements',
  timestamps: true,
  indexes: [
    {
      fields: ['productId', 'movementDate']
    },
    {
      fields: ['movementType']
    },
    {
      fields: ['referenceType', 'referenceId']
    },
    {
      fields: ['branchId']
    },
    {
      fields: ['batchNumber']
    },
    {
      fields: ['expiryDate']
    }
  ]
});

// Define associations
StockMovement.associate = function(models) {
  StockMovement.belongsTo(models.Product, {
    foreignKey: 'productId',
    as: 'product'
  });
};

module.exports = StockMovement;
