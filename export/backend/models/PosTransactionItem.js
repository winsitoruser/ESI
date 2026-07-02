const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const PosTransactionItem = sequelize.define('PosTransactionItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  transactionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'pos_transactions',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Products',
      key: 'id'
    }
  },
  productName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  productSku: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  unitPrice: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  discount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  subtotal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'pos_transaction_items',
  timestamps: true,
  indexes: [
    {
      fields: ['transactionId']
    },
    {
      fields: ['productId']
    }
  ]
});

// Define associations
PosTransactionItem.associate = (models) => {
  PosTransactionItem.belongsTo(models.PosTransaction, {
    foreignKey: 'transactionId',
    as: 'transaction'
  });
  
  PosTransactionItem.belongsTo(models.Product, {
    foreignKey: 'productId',
    as: 'product'
  });
};

module.exports = PosTransactionItem;
