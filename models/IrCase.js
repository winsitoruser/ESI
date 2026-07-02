'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const IrCase = sequelize.define('IrCase', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  caseNumber: { type: DataTypes.STRING(50), allowNull: true, field: 'case_number' },
  title: { type: DataTypes.STRING(200), allowNull: false },
  category: { type: DataTypes.STRING(50), defaultValue: 'misconduct' },
  priority: { type: DataTypes.STRING(20), defaultValue: 'medium' },
  status: { type: DataTypes.STRING(30), defaultValue: 'open' },
  reportedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'reported_by' },
  reportedDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'reported_date' },
  involvedEmployees: { type: DataTypes.JSONB, defaultValue: [], field: 'involved_employees' },
  description: { type: DataTypes.TEXT, allowNull: true },
  investigationNotes: { type: DataTypes.TEXT, allowNull: true, field: 'investigation_notes' },
  resolution: { type: DataTypes.TEXT, allowNull: true },
  resolutionDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'resolution_date' },
  investigatorId: { type: DataTypes.INTEGER, allowNull: true, field: 'investigator_id' },
  hearingDate: { type: DataTypes.DATE, allowNull: true, field: 'hearing_date' },
  hearingNotes: { type: DataTypes.TEXT, allowNull: true, field: 'hearing_notes' },
  actionsTaken: { type: DataTypes.JSONB, defaultValue: [], field: 'actions_taken' },
  attachments: { type: DataTypes.JSONB, defaultValue: [] }
}, {
  tableName: 'ir_cases',
  timestamps: true,
  underscored: true
});

module.exports = IrCase;
