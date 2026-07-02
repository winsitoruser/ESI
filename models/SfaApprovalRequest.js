const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaApprovalRequest = sequelize.define('SfaApprovalRequest', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    workflowId: { type: DataTypes.UUID, field: 'workflow_id' },
    entityType: { type: DataTypes.STRING(30), allowNull: false, field: 'entity_type' },
    entityId: { type: DataTypes.UUID, allowNull: false, field: 'entity_id' },
    entityNumber: { type: DataTypes.STRING(50), field: 'entity_number' },
    entitySummary: { type: DataTypes.TEXT, field: 'entity_summary' },
    requestedBy: { type: DataTypes.INTEGER, field: 'requested_by' },
    requestedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'requested_at' },
    currentStep: { type: DataTypes.INTEGER, defaultValue: 1, field: 'current_step' },
    totalSteps: { type: DataTypes.INTEGER, defaultValue: 1, field: 'total_steps' },
    status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
    approvalHistory: { type: DataTypes.JSONB, defaultValue: [], field: 'approval_history' },
    currentApproverId: { type: DataTypes.INTEGER, field: 'current_approver_id' },
    currentApproverRole: { type: DataTypes.STRING(50), field: 'current_approver_role' },
    finalStatus: { type: DataTypes.STRING(20), field: 'final_status' },
    completedAt: { type: DataTypes.DATE, field: 'completed_at' },
    rejectedBy: { type: DataTypes.INTEGER, field: 'rejected_by' },
    rejectedReason: { type: DataTypes.TEXT, field: 'rejected_reason' },
    amount: { type: DataTypes.DECIMAL(15, 2) },
    priority: { type: DataTypes.STRING(10), defaultValue: 'normal' },
    dueDate: { type: DataTypes.DATEONLY, field: 'due_date' },
    metadata: { type: DataTypes.JSONB, defaultValue: {} }
  }, { tableName: 'sfa_approval_requests', timestamps: true, underscored: true });

  SfaApprovalRequest.associate = (models) => {
    SfaApprovalRequest.belongsTo(models.SfaApprovalWorkflow, { foreignKey: 'workflow_id', as: 'workflow' });
  };
  return SfaApprovalRequest;
};
