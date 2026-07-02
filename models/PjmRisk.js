'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PjmRisk = sequelize.define('PjmRisk', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
    riskCode: { type: DataTypes.STRING(30), field: 'risk_code' },
    title: { type: DataTypes.STRING(300), allowNull: false },
    description: { type: DataTypes.TEXT },
    category: { type: DataTypes.STRING(50) }, // technical, financial, schedule, resource, external
    probability: { type: DataTypes.STRING(20), defaultValue: 'medium' }, // low, medium, high, very_high
    impact: { type: DataTypes.STRING(20), defaultValue: 'medium' },
    riskScore: { type: DataTypes.INTEGER, defaultValue: 0, field: 'risk_score' },
    status: { type: DataTypes.STRING(30), defaultValue: 'identified' }, // identified, analyzing, mitigating, resolved, accepted
    mitigationPlan: { type: DataTypes.TEXT, field: 'mitigation_plan' },
    contingencyPlan: { type: DataTypes.TEXT, field: 'contingency_plan' },
    ownerId: { type: DataTypes.INTEGER, field: 'owner_id' },
    ownerName: { type: DataTypes.STRING(100), field: 'owner_name' },
    identifiedDate: { type: DataTypes.DATEONLY, field: 'identified_date' },
    resolvedDate: { type: DataTypes.DATEONLY, field: 'resolved_date' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'pjm_risks', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  PjmRisk.associate = (models) => {
    PjmRisk.belongsTo(models.PjmProject, { foreignKey: 'projectId', as: 'project' });
  };

  return PjmRisk;
};
