'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PjmBudget = sequelize.define('PjmBudget', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
    category: { type: DataTypes.STRING(100), allowNull: false }, // labor, material, equipment, travel, overhead, contingency
    description: { type: DataTypes.STRING(300) },
    plannedAmount: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'planned_amount' },
    actualAmount: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'actual_amount' },
    committedAmount: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'committed_amount' },
    variance: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0 },
    period: { type: DataTypes.STRING(20) }, // monthly, quarterly
    periodDate: { type: DataTypes.DATEONLY, field: 'period_date' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'pjm_budgets', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  PjmBudget.associate = (models) => {
    PjmBudget.belongsTo(models.PjmProject, { foreignKey: 'projectId', as: 'project' });
  };

  return PjmBudget;
};
