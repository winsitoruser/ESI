'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EprVendor = sequelize.define('EprVendor', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    vendorCode: { type: DataTypes.STRING(50), allowNull: false, unique: true, field: 'vendor_code' },
    name: { type: DataTypes.STRING(200), allowNull: false },
    legalName: { type: DataTypes.STRING(300), field: 'legal_name' },
    vendorType: { type: DataTypes.STRING(50), defaultValue: 'supplier', field: 'vendor_type' }, // supplier, contractor, consultant, distributor
    category: { type: DataTypes.STRING(100) },
    status: { type: DataTypes.STRING(30), defaultValue: 'active' }, // active, inactive, blacklisted, pending_approval
    npwp: { type: DataTypes.STRING(30) },
    nib: { type: DataTypes.STRING(30) },
    address: { type: DataTypes.TEXT },
    city: { type: DataTypes.STRING(100) },
    province: { type: DataTypes.STRING(100) },
    postalCode: { type: DataTypes.STRING(10), field: 'postal_code' },
    country: { type: DataTypes.STRING(100), defaultValue: 'Indonesia' },
    phone: { type: DataTypes.STRING(30) },
    email: { type: DataTypes.STRING(200) },
    website: { type: DataTypes.STRING(300) },
    contactPerson: { type: DataTypes.STRING(200), field: 'contact_person' },
    contactPhone: { type: DataTypes.STRING(30), field: 'contact_phone' },
    contactEmail: { type: DataTypes.STRING(200), field: 'contact_email' },
    bankName: { type: DataTypes.STRING(100), field: 'bank_name' },
    bankAccount: { type: DataTypes.STRING(50), field: 'bank_account' },
    bankAccountName: { type: DataTypes.STRING(200), field: 'bank_account_name' },
    paymentTerms: { type: DataTypes.STRING(50), defaultValue: 'net30', field: 'payment_terms' },
    rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0 },
    totalOrders: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_orders' },
    totalSpend: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'total_spend' },
    certifications: { type: DataTypes.JSONB, defaultValue: [] },
    documents: { type: DataTypes.JSONB, defaultValue: [] },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    notes: { type: DataTypes.TEXT },
    approvedBy: { type: DataTypes.INTEGER, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, field: 'approved_at' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'epr_vendors', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  EprVendor.associate = (models) => {
    EprVendor.hasMany(models.EprRfqResponse, { foreignKey: 'vendorId', as: 'rfqResponses' });
    EprVendor.hasMany(models.EprTenderBid, { foreignKey: 'vendorId', as: 'bids' });
    EprVendor.hasMany(models.EprContract, { foreignKey: 'vendorId', as: 'contracts' });
    EprVendor.hasMany(models.EprEvaluation, { foreignKey: 'vendorId', as: 'evaluations' });
  };

  return EprVendor;
};
