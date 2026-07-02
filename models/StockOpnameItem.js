const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const StockOpnameItem = sequelize.define('StockOpnameItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stock_opname_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'stock_opnames',
      key: 'id'
    }
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  location_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'locations',
      key: 'id'
    }
  },
  system_stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  physical_stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  difference: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'Physical - System'
  },
  variance_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  unit_cost: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  variance_value: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Difference * Unit Cost'
  },
  variance_category: {
    type: DataTypes.ENUM('none', 'minor', 'moderate', 'major'),
    defaultValue: 'none'
  },
  status: {
    type: DataTypes.ENUM('pending', 'counted', 'verified', 'investigated', 'approved'),
    defaultValue: 'pending'
  },
  counted_by: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  count_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  recount_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  recount_value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  recount_by: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  recount_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  root_cause: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  corrective_action: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'stock_opname_items',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['stock_opname_id']
    },
    {
      fields: ['product_id']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = StockOpnameItem;
