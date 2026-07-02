'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PjmProject = sequelize.define('PjmProject', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    projectCode: { type: DataTypes.STRING(50), allowNull: false, unique: true, field: 'project_code' },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING(30), defaultValue: 'planning' }, // planning, active, on_hold, completed, cancelled
    priority: { type: DataTypes.STRING(20), defaultValue: 'normal' }, // low, normal, high, urgent, critical
    category: { type: DataTypes.STRING(100) }, // construction, IT, marketing, etc.
    projectType: { type: DataTypes.STRING(50), defaultValue: 'internal', field: 'project_type' }, // internal, external, client
    clientName: { type: DataTypes.STRING(200), field: 'client_name' },
    clientContact: { type: DataTypes.STRING(200), field: 'client_contact' },
    managerId: { type: DataTypes.INTEGER, field: 'manager_id' },
    managerName: { type: DataTypes.STRING(100), field: 'manager_name' },
    branchId: { type: DataTypes.UUID, field: 'branch_id' },
    startDate: { type: DataTypes.DATEONLY, field: 'start_date' },
    endDate: { type: DataTypes.DATEONLY, field: 'end_date' },
    actualStartDate: { type: DataTypes.DATEONLY, field: 'actual_start_date' },
    actualEndDate: { type: DataTypes.DATEONLY, field: 'actual_end_date' },
    budgetAmount: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'budget_amount' },
    actualCost: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'actual_cost' },
    currency: { type: DataTypes.STRING(10), defaultValue: 'IDR' },
    progressPercent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'progress_percent' },
    totalTasks: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_tasks' },
    completedTasks: { type: DataTypes.INTEGER, defaultValue: 0, field: 'completed_tasks' },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    attachments: { type: DataTypes.JSONB, defaultValue: [] },
    customFields: { type: DataTypes.JSONB, defaultValue: {}, field: 'custom_fields' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, { tableName: 'pjm_projects', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  PjmProject.associate = (models) => {
    PjmProject.hasMany(models.PjmTask, { foreignKey: 'projectId', as: 'tasks' });
    PjmProject.hasMany(models.PjmMilestone, { foreignKey: 'projectId', as: 'milestones' });
    PjmProject.hasMany(models.PjmResource, { foreignKey: 'projectId', as: 'resources' });
    PjmProject.hasMany(models.PjmRisk, { foreignKey: 'projectId', as: 'risks' });
    PjmProject.hasMany(models.PjmBudget, { foreignKey: 'projectId', as: 'budgetItems' });
    PjmProject.hasMany(models.PjmDocument, { foreignKey: 'projectId', as: 'documents' });
  };

  return PjmProject;
};
