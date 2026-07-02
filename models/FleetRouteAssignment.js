const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const FleetRouteAssignment = sequelize.define('FleetRouteAssignment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  routeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'fleet_routes', key: 'id' },
    field: 'route_id'
  },
  vehicleId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'fleet_vehicles', key: 'id' },
    field: 'vehicle_id'
  },
  driverId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'fleet_drivers', key: 'id' },
    field: 'driver_id'
  },
  shipmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'shipment_id'
  },
  scheduledDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'scheduled_date'
  },
  scheduledStartTime: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'scheduled_start_time'
  },
  actualStartTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'actual_start_time'
  },
  actualEndTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'actual_end_time'
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'scheduled',
    comment: 'scheduled, in_progress, completed, cancelled'
  },
  totalDistanceKm: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'total_distance_km'
  },
  fuelConsumedLiters: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'fuel_consumed_liters'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'fleet_route_assignments',
  timestamps: true,
  underscored: true
});

FleetRouteAssignment.associate = function(models) {
  FleetRouteAssignment.belongsTo(models.FleetRoute, {
    foreignKey: 'routeId',
    as: 'route'
  });
  FleetRouteAssignment.belongsTo(models.FleetVehicle, {
    foreignKey: 'vehicleId',
    as: 'vehicle'
  });
  FleetRouteAssignment.belongsTo(models.FleetDriver, {
    foreignKey: 'driverId',
    as: 'driver'
  });
};

module.exports = FleetRouteAssignment;
