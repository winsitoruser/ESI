'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PjmMilestone = sequelize.define('PjmMilestone', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING(30), defaultValue: 'pending' }, // pending, in_progress, completed, overdue
    dueDate: { type: DataTypes.DATEONLY, field: 'due_date' },
    completedDate: { type: DataTypes.DATEONLY, field: 'completed_date' },
    deliverables: { type: DataTypes.JSONB, defaultValue: [] },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'pjm_milestones', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  PjmMilestone.associate = (models) => {
    PjmMilestone.belongsTo(models.PjmProject, { foreignKey: 'projectId', as: 'project' });
    PjmMilestone.hasMany(models.PjmTask, { foreignKey: 'milestoneId', as: 'tasks' });
  };

  return PjmMilestone;
};
