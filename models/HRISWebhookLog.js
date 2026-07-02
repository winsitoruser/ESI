'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const HRISWebhookLog = sequelize.define('HRISWebhookLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  eventType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'e.g. employee.created, attendance.clock_in, kpi.achieved'
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  employeeName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  branchName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  data: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  triggeredBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('triggered', 'processed', 'failed'),
    allowNull: false,
    defaultValue: 'triggered'
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'hris_webhook_logs',
  timestamps: true,
  indexes: [
    { fields: ['eventType'] },
    { fields: ['employeeId'] },
    { fields: ['branchId'] },
    { fields: ['status'] },
    { fields: ['tenantId'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = HRISWebhookLog;
