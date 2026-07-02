'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const EmployeeDocument = sequelize.define('EmployeeDocument', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  documentType: { type: DataTypes.STRING(50), allowNull: false, field: 'document_type', comment: 'KONTRAK_KERJA, PKWT, PKWTT, NDA, SP, SK_PENGANGKATAN, SK_MUTASI, SK_PROMOSI, KTP, KK, NPWP, BPJS, IJAZAH, SERTIFIKAT, SIM, PASPOR, OTHER' },
  documentNumber: { type: DataTypes.STRING(100), allowNull: true, field: 'document_number' },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  fileUrl: { type: DataTypes.TEXT, allowNull: true, field: 'file_url' },
  fileName: { type: DataTypes.STRING(200), allowNull: true, field: 'file_name' },
  fileSize: { type: DataTypes.INTEGER, allowNull: true, field: 'file_size' },
  mimeType: { type: DataTypes.STRING(100), allowNull: true, field: 'mime_type' },
  issueDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'issue_date' },
  expiryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'expiry_date' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  status: { type: DataTypes.STRING(20), defaultValue: 'active', comment: 'active, expired, revoked, draft' },
  signedBy: { type: DataTypes.STRING(200), allowNull: true, field: 'signed_by' },
  signedDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'signed_date' },
  version: { type: DataTypes.INTEGER, defaultValue: 1 },
  tags: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
  metadata: { type: DataTypes.JSONB, defaultValue: {} },
  createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' }
}, {
  tableName: 'employee_documents',
  timestamps: true,
  underscored: true
});

module.exports = EmployeeDocument;
