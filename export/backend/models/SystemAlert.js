'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const SystemAlert = sequelize.define('SystemAlert', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  alertType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'alert_type'
  },
  severity: {
    type: DataTypes.ENUM('info', 'warning', 'critical', 'urgent'),
    allowNull: false,
    defaultValue: 'info'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  source: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  referenceType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'reference_type'
  },
  referenceId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'reference_id'
  },
  referenceData: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'reference_data'
  },
  actionRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'action_required'
  },
  actionType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'action_type'
  },
  actionUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'action_url'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_read'
  },
  isResolved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_resolved'
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'resolved_at'
  },
  resolvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'resolved_by'
  },
  resolutionNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'resolution_notes'
  },
  assignedTo: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'assigned_to'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'system_alerts',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['alert_type'] },
    { fields: ['severity'] },
    { fields: ['category'] },
    { fields: ['is_read'] },
    { fields: ['is_resolved'] },
    { fields: ['created_at'] },
    { fields: ['reference_type', 'reference_id'] },
    { fields: ['assigned_to'] },
    { fields: ['expires_at'] }
  ]
});

module.exports = SystemAlert;
