'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EprTender = sequelize.define('EprTender', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    tenderNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true, field: 'tender_number' },
    title: { type: DataTypes.STRING(300), allowNull: false },
    description: { type: DataTypes.TEXT },
    tenderType: { type: DataTypes.STRING(50), defaultValue: 'open', field: 'tender_type' }, // open, selective, direct
    status: { type: DataTypes.STRING(30), defaultValue: 'draft' }, // draft, announcement, registration, submission, evaluation, negotiation, awarded, completed, cancelled
    category: { type: DataTypes.STRING(100) },
    estimatedValue: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'estimated_value' },
    currency: { type: DataTypes.STRING(10), defaultValue: 'IDR' },
    announcementDate: { type: DataTypes.DATE, field: 'announcement_date' },
    registrationDeadline: { type: DataTypes.DATE, field: 'registration_deadline' },
    submissionDeadline: { type: DataTypes.DATE, field: 'submission_deadline' },
    openingDate: { type: DataTypes.DATE, field: 'opening_date' },
    awardDate: { type: DataTypes.DATE, field: 'award_date' },
    requirements: { type: DataTypes.JSONB, defaultValue: [] },
    evaluationCriteria: { type: DataTypes.JSONB, defaultValue: [], field: 'evaluation_criteria' },
    documents: { type: DataTypes.JSONB, defaultValue: [] },
    committeeMembers: { type: DataTypes.JSONB, defaultValue: [], field: 'committee_members' },
    winnerId: { type: DataTypes.UUID, field: 'winner_id' },
    winnerName: { type: DataTypes.STRING(200), field: 'winner_name' },
    totalBids: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_bids' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    approvedBy: { type: DataTypes.INTEGER, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, field: 'approved_at' }
  }, { tableName: 'epr_tenders', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  EprTender.associate = (models) => {
    EprTender.hasMany(models.EprTenderBid, { foreignKey: 'tenderId', as: 'bids' });
  };

  return EprTender;
};
