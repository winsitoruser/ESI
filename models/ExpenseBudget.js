'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const ExpenseBudget = sequelize.define('ExpenseBudget', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  department: { type: DataTypes.STRING(100), allowNull: true },
  branchId: { type: DataTypes.UUID, allowNull: true, field: 'branch_id' },
  category: { type: DataTypes.STRING(50), defaultValue: 'travel' },
  fiscalYear: { type: DataTypes.INTEGER, allowNull: false, field: 'fiscal_year' },
  monthlyLimit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'monthly_limit' },
  annualLimit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'annual_limit' },
  usedAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'used_amount' },
  remainingAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'remaining_amount' },
  currency: { type: DataTypes.STRING(10), defaultValue: 'IDR' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'expense_budgets',
  timestamps: true,
  underscored: true
});

module.exports = ExpenseBudget;
