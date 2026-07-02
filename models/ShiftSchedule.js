'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const ShiftSchedule = sequelize.define('ShiftSchedule', {
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
  employeeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'employee_id'
  },
  workShiftId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'work_shift_id'
  },
  scheduleDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'schedule_date'
  },
  customStartTime: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'custom_start_time'
  },
  customEndTime: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'custom_end_time'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'scheduled'
  },
  swapRequestedWith: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'swap_requested_with'
  },
  swapStatus: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'swap_status'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  assignedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'assigned_by'
  },
  rotationId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'rotation_id'
  }
}, {
  tableName: 'shift_schedules',
  timestamps: true,
  underscored: true
});

module.exports = ShiftSchedule;
