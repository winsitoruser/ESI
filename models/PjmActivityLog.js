'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PjmActivityLog = sequelize.define('PjmActivityLog', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
    entityType: { type: DataTypes.STRING(30), allowNull: false, field: 'entity_type' },
    entityId: { type: DataTypes.STRING(100), field: 'entity_id' },
    action: { type: DataTypes.STRING(50), allowNull: false },
    actorUserId: { type: DataTypes.INTEGER, field: 'actor_user_id' },
    actorName: { type: DataTypes.STRING(100), field: 'actor_name' },
    description: { type: DataTypes.TEXT },
    oldValue: { type: DataTypes.JSONB, field: 'old_value' },
    newValue: { type: DataTypes.JSONB, field: 'new_value' },
    metadata: { type: DataTypes.JSONB, defaultValue: {} }
  }, { tableName: 'pjm_activity_log', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false });

  PjmActivityLog.associate = (models) => {
    PjmActivityLog.belongsTo(models.PjmProject, { foreignKey: 'projectId', as: 'project' });
  };

  return PjmActivityLog;
};
