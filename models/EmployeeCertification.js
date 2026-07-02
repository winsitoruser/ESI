'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const EmployeeCertification = sequelize.define('EmployeeCertification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  name: { type: DataTypes.STRING(200), allowNull: false },
  issuingOrganization: { type: DataTypes.STRING(200), allowNull: true, field: 'issuing_organization' },
  credentialId: { type: DataTypes.STRING(100), allowNull: true, field: 'credential_id' },
  issueDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'issue_date' },
  expiryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'expiry_date' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  documentUrl: { type: DataTypes.TEXT, allowNull: true, field: 'document_url' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'employee_certifications',
  timestamps: true,
  underscored: true
});

module.exports = EmployeeCertification;
