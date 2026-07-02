'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PjmSprint = sequelize.define('PjmSprint', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
    name: { type: DataTypes.STRING(100), allowNull: false },
    goal: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING(20), defaultValue: 'planned' }, // planned, active, completed, cancelled
    startDate: { type: DataTypes.DATEONLY, field: 'start_date' },
    endDate: { type: DataTypes.DATEONLY, field: 'end_date' },
    plannedPoints: { type: DataTypes.INTEGER, defaultValue: 0, field: 'planned_points' },
    completedPoints: { type: DataTypes.INTEGER, defaultValue: 0, field: 'completed_points' },
    velocity: { type: DataTypes.DECIMAL(8, 2), defaultValue: 0 },
    retrospectiveNotes: { type: DataTypes.TEXT, field: 'retrospective_notes' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'pjm_sprints', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  PjmSprint.associate = (models) => {
    PjmSprint.belongsTo(models.PjmProject, { foreignKey: 'projectId', as: 'project' });
    PjmSprint.hasMany(models.PjmTask, { foreignKey: 'sprintId', as: 'tasks' });
  };

  return PjmSprint;
};
