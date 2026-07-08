'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const Project = sequelize.define('Project', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  projectCode: { type: DataTypes.STRING(50), allowNull: true, field: 'project_code' },
  name: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  category: { type: DataTypes.STRING(100), allowNull: true },
  status: { type: DataTypes.STRING(20), defaultValue: 'planning' },
  priority: { type: DataTypes.STRING(20), defaultValue: 'medium' },
  startDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'start_date' },
  endDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'end_date' },
  actualStartDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'actual_start_date' },
  actualEndDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'actual_end_date' },
  progressPercent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'progress_percent' },
  budgetAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'budget_amount' },
  actualCost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'actual_cost' },
  currency: { type: DataTypes.STRING(10), defaultValue: 'IDR' },
  managerId: { type: DataTypes.INTEGER, allowNull: true, field: 'manager_id' },
  managerName: { type: DataTypes.STRING(200), allowNull: true, field: 'manager_name' },
  department: { type: DataTypes.STRING(100), allowNull: true },
  clientName: { type: DataTypes.STRING(200), allowNull: true, field: 'client_name' },
  tags: { type: DataTypes.JSONB, defaultValue: [] },
  customFields: { type: DataTypes.JSONB, defaultValue: {}, field: 'custom_fields' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
}, {
  tableName: 'pjm_projects',
  timestamps: true,
  underscored: true,
});

module.exports = Project;
