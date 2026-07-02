'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const ProjectWorker = sequelize.define('ProjectWorker', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  role: { type: DataTypes.STRING(100), allowNull: true },
  assignmentStart: { type: DataTypes.DATEONLY, allowNull: true, field: 'assignment_start' },
  assignmentEnd: { type: DataTypes.DATEONLY, allowNull: true, field: 'assignment_end' },
  dailyRate: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'daily_rate' },
  hourlyRate: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'hourly_rate' },
  allocationPercent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 100, field: 'allocation_percent' },
  status: { type: DataTypes.STRING(20), defaultValue: 'active' },
  workerType: { type: DataTypes.STRING(30), defaultValue: 'permanent', field: 'worker_type' },
  contractId: { type: DataTypes.UUID, allowNull: true, field: 'contract_id' },
  contractNumber: { type: DataTypes.STRING(100), allowNull: true, field: 'contract_number' },
  skills: { type: DataTypes.JSONB, defaultValue: [] },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'project_workers',
  timestamps: true,
  underscored: true
});

module.exports = ProjectWorker;
