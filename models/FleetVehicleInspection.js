const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const FleetVehicleInspection = sequelize.define('FleetVehicleInspection', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  assignmentId: { type: DataTypes.UUID, allowNull: true, field: 'assignment_id' },
  driverId: { type: DataTypes.UUID, allowNull: true, field: 'driver_id' },
  vehicleId: { type: DataTypes.UUID, allowNull: true, field: 'vehicle_id' },
  inspectionType: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'pre_trip', field: 'inspection_type' },
  odometerReading: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: 'odometer_reading' },
  fuelLevelPercent: { type: DataTypes.INTEGER, allowNull: true, field: 'fuel_level_percent' },
  checklist: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  issuesFound: { type: DataTypes.JSONB, allowNull: true, field: 'issues_found' },
  overallStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pass', field: 'overall_status' },
  photos: { type: DataTypes.JSONB, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
}, {
  tableName: 'fleet_vehicle_inspections',
  timestamps: true,
  underscored: true,
});

FleetVehicleInspection.associate = function (models) {
  if (models.FleetDriver) FleetVehicleInspection.belongsTo(models.FleetDriver, { foreignKey: 'driverId', as: 'driver' });
  if (models.FleetVehicle) FleetVehicleInspection.belongsTo(models.FleetVehicle, { foreignKey: 'vehicleId', as: 'vehicle' });
  if (models.FleetRouteAssignment) FleetVehicleInspection.belongsTo(models.FleetRouteAssignment, { foreignKey: 'assignmentId', as: 'assignment' });
};

module.exports = FleetVehicleInspection;
