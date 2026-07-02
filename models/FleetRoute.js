const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const FleetRoute = sequelize.define('FleetRoute', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenantId: { type: DataTypes.STRING(50), allowNull: false, field: 'tenant_id' },
  routeNumber: { type: DataTypes.STRING(50), allowNull: true, field: 'route_number' },
  routeName: { type: DataTypes.STRING(200), allowNull: false, field: 'route_name' },
  routeType: { type: DataTypes.STRING(50), allowNull: true, field: 'route_type' },
  startLocation: { type: DataTypes.STRING(200), allowNull: true, field: 'start_location' },
  endLocation: { type: DataTypes.STRING(200), allowNull: true, field: 'end_location' },
  totalDistanceKm: { type: DataTypes.DECIMAL(10, 2), allowNull: true, field: 'total_distance_km' },
  estimatedDurationMinutes: { type: DataTypes.INTEGER, allowNull: true, field: 'estimated_duration_minutes' },
  waypoints: { type: DataTypes.JSONB, allowNull: true },
  status: { type: DataTypes.STRING(20), defaultValue: 'active' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'fleet_routes',
  timestamps: true,
  underscored: true
});

module.exports = FleetRoute;
