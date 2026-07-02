'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const ShiftRotation = sequelize.define('ShiftRotation', {
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
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rotationType: {
    type: DataTypes.STRING(30),
    defaultValue: 'weekly',
    field: 'rotation_type'
  },
  rotationPattern: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'rotation_pattern'
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
  employeeIds: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'employee_ids'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'end_date'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  autoGenerate: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'auto_generate'
  },
  generateWeeksAhead: {
    type: DataTypes.INTEGER,
    defaultValue: 2,
    field: 'generate_weeks_ahead'
  },
  lastGeneratedDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'last_generated_date'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by'
  }
}, {
  tableName: 'shift_rotations',
  timestamps: true,
  underscored: true
});

module.exports = ShiftRotation;
