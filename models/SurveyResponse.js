'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const SurveyResponse = sequelize.define('SurveyResponse', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  surveyId: { type: DataTypes.UUID, allowNull: false, field: 'survey_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: true, field: 'employee_id' },
  answers: { type: DataTypes.JSONB, defaultValue: [] },
  submittedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'submitted_at' },
  isAnonymous: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_anonymous' },
  completionTimeMinutes: { type: DataTypes.INTEGER, allowNull: true, field: 'completion_time_minutes' },
  feedback: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'survey_responses',
  timestamps: true,
  underscored: true,
  updatedAt: false
});

module.exports = SurveyResponse;
