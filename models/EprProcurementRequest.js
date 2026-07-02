'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EprProcurementRequest = sequelize.define('EprProcurementRequest', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    requestNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true, field: 'request_number' },
    title: { type: DataTypes.STRING(300), allowNull: false },
    description: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING(30), defaultValue: 'draft' }, // draft, submitted, approved, rejected, in_process, fulfilled, cancelled
    priority: { type: DataTypes.STRING(20), defaultValue: 'normal' },
    department: { type: DataTypes.STRING(100) },
    branchId: { type: DataTypes.UUID, field: 'branch_id' },
    requestedBy: { type: DataTypes.INTEGER, field: 'requested_by' },
    requestedByName: { type: DataTypes.STRING(100), field: 'requested_by_name' },
    neededDate: { type: DataTypes.DATEONLY, field: 'needed_date' },
    estimatedBudget: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'estimated_budget' },
    currency: { type: DataTypes.STRING(10), defaultValue: 'IDR' },
    items: { type: DataTypes.JSONB, defaultValue: [] },
    justification: { type: DataTypes.TEXT },
    attachments: { type: DataTypes.JSONB, defaultValue: [] },
    approvalFlow: { type: DataTypes.JSONB, defaultValue: [], field: 'approval_flow' },
    approvedBy: { type: DataTypes.INTEGER, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, field: 'approved_at' },
    rfqId: { type: DataTypes.UUID, field: 'rfq_id' },
    poId: { type: DataTypes.UUID, field: 'po_id' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'epr_procurement_requests', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return EprProcurementRequest;
};
