'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const AssetMaintenanceSchedule = sequelize.define('AssetMaintenanceSchedule', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  assetId: { type: DataTypes.UUID, allowNull: false, field: 'asset_id' },
  scheduleType: { type: DataTypes.STRING(20), defaultValue: 'calendar', field: 'schedule_type' },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  frequency: { type: DataTypes.STRING(20), allowNull: true },
  intervalValue: { type: DataTypes.INTEGER, allowNull: true, field: 'interval_value' },
  nextDueDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'next_due_date' },
  lastPerformedDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'last_performed_date' },
  hourMeterInterval: { type: DataTypes.INTEGER, allowNull: true, field: 'hour_meter_interval' },
  lastHourMeter: { type: DataTypes.DECIMAL(12,2), allowNull: true, field: 'last_hour_meter' },
  currentHourMeter: { type: DataTypes.DECIMAL(12,2), allowNull: true, field: 'current_hour_meter' },
  nextDueHourMeter: { type: DataTypes.DECIMAL(12,2), allowNull: true, field: 'next_due_hour_meter' },
  estimatedDurationHours: { type: DataTypes.DECIMAL(6,2), allowNull: true, field: 'estimated_duration_hours' },
  estimatedCost: { type: DataTypes.DECIMAL(19,4), allowNull: true, field: 'estimated_cost' },
  assignedTo: { type: DataTypes.INTEGER, allowNull: true, field: 'assigned_to' },
  assignedToName: { type: DataTypes.STRING(100), allowNull: true, field: 'assigned_to_name' },
  priority: { type: DataTypes.STRING(10), defaultValue: 'medium' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  checklist: { type: DataTypes.JSONB, defaultValue: [] }
}, {
  tableName: 'asset_maintenance_schedules',
  timestamps: true,
  underscored: true
});

module.exports = AssetMaintenanceSchedule;
