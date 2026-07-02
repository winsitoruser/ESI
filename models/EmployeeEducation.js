'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const EmployeeEducation = sequelize.define('EmployeeEducation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  level: { type: DataTypes.STRING(30), allowNull: false, comment: 'SD, SMP, SMA, D3, S1, S2, S3' },
  institution: { type: DataTypes.STRING(200), allowNull: false },
  major: { type: DataTypes.STRING(100), allowNull: true },
  degree: { type: DataTypes.STRING(50), allowNull: true },
  startYear: { type: DataTypes.INTEGER, allowNull: true, field: 'start_year' },
  endYear: { type: DataTypes.INTEGER, allowNull: true, field: 'end_year' },
  gpa: { type: DataTypes.DECIMAL(4, 2), allowNull: true },
  isHighest: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_highest' },
  certificateNumber: { type: DataTypes.STRING(100), allowNull: true, field: 'certificate_number' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'employee_educations',
  timestamps: true,
  underscored: true
});

module.exports = EmployeeEducation;
