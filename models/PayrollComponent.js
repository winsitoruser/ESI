'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const PayrollComponent = sequelize.define('PayrollComponent', {
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
  type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'earning',
    comment: 'earning or deduction'
  },
  category: {
    type: DataTypes.STRING(30),
    defaultValue: 'fixed',
    comment: 'fixed, variable, calculated, daily, annual'
  },
  calculationType: {
    type: DataTypes.STRING(20),
    defaultValue: 'fixed',
    field: 'calculation_type',
    comment: 'fixed, percentage, per_day, formula'
  },
  defaultAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'default_amount'
  },
  percentageBase: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'percentage_base'
  },
  percentageValue: {
    type: DataTypes.DECIMAL(8, 4),
    defaultValue: 0,
    field: 'percentage_value'
  },
  formula: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isTaxable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_taxable'
  },
  isMandatory: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_mandatory'
  },
  appliesToPayTypes: {
    type: DataTypes.JSONB,
    defaultValue: ['monthly'],
    field: 'applies_to_pay_types'
  },
  applicableDepartments: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'applicable_departments'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sort_order'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'payroll_components',
  timestamps: true,
  underscored: true
});

module.exports = PayrollComponent;
