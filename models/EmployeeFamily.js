'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const EmployeeFamily = sequelize.define('EmployeeFamily', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  name: { type: DataTypes.STRING(100), allowNull: false },
  relationship: { type: DataTypes.STRING(30), allowNull: false, comment: 'spouse, child, parent, sibling, other' },
  gender: { type: DataTypes.STRING(10), allowNull: true },
  dateOfBirth: { type: DataTypes.DATEONLY, allowNull: true, field: 'date_of_birth' },
  placeOfBirth: { type: DataTypes.STRING(100), allowNull: true, field: 'place_of_birth' },
  nationalId: { type: DataTypes.STRING(30), allowNull: true, field: 'national_id' },
  phoneNumber: { type: DataTypes.STRING(20), allowNull: true, field: 'phone_number' },
  occupation: { type: DataTypes.STRING(100), allowNull: true },
  isEmergencyContact: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_emergency_contact' },
  isDependent: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_dependent' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'employee_families',
  timestamps: true,
  underscored: true
});

module.exports = EmployeeFamily;
