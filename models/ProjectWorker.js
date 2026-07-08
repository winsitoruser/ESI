'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const ProjectWorker = sequelize.define('ProjectWorker', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
  resourceName: { type: DataTypes.STRING(200), allowNull: true, field: 'resource_name' },
  resourceType: { type: DataTypes.STRING(50), defaultValue: 'employee', field: 'resource_type' },
  role: { type: DataTypes.STRING(100), allowNull: true },
  employeeId: { type: DataTypes.UUID, allowNull: true, field: 'employee_id' },
  allocationPercent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 100, field: 'allocation_percent' },
  startDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'start_date' },
  endDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'end_date' },
  costPerHour: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'cost_per_hour' },
  totalCost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'total_cost' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
}, {
  tableName: 'pjm_resources',
  timestamps: true,
  underscored: true,
});

module.exports = ProjectWorker;
