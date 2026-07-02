'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const CompanyRegulation = sequelize.define('CompanyRegulation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  title: { type: DataTypes.STRING(200), allowNull: false },
  regulationNumber: { type: DataTypes.STRING(50), allowNull: true, field: 'regulation_number' },
  category: { type: DataTypes.STRING(50), defaultValue: 'company_rule' },
  description: { type: DataTypes.TEXT, allowNull: true },
  content: { type: DataTypes.TEXT, allowNull: true },
  effectiveDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_date' },
  expiryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'expiry_date' },
  documentUrl: { type: DataTypes.TEXT, allowNull: true, field: 'document_url' },
  status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
  version: { type: DataTypes.INTEGER, defaultValue: 1 },
  parentRegulationId: { type: DataTypes.UUID, allowNull: true, field: 'parent_regulation_id' },
  approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
  approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
  applicableDepartments: { type: DataTypes.JSONB, defaultValue: [], field: 'applicable_departments' },
  applicableBranches: { type: DataTypes.JSONB, defaultValue: [], field: 'applicable_branches' },
  tags: { type: DataTypes.JSONB, defaultValue: [] },
  createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' }
}, {
  tableName: 'company_regulations',
  timestamps: true,
  underscored: true
});

module.exports = CompanyRegulation;
