'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const AssetMovement = sequelize.define('AssetMovement', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  assetId: { type: DataTypes.UUID, allowNull: false, field: 'asset_id' },
  movementType: { type: DataTypes.STRING(30), allowNull: false, field: 'movement_type' },
  movementDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'movement_date' },
  referenceNumber: { type: DataTypes.STRING(50), allowNull: true, field: 'reference_number' },
  fromBranchId: { type: DataTypes.UUID, allowNull: true, field: 'from_branch_id' },
  fromDepartment: { type: DataTypes.STRING(100), allowNull: true, field: 'from_department' },
  fromLocation: { type: DataTypes.STRING(200), allowNull: true, field: 'from_location' },
  fromCustodianId: { type: DataTypes.INTEGER, allowNull: true, field: 'from_custodian_id' },
  fromCustodianName: { type: DataTypes.STRING(100), allowNull: true, field: 'from_custodian_name' },
  toBranchId: { type: DataTypes.UUID, allowNull: true, field: 'to_branch_id' },
  toDepartment: { type: DataTypes.STRING(100), allowNull: true, field: 'to_department' },
  toLocation: { type: DataTypes.STRING(200), allowNull: true, field: 'to_location' },
  toCustodianId: { type: DataTypes.INTEGER, allowNull: true, field: 'to_custodian_id' },
  toCustodianName: { type: DataTypes.STRING(100), allowNull: true, field: 'to_custodian_name' },
  status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
  requestedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'requested_by' },
  requestedByName: { type: DataTypes.STRING(100), allowNull: true, field: 'requested_by_name' },
  approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
  approvedByName: { type: DataTypes.STRING(100), allowNull: true, field: 'approved_by_name' },
  approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
  receivedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'received_by' },
  receivedByName: { type: DataTypes.STRING(100), allowNull: true, field: 'received_by_name' },
  receivedAt: { type: DataTypes.DATE, allowNull: true, field: 'received_at' },
  reason: { type: DataTypes.TEXT, allowNull: true },
  conditionOnTransfer: { type: DataTypes.STRING(30), allowNull: true, field: 'condition_on_transfer' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  attachments: { type: DataTypes.JSONB, defaultValue: [] }
}, {
  tableName: 'asset_movements',
  timestamps: true,
  underscored: true
});

module.exports = AssetMovement;
