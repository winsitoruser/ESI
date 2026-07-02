'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const JobGrade = sequelize.define('JobGrade', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  code: { type: DataTypes.STRING(20), allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  level: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  minSalary: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'min_salary' },
  maxSalary: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'max_salary' },
  benefits: { type: DataTypes.JSONB, defaultValue: [] },
  leaveQuota: { type: DataTypes.JSONB, defaultValue: {}, field: 'leave_quota' },
  description: { type: DataTypes.TEXT, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' }
}, {
  tableName: 'job_grades',
  timestamps: true,
  underscored: true
});

module.exports = JobGrade;
