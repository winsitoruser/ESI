const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const PrinterConfig = sequelize.define('PrinterConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'thermal'
  },
  connectionType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'network'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  port: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 9100
  },
  settings: {
    type: DataTypes.JSON,
    allowNull: true
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'printer_configs',
  timestamps: true
});

module.exports = PrinterConfig;
