'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const WorkShift = sequelize.define('WorkShift', {
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
  code: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  shiftType: {
    type: DataTypes.STRING(30),
    defaultValue: 'regular',
    field: 'shift_type'
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'start_time'
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'end_time'
  },
  breakStart: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'break_start'
  },
  breakEnd: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'break_end'
  },
  breakDurationMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 60,
    field: 'break_duration_minutes'
  },
  isCrossDay: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_cross_day'
  },
  workHoursPerDay: {
    type: DataTypes.DECIMAL(4, 2),
    defaultValue: 8.00,
    field: 'work_hours_per_day'
  },
  color: {
    type: DataTypes.STRING(20),
    defaultValue: '#3B82F6'
  },
  toleranceLateMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 15,
    field: 'tolerance_late_minutes'
  },
  toleranceEarlyLeaveMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 15,
    field: 'tolerance_early_leave_minutes'
  },
  overtimeAfterMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 30,
    field: 'overtime_after_minutes'
  },
  applicableDays: {
    type: DataTypes.JSONB,
    defaultValue: [1, 2, 3, 4, 5],
    field: 'applicable_days'
  },
  applicableDepartments: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'applicable_departments'
  },
  applicableBranches: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'applicable_branches'
  },
  maxEmployeesPerShift: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'max_employees_per_shift'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sort_order'
  }
}, {
  tableName: 'work_shifts',
  timestamps: true,
  underscored: true
});

module.exports = WorkShift;
