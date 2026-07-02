'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EximLC = sequelize.define('EximLC', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    lcNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true, field: 'lc_number' },
    lcType: { type: DataTypes.STRING(30), defaultValue: 'irrevocable', field: 'lc_type' }, // irrevocable, revocable, confirmed, standby, transferable
    status: { type: DataTypes.STRING(30), defaultValue: 'draft' }, // draft, applied, issued, amended, presented, discrepant, accepted, paid, expired, cancelled
    applicantName: { type: DataTypes.STRING(200), field: 'applicant_name' },
    beneficiaryName: { type: DataTypes.STRING(200), field: 'beneficiary_name' },
    issuingBank: { type: DataTypes.STRING(200), field: 'issuing_bank' },
    advisingBank: { type: DataTypes.STRING(200), field: 'advising_bank' },
    confirmingBank: { type: DataTypes.STRING(200), field: 'confirming_bank' },
    amount: { type: DataTypes.DECIMAL(19, 2), allowNull: false },
    currency: { type: DataTypes.STRING(10), defaultValue: 'USD' },
    tolerance: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 }, // +/- percentage
    issueDate: { type: DataTypes.DATEONLY, field: 'issue_date' },
    expiryDate: { type: DataTypes.DATEONLY, field: 'expiry_date' },
    latestShipDate: { type: DataTypes.DATEONLY, field: 'latest_ship_date' },
    presentationDays: { type: DataTypes.INTEGER, defaultValue: 21, field: 'presentation_days' },
    paymentTerms: { type: DataTypes.STRING(100), field: 'payment_terms' }, // at sight, usance, deferred
    tenorDays: { type: DataTypes.INTEGER, field: 'tenor_days' },
    partialShipment: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'partial_shipment' },
    transhipment: { type: DataTypes.BOOLEAN, defaultValue: true },
    goodsDescription: { type: DataTypes.TEXT, field: 'goods_description' },
    requiredDocuments: { type: DataTypes.JSONB, defaultValue: [], field: 'required_documents' },
    specialConditions: { type: DataTypes.TEXT, field: 'special_conditions' },
    amendments: { type: DataTypes.JSONB, defaultValue: [] },
    discrepancies: { type: DataTypes.JSONB, defaultValue: [] },
    shipmentId: { type: DataTypes.UUID, field: 'shipment_id' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'exim_lcs', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return EximLC;
};
