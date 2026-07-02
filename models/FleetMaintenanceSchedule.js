const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const FleetMaintenanceSchedule = sequelize.define('FleetMaintenanceSchedule', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenantId: { type: DataTypes.STRING(50), allowNull: false, field: 'tenant_id' },
  vehicleId: { type: DataTypes.STRING(50), allowNull: false, field: 'vehicle_id' },
  maintenanceType: { type: DataTypes.STRING(50), allowNull: true, field: 'maintenance_type' },
  intervalType: { type: DataTypes.STRING(30), allowNull: true, field: 'interval_type' },
  intervalKilometers: { type: DataTypes.INTEGER, allowNull: true, field: 'interval_kilometers' },
  intervalMonths: { type: DataTypes.INTEGER, allowNull: true, field: 'interval_months' },
  nextServiceDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'next_service_date' },
  nextServiceOdometer: { type: DataTypes.INTEGER, allowNull: true, field: 'next_service_odometer' },
  lastServiceDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'last_service_date' },
  lastServiceOdometer: { type: DataTypes.INTEGER, allowNull: true, field: 'last_service_odometer' },
  estimatedCost: { type: DataTypes.DECIMAL(15, 2), allowNull: true, field: 'estimated_cost' },
  actualCost: { type: DataTypes.DECIMAL(15, 2), allowNull: true, field: 'actual_cost' },
  status: { type: DataTypes.STRING(20), defaultValue: 'active' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'fleet_maintenance_schedules',
  timestamps: true,
  underscored: true
});

module.exports = FleetMaintenanceSchedule;
