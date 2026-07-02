'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PjmComment = sequelize.define('PjmComment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
    taskId: { type: DataTypes.UUID, allowNull: true, field: 'task_id' },
    parentCommentId: { type: DataTypes.UUID, allowNull: true, field: 'parent_comment_id' },
    authorUserId: { type: DataTypes.INTEGER, field: 'author_user_id' },
    authorName: { type: DataTypes.STRING(100), field: 'author_name' },
    authorEmployeeId: { type: DataTypes.UUID, allowNull: true, field: 'author_employee_id' },
    body: { type: DataTypes.TEXT, allowNull: false },
    mentions: { type: DataTypes.JSONB, defaultValue: [] },
    attachments: { type: DataTypes.JSONB, defaultValue: [] },
    isEdited: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_edited' },
    isPinned: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_pinned' },
    reactions: { type: DataTypes.JSONB, defaultValue: {} }
  }, { tableName: 'pjm_comments', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  PjmComment.associate = (models) => {
    PjmComment.belongsTo(models.PjmProject, { foreignKey: 'projectId', as: 'project' });
    PjmComment.belongsTo(models.PjmTask, { foreignKey: 'taskId', as: 'task' });
  };

  return PjmComment;
};
