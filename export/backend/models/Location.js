const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const Location = sequelize.define('Location', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  warehouse_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'warehouses',
      key: 'id'
    }
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('rack', 'shelf', 'bin', 'pallet', 'floor', 'chiller', 'freezer'),
    defaultValue: 'rack'
  },
  aisle: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Aisle number/letter (e.g., A, B, C)'
  },
  row: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Row number (e.g., 1, 2, 3)'
  },
  level: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Level/shelf number (e.g., 1, 2, 3)'
  },
  capacity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Capacity in units or kg'
  },
  current_usage: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'Current usage in units or kg'
  },
  status: {
    type: DataTypes.ENUM('available', 'occupied', 'reserved', 'maintenance'),
    defaultValue: 'available'
  },
  temperature_controlled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  temperature_min: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Minimum temperature in Celsius'
  },
  temperature_max: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Maximum temperature in Celsius'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'locations',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['warehouse_id', 'code']
    }
  ]
});

module.exports = Location;
