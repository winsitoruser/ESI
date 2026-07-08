'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const IrCase = sequelize.define('IrCase', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  caseNumber: { type: DataTypes.STRING(50), allowNull: true, field: 'case_number' },
  title: { type: DataTypes.STRING(200), allowNull: false },
  caseType: { type: DataTypes.STRING(50), defaultValue: 'misconduct', field: 'case_type' },
  employeeId: { type: DataTypes.UUID, allowNull: true, field: 'employee_id' },
  description: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING(30), defaultValue: 'open' },
  priority: { type: DataTypes.STRING(20), defaultValue: 'medium' },
  assignedTo: { type: DataTypes.INTEGER, allowNull: true, field: 'assigned_to' },
  openedDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'opened_date' },
  closedDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'closed_date' },
  resolution: { type: DataTypes.TEXT, allowNull: true },
  evidence: { type: DataTypes.JSONB, defaultValue: [] },
  witnesses: { type: DataTypes.JSONB, defaultValue: [] },
  createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
}, {
  tableName: 'ir_cases',
  timestamps: true,
  underscored: true,
});

module.exports = IrCase;
