'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const Announcement = sequelize.define('Announcement', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  title: { type: DataTypes.STRING(200), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  category: { type: DataTypes.STRING(30), defaultValue: 'general' },
  priority: { type: DataTypes.STRING(20), defaultValue: 'normal' },
  publishedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'published_by' },
  publishDate: { type: DataTypes.DATE, allowNull: true, field: 'publish_date' },
  expiryDate: { type: DataTypes.DATE, allowNull: true, field: 'expiry_date' },
  targetDepartments: { type: DataTypes.JSONB, defaultValue: [], field: 'target_departments' },
  targetBranches: { type: DataTypes.JSONB, defaultValue: [], field: 'target_branches' },
  targetRoles: { type: DataTypes.JSONB, defaultValue: [], field: 'target_roles' },
  isPinned: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_pinned' },
  attachments: { type: DataTypes.JSONB, defaultValue: [] },
  readBy: { type: DataTypes.JSONB, defaultValue: [], field: 'read_by' },
  readCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'read_count' },
  status: { type: DataTypes.STRING(20), defaultValue: 'draft' }
}, {
  tableName: 'announcements',
  timestamps: true,
  underscored: true
});

module.exports = Announcement;
