'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const WarningLetter = sequelize.define('WarningLetter', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  warningType: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SP1', field: 'warning_type' },
  letterNumber: { type: DataTypes.STRING(50), allowNull: true, field: 'letter_number' },
  issueDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'issue_date' },
  expiryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'expiry_date' },
  violationType: { type: DataTypes.STRING(50), defaultValue: 'discipline', field: 'violation_type' },
  violationDescription: { type: DataTypes.TEXT, allowNull: false, field: 'violation_description' },
  regulationId: { type: DataTypes.UUID, allowNull: true, field: 'regulation_id' },
  previousWarningId: { type: DataTypes.UUID, allowNull: true, field: 'previous_warning_id' },
  issuedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'issued_by' },
  acknowledged: { type: DataTypes.BOOLEAN, defaultValue: false },
  acknowledgedAt: { type: DataTypes.DATE, allowNull: true, field: 'acknowledged_at' },
  status: { type: DataTypes.STRING(20), defaultValue: 'active' },
  attachments: { type: DataTypes.JSONB, defaultValue: [] },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'warning_letters',
  timestamps: true,
  underscored: true
});

module.exports = WarningLetter;
