'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PjmAttachment = sequelize.define('PjmAttachment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
    taskId: { type: DataTypes.UUID, allowNull: true, field: 'task_id' },
    commentId: { type: DataTypes.UUID, allowNull: true, field: 'comment_id' },
    fileName: { type: DataTypes.STRING(255), allowNull: false, field: 'file_name' },
    fileUrl: { type: DataTypes.TEXT, allowNull: false, field: 'file_url' },
    fileSize: { type: DataTypes.INTEGER, defaultValue: 0, field: 'file_size' },
    mimeType: { type: DataTypes.STRING(100), field: 'mime_type' },
    uploadedBy: { type: DataTypes.INTEGER, field: 'uploaded_by' },
    uploadedByName: { type: DataTypes.STRING(100), field: 'uploaded_by_name' }
  }, { tableName: 'pjm_attachments', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false });

  PjmAttachment.associate = (models) => {
    PjmAttachment.belongsTo(models.PjmProject, { foreignKey: 'projectId', as: 'project' });
    PjmAttachment.belongsTo(models.PjmTask, { foreignKey: 'taskId', as: 'task' });
  };

  return PjmAttachment;
};
