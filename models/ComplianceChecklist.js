'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const ComplianceChecklist = sequelize.define('ComplianceChecklist', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  name: { type: DataTypes.STRING(200), allowNull: false },
  category: { type: DataTypes.STRING(50), defaultValue: 'labor_law' },
  description: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
  period: { type: DataTypes.STRING(20), defaultValue: 'annual' },
  items: { type: DataTypes.JSONB, defaultValue: [] },
  dueDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'due_date' },
  completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
}, {
  tableName: 'compliance_checklists',
  timestamps: true,
  underscored: true,
});

module.exports = ComplianceChecklist;
