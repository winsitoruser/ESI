const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaGeofence = sequelize.define('SfaGeofence', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    fenceType: { type: DataTypes.STRING(20), defaultValue: 'circle', field: 'fence_type' },
    centerLat: { type: DataTypes.DECIMAL(10, 7), allowNull: false, field: 'center_lat' },
    centerLng: { type: DataTypes.DECIMAL(10, 7), allowNull: false, field: 'center_lng' },
    radiusMeters: { type: DataTypes.INTEGER, defaultValue: 200, field: 'radius_meters' },
    polygonCoords: { type: DataTypes.JSONB, defaultValue: [], field: 'polygon_coords' },
    referenceType: { type: DataTypes.STRING(30), field: 'reference_type' },
    referenceId: { type: DataTypes.UUID, field: 'reference_id' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    territoryId: { type: DataTypes.UUID, field: 'territory_id' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    alertOnEnter: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'alert_on_enter' },
    alertOnExit: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'alert_on_exit' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'sfa_geofences', timestamps: true, underscored: true });

  SfaGeofence.associate = (models) => {
    SfaGeofence.belongsTo(models.SfaTerritory, { foreignKey: 'territory_id', as: 'territory' });
  };
  return SfaGeofence;
};
