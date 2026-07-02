const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaApprovalStep = sequelize.define('SfaApprovalStep', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workflowId: { type: DataTypes.UUID, allowNull: false, field: 'workflow_id' },
    stepNumber: { type: DataTypes.INTEGER, defaultValue: 1, field: 'step_number' },
    stepName: { type: DataTypes.STRING(100), field: 'step_name' },
    approverType: { type: DataTypes.STRING(20), defaultValue: 'role', field: 'approver_type' },
    approverRole: { type: DataTypes.STRING(50), field: 'approver_role' },
    approverUserId: { type: DataTypes.INTEGER, field: 'approver_user_id' },
    autoApproveAfterHours: { type: DataTypes.INTEGER, defaultValue: 0, field: 'auto_approve_after_hours' },
    canReject: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'can_reject' },
    canDelegate: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'can_delegate' },
    notifyOnPending: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'notify_on_pending' },
    notifyChannels: { type: DataTypes.JSONB, defaultValue: ['email', 'app'], field: 'notify_channels' },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' }
  }, { tableName: 'sfa_approval_steps', timestamps: true, createdAt: 'created_at', updatedAt: false, underscored: true });

  SfaApprovalStep.associate = (models) => {
    SfaApprovalStep.belongsTo(models.SfaApprovalWorkflow, { foreignKey: 'workflow_id', as: 'workflow' });
  };
  return SfaApprovalStep;
};
