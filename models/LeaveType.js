'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const LeaveType = sequelize.define('LeaveType', {
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
  category: {
    type: DataTypes.STRING(30),
    defaultValue: 'regular'
  },
  maxDaysPerYear: {
    type: DataTypes.INTEGER,
    defaultValue: 12,
    field: 'max_days_per_year'
  },
  minDaysPerRequest: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'min_days_per_request'
  },
  maxDaysPerRequest: {
    type: DataTypes.INTEGER,
    defaultValue: 14,
    field: 'max_days_per_request'
  },
  carryForward: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'carry_forward'
  },
  maxCarryForwardDays: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'max_carry_forward_days'
  },
  requiresAttachment: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'requires_attachment'
  },
  requiresMedicalCert: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'requires_medical_cert'
  },
  isPaid: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_paid'
  },
  salaryDeductionPercent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    field: 'salary_deduction_percent'
  },
  applicableGender: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'applicable_gender'
  },
  minServiceMonths: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'min_service_months'
  },
  applicableDepartments: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'applicable_departments'
  },
  applicablePositions: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'applicable_positions'
  },
  color: {
    type: DataTypes.STRING(20),
    defaultValue: '#3B82F6'
  },
  icon: {
    type: DataTypes.STRING(30),
    defaultValue: 'calendar'
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
  tableName: 'leave_types',
  timestamps: true,
  underscored: true
});

module.exports = LeaveType;
