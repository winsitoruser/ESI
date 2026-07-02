const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const ProductCostComponent = sequelize.define('ProductCostComponent', {
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
  
  componentType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'component_type',
    validate: {
      isIn: [['material', 'packaging', 'labor', 'overhead', 'other']]
    }
  },
  componentName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'component_name'
  },
  componentDescription: {
    type: DataTypes.TEXT,
    field: 'component_description'
  },
  
  costAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    field: 'cost_amount',
    validate: {
      min: 0
    }
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 3),
    defaultValue: 1,
    validate: {
      min: 0
    }
  },
  unit: {
    type: DataTypes.STRING(20)
  },
  
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'product_cost_components',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Instance methods
ProductCostComponent.prototype.getTotalCost = function() {
  return parseFloat(this.costAmount) * parseFloat(this.quantity);
};

// Associations
ProductCostComponent.associate = function(models) {
  ProductCostComponent.belongsTo(models.Product, {
    foreignKey: 'productId',
    as: 'product'
  });
};

module.exports = ProductCostComponent;
