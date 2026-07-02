'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const EmployeeWorkExperience = sequelize.define('EmployeeWorkExperience', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  companyName: { type: DataTypes.STRING(200), allowNull: false, field: 'company_name' },
  position: { type: DataTypes.STRING(100), allowNull: false },
  department: { type: DataTypes.STRING(100), allowNull: true },
  startDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'start_date' },
  endDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'end_date' },
  isCurrent: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_current' },
  salary: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  reasonLeaving: { type: DataTypes.TEXT, allowNull: true, field: 'reason_leaving' },
  description: { type: DataTypes.TEXT, allowNull: true },
  referenceName: { type: DataTypes.STRING(100), allowNull: true, field: 'reference_name' },
  referencePhone: { type: DataTypes.STRING(20), allowNull: true, field: 'reference_phone' }
}, {
  tableName: 'employee_work_experiences',
  timestamps: true,
  underscored: true
});

module.exports = EmployeeWorkExperience;
