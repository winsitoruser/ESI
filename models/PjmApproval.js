'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PjmApproval = sequelize.define('PjmApproval', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
    entityType: { type: DataTypes.STRING(30), allowNull: false, field: 'entity_type' },
    entityId: { type: DataTypes.STRING(100), allowNull: false, field: 'entity_id' },
    approvalType: { type: DataTypes.STRING(30), allowNull: false, field: 'approval_type' },
    status: { type: DataTypes.STRING(20), defaultValue: 'pending' }, // pending, approved, rejected
    requestedBy: { type: DataTypes.INTEGER, field: 'requested_by' },
    requestedByName: { type: DataTypes.STRING(100), field: 'requested_by_name' },
    approverUserId: { type: DataTypes.INTEGER, field: 'approver_user_id' },
    approverName: { type: DataTypes.STRING(100), field: 'approver_name' },
    approvedAt: { type: DataTypes.DATE, field: 'approved_at' },
    rejectedAt: { type: DataTypes.DATE, field: 'rejected_at' },
    reason: { type: DataTypes.TEXT },
    payload: { type: DataTypes.JSONB, defaultValue: {} }
  }, { tableName: 'pjm_approvals', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  PjmApproval.associate = (models) => {
    PjmApproval.belongsTo(models.PjmProject, { foreignKey: 'projectId', as: 'project' });
  };

  return PjmApproval;
};
