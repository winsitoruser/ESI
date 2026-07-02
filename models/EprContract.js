'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EprContract = sequelize.define('EprContract', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    contractNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true, field: 'contract_number' },
    title: { type: DataTypes.STRING(300), allowNull: false },
    vendorId: { type: DataTypes.UUID, allowNull: false, field: 'vendor_id' },
    vendorName: { type: DataTypes.STRING(200), field: 'vendor_name' },
    contractType: { type: DataTypes.STRING(50), defaultValue: 'purchase', field: 'contract_type' }, // purchase, service, framework, blanket
    status: { type: DataTypes.STRING(30), defaultValue: 'draft' }, // draft, active, expired, terminated, renewed
    startDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'start_date' },
    endDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'end_date' },
    totalValue: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'total_value' },
    usedValue: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'used_value' },
    currency: { type: DataTypes.STRING(10), defaultValue: 'IDR' },
    paymentTerms: { type: DataTypes.STRING(100), field: 'payment_terms' },
    deliveryTerms: { type: DataTypes.TEXT, field: 'delivery_terms' },
    termsConditions: { type: DataTypes.TEXT, field: 'terms_conditions' },
    autoRenew: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'auto_renew' },
    renewalNoticeDays: { type: DataTypes.INTEGER, defaultValue: 30, field: 'renewal_notice_days' },
    penaltyClause: { type: DataTypes.TEXT, field: 'penalty_clause' },
    documents: { type: DataTypes.JSONB, defaultValue: [] },
    signedBy: { type: DataTypes.STRING(200), field: 'signed_by' },
    signedAt: { type: DataTypes.DATE, field: 'signed_at' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'epr_contracts', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  EprContract.associate = (models) => {
    EprContract.belongsTo(models.EprVendor, { foreignKey: 'vendorId', as: 'vendor' });
  };

  return EprContract;
};
