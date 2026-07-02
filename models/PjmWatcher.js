'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PjmWatcher = sequelize.define('PjmWatcher', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
    taskId: { type: DataTypes.UUID, allowNull: true, field: 'task_id' },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
    userName: { type: DataTypes.STRING(100), field: 'user_name' },
    notifyEmail: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'notify_email' },
    notifyInApp: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'notify_in_app' }
  }, { tableName: 'pjm_watchers', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false });

  PjmWatcher.associate = (models) => {
    PjmWatcher.belongsTo(models.PjmProject, { foreignKey: 'projectId', as: 'project' });
    PjmWatcher.belongsTo(models.PjmTask, { foreignKey: 'taskId', as: 'task' });
  };

  return PjmWatcher;
};
