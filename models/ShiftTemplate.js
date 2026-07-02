const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const ShiftTemplate = sequelize.define('ShiftTemplate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  shiftType: {
    type: DataTypes.ENUM('pagi', 'siang', 'malam', 'full'),
    allowNull: false
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  breakDuration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Break duration in minutes'
  },
  color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '#3B82F6'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'shift_templates',
  timestamps: true,
  indexes: [
    {
      fields: ['shiftType']
    },
    {
      fields: ['isActive']
    }
  ]
});

module.exports = ShiftTemplate;
