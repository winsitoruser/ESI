'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const AttendanceSetting = sequelize.define('AttendanceSetting', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'tenant_id'
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'branch_id'
  },
  settingKey: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'setting_key'
  },
  settingValue: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    field: 'setting_value'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'attendance_settings',
  timestamps: true,
  underscored: true
});

module.exports = AttendanceSetting;
