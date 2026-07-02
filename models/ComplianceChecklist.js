'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const ComplianceChecklist = sequelize.define('ComplianceChecklist', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  name: { type: DataTypes.STRING(200), allowNull: false },
  category: { type: DataTypes.STRING(50), defaultValue: 'labor_law' },
  description: { type: DataTypes.TEXT, allowNull: true },
  items: { type: DataTypes.JSONB, defaultValue: [] },
  dueDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'due_date' },
  responsibleId: { type: DataTypes.INTEGER, allowNull: true, field: 'responsible_id' },
  reviewerId: { type: DataTypes.INTEGER, allowNull: true, field: 'reviewer_id' },
  status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
  completionPercent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'completion_percent' },
  completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
  period: { type: DataTypes.STRING(20), defaultValue: 'annual' },
  fiscalYear: { type: DataTypes.INTEGER, allowNull: true, field: 'fiscal_year' },
  branchId: { type: DataTypes.UUID, allowNull: true, field: 'branch_id' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'compliance_checklists',
  timestamps: true,
  underscored: true
});

module.exports = ComplianceChecklist;
