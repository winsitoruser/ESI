const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaQuotation = sequelize.define('SfaQuotation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    quotationNumber: { type: DataTypes.STRING(30), unique: true, field: 'quotation_number' },
    opportunityId: { type: DataTypes.UUID, field: 'opportunity_id' },
    leadId: { type: DataTypes.UUID, field: 'lead_id' },
    customerName: { type: DataTypes.STRING(200), allowNull: false, field: 'customer_name' },
    customerEmail: { type: DataTypes.STRING(200), field: 'customer_email' },
    customerPhone: { type: DataTypes.STRING(30), field: 'customer_phone' },
    customerAddress: { type: DataTypes.TEXT, field: 'customer_address' },
    salespersonId: { type: DataTypes.INTEGER, field: 'salesperson_id' },
    status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
    validUntil: { type: DataTypes.DATEONLY, field: 'valid_until' },
    subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    discountType: { type: DataTypes.STRING(20), defaultValue: 'amount', field: 'discount_type' },
    discountValue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'discount_value' },
    discountAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'discount_amount' },
    taxAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'tax_amount' },
    total: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    notes: { type: DataTypes.TEXT },
    termsConditions: { type: DataTypes.TEXT, field: 'terms_conditions' },
    rejectedReason: { type: DataTypes.TEXT, field: 'rejected_reason' },
    approvedBy: { type: DataTypes.INTEGER, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, field: 'approved_at' },
    sentAt: { type: DataTypes.DATE, field: 'sent_at' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, {
    tableName: 'sfa_quotations',
    timestamps: true,
    underscored: true
  });

  SfaQuotation.associate = (models) => {
    SfaQuotation.belongsTo(models.SfaOpportunity, { foreignKey: 'opportunity_id', as: 'opportunity' });
    SfaQuotation.belongsTo(models.SfaLead, { foreignKey: 'lead_id', as: 'lead' });
    SfaQuotation.hasMany(models.SfaQuotationItem, { foreignKey: 'quotation_id', as: 'items' });
  };

  return SfaQuotation;
};
