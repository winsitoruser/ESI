'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const OrgStructure = sequelize.define('OrgStructure', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  name: { type: DataTypes.STRING(100), allowNull: false },
  code: { type: DataTypes.STRING(50), allowNull: true },
  parentId: { type: DataTypes.UUID, allowNull: true, field: 'parent_id' },
  level: { type: DataTypes.INTEGER, defaultValue: 0 },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' },
  headEmployeeId: { type: DataTypes.UUID, allowNull: true, field: 'head_employee_id' },
  description: { type: DataTypes.TEXT, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  metadata: { type: DataTypes.JSONB, defaultValue: {} }
}, {
  tableName: 'org_structures',
  timestamps: true,
  underscored: true
});

module.exports = OrgStructure;
