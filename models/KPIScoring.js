'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const KPIScoring = sequelize.define('KPIScoring', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  scoringType: {
    type: DataTypes.ENUM('standard', 'custom'),
    allowNull: false,
    defaultValue: 'standard',
    field: 'scoring_type'
  },
  levels: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [
      { level: 5, label: 'Excellent', minPercent: 110, maxPercent: 999, color: '#10B981', description: 'Melampaui target secara signifikan' },
      { level: 4, label: 'Good', minPercent: 100, maxPercent: 109, color: '#3B82F6', description: 'Mencapai atau sedikit melampaui target' },
      { level: 3, label: 'Average', minPercent: 80, maxPercent: 99, color: '#F59E0B', description: 'Mendekati target' },
      { level: 2, label: 'Below Average', minPercent: 60, maxPercent: 79, color: '#F97316', description: 'Di bawah target' },
      { level: 1, label: 'Poor', minPercent: 0, maxPercent: 59, color: '#EF4444', description: 'Jauh dari target' }
    ],
    comment: 'Scoring levels configuration'
  },
  weightedScoring: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'weighted_scoring'
  },
  bonusRules: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      enabled: false,
      thresholds: [
        { minScore: 4.5, bonusPercent: 15 },
        { minScore: 4.0, bonusPercent: 10 },
        { minScore: 3.5, bonusPercent: 5 }
      ]
    },
    field: 'bonus_rules'
  },
  penaltyRules: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      enabled: false,
      thresholds: [
        { maxScore: 2.0, penaltyPercent: 10 },
        { maxScore: 1.5, penaltyPercent: 15 }
      ]
    },
    field: 'penalty_rules'
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_default'
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'tenant_id'
  }
}, {
  tableName: 'kpi_scoring',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['scoring_type'] },
    { fields: ['is_default'] },
    { fields: ['tenant_id'] }
  ]
});

module.exports = KPIScoring;
