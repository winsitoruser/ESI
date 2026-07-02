'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const AssetWorkOrder = sequelize.define('AssetWorkOrder', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  assetId: { type: DataTypes.UUID, allowNull: false, field: 'asset_id' },
  scheduleId: { type: DataTypes.UUID, allowNull: true, field: 'schedule_id' },
  woNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'wo_number' },
  woType: { type: DataTypes.STRING(30), defaultValue: 'preventive', field: 'wo_type' },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING(20), defaultValue: 'open' },
  priority: { type: DataTypes.STRING(10), defaultValue: 'medium' },
  plannedStart: { type: DataTypes.DATEONLY, allowNull: true, field: 'planned_start' },
  plannedEnd: { type: DataTypes.DATEONLY, allowNull: true, field: 'planned_end' },
  actualStart: { type: DataTypes.DATE, allowNull: true, field: 'actual_start' },
  actualEnd: { type: DataTypes.DATE, allowNull: true, field: 'actual_end' },
  assignedTo: { type: DataTypes.INTEGER, allowNull: true, field: 'assigned_to' },
  assignedToName: { type: DataTypes.STRING(100), allowNull: true, field: 'assigned_to_name' },
  completedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'completed_by' },
  completedByName: { type: DataTypes.STRING(100), allowNull: true, field: 'completed_by_name' },
  laborCost: { type: DataTypes.DECIMAL(19,4), defaultValue: 0, field: 'labor_cost' },
  partsCost: { type: DataTypes.DECIMAL(19,4), defaultValue: 0, field: 'parts_cost' },
  totalCost: { type: DataTypes.DECIMAL(19,4), defaultValue: 0, field: 'total_cost' },
  rootCause: { type: DataTypes.TEXT, allowNull: true, field: 'root_cause' },
  resolution: { type: DataTypes.TEXT, allowNull: true },
  downtimeMinutes: { type: DataTypes.INTEGER, defaultValue: 0, field: 'downtime_minutes' },
  hourMeterReading: { type: DataTypes.DECIMAL(12,2), allowNull: true, field: 'hour_meter_reading' },
  checklistResults: { type: DataTypes.JSONB, defaultValue: [], field: 'checklist_results' },
  partsUsed: { type: DataTypes.JSONB, defaultValue: [], field: 'parts_used' },
  attachments: { type: DataTypes.JSONB, defaultValue: [] },
  notes: { type: DataTypes.TEXT, allowNull: true },
  createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' }
}, {
  tableName: 'asset_work_orders',
  timestamps: true,
  underscored: true
});

module.exports = AssetWorkOrder;
