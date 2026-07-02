'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const Survey = sequelize.define('Survey', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  surveyType: { type: DataTypes.STRING(30), defaultValue: 'engagement', field: 'survey_type' },
  status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
  startDate: { type: DataTypes.DATE, allowNull: true, field: 'start_date' },
  endDate: { type: DataTypes.DATE, allowNull: true, field: 'end_date' },
  isAnonymous: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_anonymous' },
  isMandatory: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_mandatory' },
  targetDepartments: { type: DataTypes.JSONB, defaultValue: [], field: 'target_departments' },
  targetPositions: { type: DataTypes.JSONB, defaultValue: [], field: 'target_positions' },
  targetBranches: { type: DataTypes.JSONB, defaultValue: [], field: 'target_branches' },
  questions: { type: DataTypes.JSONB, defaultValue: [] },
  createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
  totalResponses: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_responses' },
  reminderEnabled: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'reminder_enabled' },
  reminderFrequency: { type: DataTypes.STRING(20), defaultValue: 'weekly', field: 'reminder_frequency' }
}, {
  tableName: 'surveys',
  timestamps: true,
  underscored: true
});

module.exports = Survey;
