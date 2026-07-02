'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const PayrollRun = sequelize.define('PayrollRun', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'tenant_id'
  },
  runCode: {
    type: DataTypes.STRING(30),
    allowNull: false,
    field: 'run_code'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  periodStart: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'period_start'
  },
  periodEnd: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'period_end'
  },
  payDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'pay_date'
  },
  payType: {
    type: DataTypes.STRING(20),
    defaultValue: 'monthly',
    field: 'pay_type'
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'branch_id'
  },
  department: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  totalEmployees: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_employees'
  },
  totalGross: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0,
    field: 'total_gross'
  },
  totalDeductions: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0,
    field: 'total_deductions'
  },
  totalNet: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0,
    field: 'total_net'
  },
  totalTax: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0,
    field: 'total_tax'
  },
  totalBpjs: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0,
    field: 'total_bpjs'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'draft',
    comment: 'draft, calculated, approved, paid, cancelled'
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'approved_by'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'paid_at'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by'
  }
}, {
  tableName: 'payroll_runs',
  timestamps: true,
  underscored: true
});

module.exports = PayrollRun;
