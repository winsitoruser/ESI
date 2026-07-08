'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const TravelExpense = sequelize.define('TravelExpense', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  travelRequestId: { type: DataTypes.UUID, allowNull: true, field: 'travel_request_id' },
  employeeId: { type: DataTypes.UUID, allowNull: false, field: 'employee_id' },
  expenseDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'expense_date' },
  category: { type: DataTypes.STRING(50), defaultValue: 'other' },
  description: { type: DataTypes.TEXT, allowNull: true },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  currency: { type: DataTypes.STRING(10), defaultValue: 'IDR' },
  receiptUrl: { type: DataTypes.TEXT, allowNull: true, field: 'receipt_url' },
  status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
}, {
  tableName: 'travel_expenses',
  timestamps: true,
  underscored: true,
});

module.exports = TravelExpense;
