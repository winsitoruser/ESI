'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const Recognition = sequelize.define('Recognition', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  fromEmployeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'from_employee_id' },
  toEmployeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'to_employee_id' },
  recognitionType: { type: DataTypes.STRING(30), defaultValue: 'kudos', field: 'recognition_type' },
  title: { type: DataTypes.STRING(200), allowNull: true },
  message: { type: DataTypes.TEXT, allowNull: true },
  points: { type: DataTypes.INTEGER, defaultValue: 0 },
  badge: { type: DataTypes.STRING(50), allowNull: true },
  category: { type: DataTypes.STRING(50), defaultValue: 'general' },
  isPublic: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_public' },
  likesCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'likes_count' },
  likedBy: { type: DataTypes.JSONB, defaultValue: [], field: 'liked_by' },
  approved: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'recognitions',
  timestamps: true,
  underscored: true
});

module.exports = Recognition;
