'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const AssetLicense = sequelize.define('AssetLicense', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  assetId: { type: DataTypes.UUID, allowNull: true, field: 'asset_id' },
  licenseName: { type: DataTypes.STRING(200), allowNull: false, field: 'license_name' },
  vendor: { type: DataTypes.STRING(200), allowNull: true },
  licenseKey: { type: DataTypes.STRING(500), allowNull: true, field: 'license_key' },
  licenseType: { type: DataTypes.STRING(30), defaultValue: 'perpetual', field: 'license_type' },
  purchaseDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'purchase_date' },
  activationDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'activation_date' },
  expiryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'expiry_date' },
  renewalDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'renewal_date' },
  totalSeats: { type: DataTypes.INTEGER, defaultValue: 1, field: 'total_seats' },
  usedSeats: { type: DataTypes.INTEGER, defaultValue: 0, field: 'used_seats' },
  purchaseCost: { type: DataTypes.DECIMAL(19,4), allowNull: true, field: 'purchase_cost' },
  renewalCost: { type: DataTypes.DECIMAL(19,4), allowNull: true, field: 'renewal_cost' },
  billingCycle: { type: DataTypes.STRING(20), allowNull: true, field: 'billing_cycle' },
  status: { type: DataTypes.STRING(20), defaultValue: 'active' },
  autoRenew: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'auto_renew' },
  alertDaysBefore: { type: DataTypes.INTEGER, defaultValue: 30, field: 'alert_days_before' },
  version: { type: DataTypes.STRING(50), allowNull: true },
  edition: { type: DataTypes.STRING(50), allowNull: true },
  assignedUsers: { type: DataTypes.JSONB, defaultValue: [], field: 'assigned_users' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  contractUrl: { type: DataTypes.TEXT, allowNull: true, field: 'contract_url' }
}, {
  tableName: 'asset_licenses',
  timestamps: true,
  underscored: true
});

module.exports = AssetLicense;
