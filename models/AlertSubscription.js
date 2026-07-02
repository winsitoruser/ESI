'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const AlertSubscription = sequelize.define('AlertSubscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  },
  alertType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'alert_type'
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  isEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_enabled'
  },
  notifyEmail: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'notify_email'
  },
  notifySms: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'notify_sms'
  },
  notifyPush: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'notify_push'
  },
  minSeverity: {
    type: DataTypes.ENUM('info', 'warning', 'critical', 'urgent'),
    defaultValue: 'info',
    field: 'min_severity'
  }
}, {
  tableName: 'alert_subscriptions',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id', 'alert_type'] },
    { fields: ['user_id', 'category'] }
  ]
});

module.exports = AlertSubscription;
