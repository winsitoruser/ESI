const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const FleetGpsLocation = sequelize.define('FleetGpsLocation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  vehicleId: { type: DataTypes.STRING(50), allowNull: false, field: 'vehicle_id' },
  driverId: { type: DataTypes.STRING(50), allowNull: true, field: 'driver_id' },
  latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: false },
  longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: false },
  speedKmh: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0, field: 'speed_kmh' },
  heading: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  accuracyMeters: { type: DataTypes.DECIMAL(6, 2), allowNull: true, field: 'accuracy_meters' },
  timestamp: { type: DataTypes.DATE, allowNull: false },
  isMoving: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_moving' },
  isIdle: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_idle' },
  idleDurationMinutes: { type: DataTypes.INTEGER, defaultValue: 0, field: 'idle_duration_minutes' }
}, {
  tableName: 'fleet_gps_locations',
  timestamps: false,
  underscored: true
});

module.exports = FleetGpsLocation;
