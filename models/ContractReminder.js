'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const ContractReminder = sequelize.define('ContractReminder', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  reminderType: { type: DataTypes.STRING(30), allowNull: false, field: 'reminder_type', comment: 'contract_expiry, certification_expiry, probation_end, document_expiry' },
  referenceId: { type: DataTypes.UUID, allowNull: false, field: 'reference_id' },
  referenceTable: { type: DataTypes.STRING(50), allowNull: false, field: 'reference_table' },
  employeeId: { type: DataTypes.INTEGER, allowNull: true, field: 'employee_id' },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  dueDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'due_date' },
  reminderDaysBefore: { type: DataTypes.ARRAY(DataTypes.INTEGER), defaultValue: [30, 14, 7, 1], field: 'reminder_days_before' },
  lastNotifiedAt: { type: DataTypes.DATE, allowNull: true, field: 'last_notified_at' },
  status: { type: DataTypes.STRING(20), defaultValue: 'active', comment: 'active, resolved, dismissed, expired' },
  isDismissed: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_dismissed' },
  dismissedBy: { type: DataTypes.UUID, allowNull: true, field: 'dismissed_by' },
  dismissedAt: { type: DataTypes.DATE, allowNull: true, field: 'dismissed_at' },
  metadata: { type: DataTypes.JSONB, defaultValue: {} }
}, {
  tableName: 'contract_reminders',
  timestamps: true,
  underscored: true
});

module.exports = ContractReminder;
