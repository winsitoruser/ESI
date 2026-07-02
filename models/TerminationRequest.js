'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const TerminationRequest = sequelize.define('TerminationRequest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  terminationType: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'resignation', field: 'termination_type' },
  reason: { type: DataTypes.TEXT, allowNull: false },
  effectiveDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_date' },
  noticeDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'notice_date' },
  noticePeriodDays: { type: DataTypes.INTEGER, defaultValue: 30, field: 'notice_period_days' },
  lastWorkingDay: { type: DataTypes.DATEONLY, allowNull: true, field: 'last_working_day' },
  severanceAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'severance_amount' },
  compensationDetails: { type: DataTypes.JSONB, defaultValue: {}, field: 'compensation_details' },
  status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
  requestedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'requested_by' },
  approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
  approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
  exitInterviewDone: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'exit_interview_done' },
  exitInterviewNotes: { type: DataTypes.TEXT, allowNull: true, field: 'exit_interview_notes' },
  exitInterviewDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'exit_interview_date' },
  clearanceStatus: { type: DataTypes.JSONB, defaultValue: { it: false, finance: false, hr: false, assets: false, admin: false }, field: 'clearance_status' },
  finalSettlement: { type: DataTypes.JSONB, defaultValue: {}, field: 'final_settlement' },
  relatedWarningIds: { type: DataTypes.JSONB, defaultValue: [], field: 'related_warning_ids' },
  relatedCaseId: { type: DataTypes.UUID, allowNull: true, field: 'related_case_id' },
  attachments: { type: DataTypes.JSONB, defaultValue: [] },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'termination_requests',
  timestamps: true,
  underscored: true
});

module.exports = TerminationRequest;
