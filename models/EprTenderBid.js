'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EprTenderBid = sequelize.define('EprTenderBid', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenderId: { type: DataTypes.UUID, allowNull: false, field: 'tender_id' },
    vendorId: { type: DataTypes.UUID, allowNull: false, field: 'vendor_id' },
    vendorName: { type: DataTypes.STRING(200), field: 'vendor_name' },
    bidNumber: { type: DataTypes.STRING(50), field: 'bid_number' },
    status: { type: DataTypes.STRING(30), defaultValue: 'submitted' }, // submitted, qualified, disqualified, shortlisted, winner, runner_up
    bidAmount: { type: DataTypes.DECIMAL(19, 2), allowNull: false, field: 'bid_amount' },
    technicalProposal: { type: DataTypes.TEXT, field: 'technical_proposal' },
    technicalScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'technical_score' },
    priceScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'price_score' },
    totalScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'total_score' },
    deliverySchedule: { type: DataTypes.TEXT, field: 'delivery_schedule' },
    documents: { type: DataTypes.JSONB, defaultValue: [] },
    evaluationNotes: { type: DataTypes.TEXT, field: 'evaluation_notes' },
    submittedAt: { type: DataTypes.DATE, field: 'submitted_at' },
    evaluatedBy: { type: DataTypes.INTEGER, field: 'evaluated_by' },
    evaluatedAt: { type: DataTypes.DATE, field: 'evaluated_at' }
  }, { tableName: 'epr_tender_bids', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  EprTenderBid.associate = (models) => {
    EprTenderBid.belongsTo(models.EprTender, { foreignKey: 'tenderId', as: 'tender' });
    EprTenderBid.belongsTo(models.EprVendor, { foreignKey: 'vendorId', as: 'vendor' });
  };

  return EprTenderBid;
};
