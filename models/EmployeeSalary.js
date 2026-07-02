'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const EmployeeSalary = sequelize.define('EmployeeSalary', {
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
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'employee_id'
  },
  payType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'monthly',
    field: 'pay_type',
    comment: 'monthly, daily, hourly, weekly'
  },
  baseSalary: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'base_salary'
  },
  hourlyRate: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'hourly_rate'
  },
  dailyRate: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'daily_rate'
  },
  weeklyHours: {
    type: DataTypes.DECIMAL(5, 1),
    defaultValue: 40,
    field: 'weekly_hours'
  },
  overtimeRateMultiplier: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 1.5,
    field: 'overtime_rate_multiplier'
  },
  overtimeHolidayMultiplier: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 2.0,
    field: 'overtime_holiday_multiplier'
  },
  taxStatus: {
    type: DataTypes.STRING(20),
    defaultValue: 'TK/0',
    field: 'tax_status',
    comment: 'TK/0, K/0, K/1, K/2, K/3'
  },
  taxMethod: {
    type: DataTypes.STRING(20),
    defaultValue: 'gross_up',
    field: 'tax_method',
    comment: 'gross, gross_up, nett'
  },
  bankName: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'bank_name'
  },
  bankAccountNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'bank_account_number'
  },
  bankAccountName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'bank_account_name'
  },
  bpjsKesehatanNumber: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'bpjs_kesehatan_number'
  },
  bpjsKetenagakerjaanNumber: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'bpjs_ketenagakerjaan_number'
  },
  bpjsKesehatanClass: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'bpjs_kesehatan_class'
  },
  npwp: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  effectiveDate: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
    field: 'effective_date'
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'end_date'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'employee_salaries',
  timestamps: true,
  underscored: true
});

module.exports = EmployeeSalary;
