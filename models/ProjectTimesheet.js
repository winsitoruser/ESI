'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const ProjectTimesheet = sequelize.define('ProjectTimesheet', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  timesheetDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'timesheet_date' },
  hoursWorked: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'hours_worked' },
  overtimeHours: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'overtime_hours' },
  activityDescription: { type: DataTypes.TEXT, allowNull: true, field: 'activity_description' },
  taskCategory: { type: DataTypes.STRING(50), allowNull: true, field: 'task_category' },
  location: { type: DataTypes.STRING(200), allowNull: true },
  status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
  approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
  approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'project_timesheets',
  timestamps: true,
  underscored: true
});

module.exports = ProjectTimesheet;
