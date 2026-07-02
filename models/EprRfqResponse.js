'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EprRfqResponse = sequelize.define('EprRfqResponse', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    rfqId: { type: DataTypes.UUID, allowNull: false, field: 'rfq_id' },
    vendorId: { type: DataTypes.UUID, allowNull: false, field: 'vendor_id' },
    vendorName: { type: DataTypes.STRING(200), field: 'vendor_name' },
    status: { type: DataTypes.STRING(30), defaultValue: 'submitted' }, // submitted, under_review, shortlisted, awarded, rejected
    totalPrice: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'total_price' },
    deliveryDays: { type: DataTypes.INTEGER, field: 'delivery_days' },
    paymentTerms: { type: DataTypes.STRING(100), field: 'payment_terms' },
    warranty: { type: DataTypes.STRING(100) },
    technicalScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'technical_score' },
    priceScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'price_score' },
    totalScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'total_score' },
    itemPrices: { type: DataTypes.JSONB, defaultValue: [], field: 'item_prices' },
    remarks: { type: DataTypes.TEXT },
    attachments: { type: DataTypes.JSONB, defaultValue: [] },
    submittedAt: { type: DataTypes.DATE, field: 'submitted_at' },
    evaluatedBy: { type: DataTypes.INTEGER, field: 'evaluated_by' },
    evaluatedAt: { type: DataTypes.DATE, field: 'evaluated_at' }
  }, { tableName: 'epr_rfq_responses', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  EprRfqResponse.associate = (models) => {
    EprRfqResponse.belongsTo(models.EprRfq, { foreignKey: 'rfqId', as: 'rfq' });
    EprRfqResponse.belongsTo(models.EprVendor, { foreignKey: 'vendorId', as: 'vendor' });
  };

  return EprRfqResponse;
};
