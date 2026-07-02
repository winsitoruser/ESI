'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const HeadcountPlan = sequelize.define('HeadcountPlan', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  name: { type: DataTypes.STRING(200), allowNull: false },
  periodStart: { type: DataTypes.DATEONLY, allowNull: false, field: 'period_start' },
  periodEnd: { type: DataTypes.DATEONLY, allowNull: false, field: 'period_end' },
  department: { type: DataTypes.STRING(100), allowNull: true },
  branchId: { type: DataTypes.UUID, allowNull: true, field: 'branch_id' },
  currentHeadcount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'current_headcount' },
  plannedHeadcount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'planned_headcount' },
  approvedHeadcount: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_headcount' },
  budgetAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'budget_amount' },
  status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
  justification: { type: DataTypes.TEXT, allowNull: true },
  approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
  approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
  details: { type: DataTypes.JSONB, defaultValue: [] },
  createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' }
}, {
  tableName: 'headcount_plans',
  timestamps: true,
  underscored: true
});

module.exports = HeadcountPlan;
