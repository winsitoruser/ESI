'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PjmDependency = sequelize.define('PjmDependency', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
    predecessorTaskId: { type: DataTypes.UUID, allowNull: false, field: 'predecessor_task_id' },
    successorTaskId: { type: DataTypes.UUID, allowNull: false, field: 'successor_task_id' },
    dependencyType: { type: DataTypes.STRING(10), defaultValue: 'FS', field: 'dependency_type' }, // FS, SS, FF, SF
    lagDays: { type: DataTypes.INTEGER, defaultValue: 0, field: 'lag_days' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'pjm_dependencies', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: false });

  PjmDependency.associate = (models) => {
    PjmDependency.belongsTo(models.PjmProject, { foreignKey: 'projectId', as: 'project' });
    PjmDependency.belongsTo(models.PjmTask, { foreignKey: 'predecessorTaskId', as: 'predecessorTask' });
    PjmDependency.belongsTo(models.PjmTask, { foreignKey: 'successorTaskId', as: 'successorTask' });
  };

  return PjmDependency;
};
