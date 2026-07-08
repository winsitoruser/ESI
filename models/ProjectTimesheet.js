'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const ProjectTimesheet = sequelize.define('ProjectTimesheet', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
  taskId: { type: DataTypes.UUID, allowNull: true, field: 'task_id' },
  employeeId: { type: DataTypes.UUID, allowNull: true, field: 'employee_id' },
  employeeName: { type: DataTypes.STRING(200), allowNull: true, field: 'employee_name' },
  workDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'work_date' },
  hoursWorked: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'hours_worked' },
  overtimeHours: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'overtime_hours' },
  hourlyRate: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'hourly_rate' },
  totalCost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'total_cost' },
  description: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
  approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
  approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
}, {
  tableName: 'pjm_timesheets',
  timestamps: true,
  underscored: true,
});

module.exports = ProjectTimesheet;
