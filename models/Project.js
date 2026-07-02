'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const Project = sequelize.define('Project', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  projectCode: { type: DataTypes.STRING(50), allowNull: true, field: 'project_code' },
  name: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  clientName: { type: DataTypes.STRING(200), allowNull: true, field: 'client_name' },
  clientContact: { type: DataTypes.STRING(200), allowNull: true, field: 'client_contact' },
  location: { type: DataTypes.STRING(200), allowNull: true },
  startDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'start_date' },
  endDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'end_date' },
  actualEndDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'actual_end_date' },
  status: { type: DataTypes.STRING(20), defaultValue: 'planning' },
  budgetAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'budget_amount' },
  actualCost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'actual_cost' },
  budgetCurrency: { type: DataTypes.STRING(10), defaultValue: 'IDR', field: 'budget_currency' },
  projectManagerId: { type: DataTypes.INTEGER, allowNull: true, field: 'project_manager_id' },
  department: { type: DataTypes.STRING(100), allowNull: true },
  industry: { type: DataTypes.STRING(50), allowNull: true },
  contractNumber: { type: DataTypes.STRING(100), allowNull: true, field: 'contract_number' },
  contractValue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'contract_value' },
  completionPercent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'completion_percent' },
  priority: { type: DataTypes.STRING(20), defaultValue: 'medium' },
  tags: { type: DataTypes.JSONB, defaultValue: [] },
  milestones: { type: DataTypes.JSONB, defaultValue: [] }
}, {
  tableName: 'projects',
  timestamps: true,
  underscored: true
});

module.exports = Project;
