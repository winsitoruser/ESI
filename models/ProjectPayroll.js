'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const ProjectPayroll = sequelize.define('ProjectPayroll', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  periodStart: { type: DataTypes.DATEONLY, allowNull: false, field: 'period_start' },
  periodEnd: { type: DataTypes.DATEONLY, allowNull: false, field: 'period_end' },
  regularHours: { type: DataTypes.DECIMAL(7, 2), defaultValue: 0, field: 'regular_hours' },
  overtimeHours: { type: DataTypes.DECIMAL(7, 2), defaultValue: 0, field: 'overtime_hours' },
  dailyRate: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'daily_rate' },
  overtimeRate: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'overtime_rate' },
  daysWorked: { type: DataTypes.INTEGER, defaultValue: 0, field: 'days_worked' },
  grossAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'gross_amount' },
  deductions: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  allowances: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  netAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'net_amount' },
  currency: { type: DataTypes.STRING(10), defaultValue: 'IDR' },
  status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
  approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
  approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
  paidAt: { type: DataTypes.DATE, allowNull: true, field: 'paid_at' },
  paymentRef: { type: DataTypes.STRING(100), allowNull: true, field: 'payment_ref' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'project_payroll',
  timestamps: true,
  underscored: true
});

module.exports = ProjectPayroll;
