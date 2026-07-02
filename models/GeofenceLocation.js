'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const GeofenceLocation = sequelize.define('GeofenceLocation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'tenant_id'
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  locationType: {
    type: DataTypes.STRING(30),
    defaultValue: 'office',
    field: 'location_type'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: false
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: false
  },
  radiusMeters: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
    field: 'radius_meters'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'branch_id'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  polygonCoords: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'polygon_coords'
  }
}, {
  tableName: 'geofence_locations',
  timestamps: true,
  underscored: true
});

module.exports = GeofenceLocation;
