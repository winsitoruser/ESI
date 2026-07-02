'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const KPITemplate = sequelize.define('KPITemplate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'Unique KPI code e.g., KPI-SALES-001'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.ENUM('sales', 'operations', 'customer', 'financial', 'hr', 'quality'),
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '%',
    comment: 'Unit of measurement: %, Rp, unit, transaksi, etc.'
  },
  dataType: {
    type: DataTypes.ENUM('number', 'percentage', 'currency', 'count', 'ratio'),
    allowNull: false,
    defaultValue: 'number',
    field: 'data_type'
  },
  formulaType: {
    type: DataTypes.ENUM('simple', 'weighted', 'cumulative', 'average', 'ratio', 'custom'),
    allowNull: false,
    defaultValue: 'simple',
    field: 'formula_type'
  },
  formula: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Custom formula expression if formulaType is custom'
  },
  scoringMethod: {
    type: DataTypes.ENUM('linear', 'step', 'threshold', 'bell_curve'),
    allowNull: false,
    defaultValue: 'linear',
    field: 'scoring_method'
  },
  scoringScale: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      min: 0,
      max: 100,
      excellent: { min: 90, max: 100, score: 5 },
      good: { min: 75, max: 89, score: 4 },
      average: { min: 60, max: 74, score: 3 },
      belowAverage: { min: 40, max: 59, score: 2 },
      poor: { min: 0, max: 39, score: 1 }
    },
    field: 'scoring_scale',
    comment: 'Scoring scale configuration'
  },
  defaultTarget: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'default_target'
  },
  defaultWeight: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
    field: 'default_weight',
    comment: 'Default weight in percentage'
  },
  measurementFrequency: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly'),
    allowNull: false,
    defaultValue: 'monthly',
    field: 'measurement_frequency'
  },
  applicableTo: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: ['all'],
    field: 'applicable_to',
    comment: 'Roles/positions this KPI applies to'
  },
  parameters: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Configurable parameters for this KPI template'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'tenant_id'
  }
}, {
  tableName: 'kpi_templates',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['code'], unique: true },
    { fields: ['category'] },
    { fields: ['is_active'] },
    { fields: ['tenant_id'] }
  ]
});

module.exports = KPITemplate;
