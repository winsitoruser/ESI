const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaApprovalWorkflow = sequelize.define('SfaApprovalWorkflow', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    code: { type: DataTypes.STRING(30), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    entityType: { type: DataTypes.STRING(30), allowNull: false, field: 'entity_type' },
    conditionRules: { type: DataTypes.JSONB, defaultValue: {}, field: 'condition_rules' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    totalSteps: { type: DataTypes.INTEGER, defaultValue: 1, field: 'total_steps' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, { tableName: 'sfa_approval_workflows', timestamps: true, underscored: true });

  SfaApprovalWorkflow.associate = (models) => {
    SfaApprovalWorkflow.hasMany(models.SfaApprovalStep, { foreignKey: 'workflow_id', as: 'steps' });
    SfaApprovalWorkflow.hasMany(models.SfaApprovalRequest, { foreignKey: 'workflow_id', as: 'requests' });
  };
  return SfaApprovalWorkflow;
};
