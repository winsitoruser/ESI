'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const LeaveApprovalConfig = sequelize.define('LeaveApprovalConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'tenant_id'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  department: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  division: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'branch_id'
  },
  leaveTypeCode: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'leave_type_code'
  },
  minDaysTrigger: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'min_days_trigger'
  },
  maxAutoApproveDays: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'max_auto_approve_days'
  },
  approvalLevels: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'approval_levels'
  },
  escalationHours: {
    type: DataTypes.INTEGER,
    defaultValue: 48,
    field: 'escalation_hours'
  },
  notifyHr: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'notify_hr'
  },
  notifyManager: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'notify_manager'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'leave_approval_configs',
  timestamps: true,
  underscored: true
});

module.exports = LeaveApprovalConfig;
