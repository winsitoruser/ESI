'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const ManpowerBudget = sequelize.define('ManpowerBudget', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  fiscalYear: { type: DataTypes.INTEGER, allowNull: false, field: 'fiscal_year' },
  department: { type: DataTypes.STRING(100), allowNull: true },
  branchId: { type: DataTypes.UUID, allowNull: true, field: 'branch_id' },
  budgetCategory: { type: DataTypes.STRING(50), defaultValue: 'salary', field: 'budget_category' },
  plannedAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'planned_amount' },
  actualAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'actual_amount' },
  variance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  currency: { type: DataTypes.STRING(10), defaultValue: 'IDR' },
  status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
  approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
  approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  breakdown: { type: DataTypes.JSONB, defaultValue: [] }
}, {
  tableName: 'manpower_budgets',
  timestamps: true,
  underscored: true
});

module.exports = ManpowerBudget;
