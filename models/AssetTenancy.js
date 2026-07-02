'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const AssetTenancy = sequelize.define('AssetTenancy', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  assetId: { type: DataTypes.UUID, allowNull: false, field: 'asset_id' },
  tenantName: { type: DataTypes.STRING(200), allowNull: false, field: 'tenant_name' },
  tenantContact: { type: DataTypes.STRING(100), allowNull: true, field: 'tenant_contact' },
  tenantEmail: { type: DataTypes.STRING(100), allowNull: true, field: 'tenant_email' },
  tenantPhone: { type: DataTypes.STRING(30), allowNull: true, field: 'tenant_phone' },
  tenantCompany: { type: DataTypes.STRING(200), allowNull: true, field: 'tenant_company' },
  leaseNumber: { type: DataTypes.STRING(50), allowNull: true, field: 'lease_number' },
  leaseStart: { type: DataTypes.DATEONLY, allowNull: true, field: 'lease_start' },
  leaseEnd: { type: DataTypes.DATEONLY, allowNull: true, field: 'lease_end' },
  monthlyRent: { type: DataTypes.DECIMAL(19,4), allowNull: true, field: 'monthly_rent' },
  depositAmount: { type: DataTypes.DECIMAL(19,4), allowNull: true, field: 'deposit_amount' },
  paymentDueDay: { type: DataTypes.INTEGER, defaultValue: 1, field: 'payment_due_day' },
  billingCycle: { type: DataTypes.STRING(20), defaultValue: 'monthly', field: 'billing_cycle' },
  status: { type: DataTypes.STRING(20), defaultValue: 'active' },
  autoRenew: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'auto_renew' },
  renewalTerms: { type: DataTypes.TEXT, allowNull: true, field: 'renewal_terms' },
  unitSizeSqm: { type: DataTypes.DECIMAL(10,2), allowNull: true, field: 'unit_size_sqm' },
  occupancyDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'occupancy_date' },
  vacateDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'vacate_date' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  contractUrl: { type: DataTypes.TEXT, allowNull: true, field: 'contract_url' },
  attachments: { type: DataTypes.JSONB, defaultValue: [] }
}, {
  tableName: 'asset_tenancies',
  timestamps: true,
  underscored: true
});

module.exports = AssetTenancy;
