'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const PieceworkEntry = sequelize.define('PieceworkEntry', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  employeeId: { type: DataTypes.UUID, allowNull: false, field: 'employee_id' },
  projectId: { type: DataTypes.UUID, allowNull: true, field: 'project_id' },
  workDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'work_date' },
  description: { type: DataTypes.STRING(500), allowNull: true },
  workType: { type: DataTypes.STRING(100), allowNull: true, field: 'work_type' },
  quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: 0 },
  unit: { type: DataTypes.STRING(50), defaultValue: 'unit' },
  unitRate: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'unit_rate' },
  totalAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'total_amount' },
  status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
  approvedBy: { type: DataTypes.UUID, allowNull: true, field: 'approved_by' },
  approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
  payrollRunId: { type: DataTypes.UUID, allowNull: true, field: 'payroll_run_id' },
  payrollItemId: { type: DataTypes.UUID, allowNull: true, field: 'payroll_item_id' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' },
}, {
  tableName: 'piecework_entries',
  timestamps: true,
  underscored: true,
});

module.exports = PieceworkEntry;
