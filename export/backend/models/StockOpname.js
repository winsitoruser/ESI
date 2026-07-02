const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const StockOpname = sequelize.define('StockOpname', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  opname_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  opname_type: {
    type: DataTypes.ENUM('full', 'cycle', 'spot'),
    defaultValue: 'full',
    comment: 'full=Full Count, cycle=Cycle Count, spot=Spot Check'
  },
  warehouse_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'warehouses',
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
  status: {
    type: DataTypes.ENUM('draft', 'in_progress', 'completed', 'approved', 'posted', 'cancelled'),
    defaultValue: 'draft'
  },
  scheduled_date: {
    type: DataTypes.DATEONLY,
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
  performed_by: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  supervised_by: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  approved_by: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  approved_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  total_items: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  counted_items: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  items_with_variance: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_variance_value: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  freeze_inventory: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether to freeze inventory transactions during count'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'stock_opnames',
  timestamps: true,
  underscored: true
});

module.exports = StockOpname;
