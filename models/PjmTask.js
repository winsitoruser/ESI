'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PjmTask = sequelize.define('PjmTask', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
    parentTaskId: { type: DataTypes.UUID, field: 'parent_task_id' },
    milestoneId: { type: DataTypes.UUID, field: 'milestone_id' },
    taskCode: { type: DataTypes.STRING(50), field: 'task_code' },
    name: { type: DataTypes.STRING(300), allowNull: false },
    description: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING(30), defaultValue: 'todo' }, // todo, in_progress, review, done, blocked, cancelled
    priority: { type: DataTypes.STRING(20), defaultValue: 'normal' },
    taskType: { type: DataTypes.STRING(50), defaultValue: 'task', field: 'task_type' }, // task, bug, feature, improvement
    assigneeId: { type: DataTypes.INTEGER, field: 'assignee_id' },
    assigneeName: { type: DataTypes.STRING(100), field: 'assignee_name' },
    reporterId: { type: DataTypes.INTEGER, field: 'reporter_id' },
    startDate: { type: DataTypes.DATEONLY, field: 'start_date' },
    dueDate: { type: DataTypes.DATEONLY, field: 'due_date' },
    completedDate: { type: DataTypes.DATEONLY, field: 'completed_date' },
    estimatedHours: { type: DataTypes.DECIMAL(8, 2), defaultValue: 0, field: 'estimated_hours' },
    actualHours: { type: DataTypes.DECIMAL(8, 2), defaultValue: 0, field: 'actual_hours' },
    progressPercent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'progress_percent' },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' },
    dependencies: { type: DataTypes.JSONB, defaultValue: [] },
    labels: { type: DataTypes.JSONB, defaultValue: [] },
    attachments: { type: DataTypes.JSONB, defaultValue: [] },
    comments: { type: DataTypes.JSONB, defaultValue: [] },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'pjm_tasks', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  PjmTask.associate = (models) => {
    PjmTask.belongsTo(models.PjmProject, { foreignKey: 'projectId', as: 'project' });
    PjmTask.belongsTo(models.PjmMilestone, { foreignKey: 'milestoneId', as: 'milestone' });
    PjmTask.hasMany(models.PjmTimesheet, { foreignKey: 'taskId', as: 'timesheets' });
  };

  return PjmTask;
};
