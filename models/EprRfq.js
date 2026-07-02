'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EprRfq = sequelize.define('EprRfq', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    rfqNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true, field: 'rfq_number' },
    title: { type: DataTypes.STRING(300), allowNull: false },
    description: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING(30), defaultValue: 'draft' }, // draft, published, closed, awarded, cancelled
    priority: { type: DataTypes.STRING(20), defaultValue: 'normal' },
    category: { type: DataTypes.STRING(100) },
    publishDate: { type: DataTypes.DATE, field: 'publish_date' },
    closingDate: { type: DataTypes.DATE, field: 'closing_date' },
    estimatedBudget: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'estimated_budget' },
    currency: { type: DataTypes.STRING(10), defaultValue: 'IDR' },
    deliveryAddress: { type: DataTypes.TEXT, field: 'delivery_address' },
    deliveryDate: { type: DataTypes.DATEONLY, field: 'delivery_date' },
    termsConditions: { type: DataTypes.TEXT, field: 'terms_conditions' },
    invitedVendors: { type: DataTypes.JSONB, defaultValue: [], field: 'invited_vendors' },
    totalResponses: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_responses' },
    attachments: { type: DataTypes.JSONB, defaultValue: [] },
    branchId: { type: DataTypes.UUID, field: 'branch_id' },
    requestedBy: { type: DataTypes.INTEGER, field: 'requested_by' },
    requestedByName: { type: DataTypes.STRING(100), field: 'requested_by_name' },
    approvedBy: { type: DataTypes.INTEGER, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, field: 'approved_at' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'epr_rfqs', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  EprRfq.associate = (models) => {
    EprRfq.hasMany(models.EprRfqItem, { foreignKey: 'rfqId', as: 'items' });
    EprRfq.hasMany(models.EprRfqResponse, { foreignKey: 'rfqId', as: 'responses' });
  };

  return EprRfq;
};
