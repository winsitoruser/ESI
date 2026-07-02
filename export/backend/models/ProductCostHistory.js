const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const ProductCostHistory = sequelize.define('ProductCostHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'product_id'
  },
  
  // Cost Details
  oldHpp: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'old_hpp'
  },
  newHpp: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'new_hpp'
  },
  changeAmount: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'change_amount'
  },
  changePercentage: {
    type: DataTypes.DECIMAL(5, 2),
    field: 'change_percentage'
  },
  
  // Cost Breakdown
  purchasePrice: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'purchase_price'
  },
  packagingCost: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'packaging_cost'
  },
  laborCost: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'labor_cost'
  },
  overheadCost: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'overhead_cost'
  },
  
  // Reason & Source
  changeReason: {
    type: DataTypes.STRING(255),
    field: 'change_reason'
  },
  sourceReference: {
    type: DataTypes.STRING(100),
    field: 'source_reference'
  },
  notes: {
    type: DataTypes.TEXT
  },
  
  // Audit
  changedBy: {
    type: DataTypes.UUID,
    field: 'changed_by'
  },
  changedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'changed_at'
  }
}, {
  tableName: 'product_cost_history',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// Associations
ProductCostHistory.associate = function(models) {
  ProductCostHistory.belongsTo(models.Product, {
    foreignKey: 'productId',
    as: 'product'
  });
  
  if (models.Employee) {
    ProductCostHistory.belongsTo(models.Employee, {
      foreignKey: 'changedBy',
      as: 'changer'
    });
  }
};

module.exports = ProductCostHistory;
