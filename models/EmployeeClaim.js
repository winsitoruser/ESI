'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const EmployeeClaim = sequelize.define('EmployeeClaim', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  claimNumber: { type: DataTypes.STRING(50), allowNull: true, field: 'claim_number' },
  claimType: { type: DataTypes.STRING(50), allowNull: false, field: 'claim_type', comment: 'transport, meal, medical, training, travel, equipment, other' },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  approvedAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, field: 'approved_amount' },
  currency: { type: DataTypes.STRING(5), defaultValue: 'IDR' },
  claimDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'claim_date' },
  description: { type: DataTypes.TEXT, allowNull: true },
  receiptUrl: { type: DataTypes.TEXT, allowNull: true, field: 'receipt_url' },
  receiptNumber: { type: DataTypes.STRING(100), allowNull: true, field: 'receipt_number' },
  status: { type: DataTypes.STRING(20), defaultValue: 'pending', comment: 'pending, approved, rejected, paid, cancelled' },
  currentApprovalStep: { type: DataTypes.INTEGER, defaultValue: 0, field: 'current_approval_step' },
  paidDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'paid_date' },
  paidBy: { type: DataTypes.UUID, allowNull: true, field: 'paid_by' },
  paymentRef: { type: DataTypes.STRING(100), allowNull: true, field: 'payment_ref' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'employee_claims',
  timestamps: true,
  underscored: true
});

module.exports = EmployeeClaim;
