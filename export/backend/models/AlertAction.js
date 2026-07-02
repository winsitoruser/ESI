'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const AlertAction = sequelize.define('AlertAction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  alertId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'alert_id'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  },
  actionType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'action_type'
  },
  actionData: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'action_data'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'alert_actions',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['alert_id'] },
    { fields: ['user_id'] },
    { fields: ['action_type'] }
  ]
});

module.exports = AlertAction;
