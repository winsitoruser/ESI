const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const FleetDeliveryProof = sequelize.define('FleetDeliveryProof', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  assignmentId: { type: DataTypes.UUID, allowNull: true, field: 'assignment_id' },
  driverId: { type: DataTypes.UUID, allowNull: true, field: 'driver_id' },
  vehicleId: { type: DataTypes.UUID, allowNull: true, field: 'vehicle_id' },
  stopIndex: { type: DataTypes.INTEGER, allowNull: true, field: 'stop_index' },
  recipientName: { type: DataTypes.STRING(150), allowNull: false, field: 'recipient_name' },
  recipientPhone: { type: DataTypes.STRING(30), allowNull: true, field: 'recipient_phone' },
  recipientRole: { type: DataTypes.STRING(80), allowNull: true, field: 'recipient_role' },
  referenceNumber: { type: DataTypes.STRING(80), allowNull: true, field: 'reference_number' },
  signatureData: { type: DataTypes.TEXT, allowNull: true, field: 'signature_data' },
  photos: { type: DataTypes.JSONB, allowNull: true },
  itemsDelivered: { type: DataTypes.JSONB, allowNull: true, field: 'items_delivered' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'delivered' },
  deliveredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'delivered_at' },
  latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'fleet_delivery_proofs',
  timestamps: true,
  underscored: true,
});

FleetDeliveryProof.associate = function (models) {
  if (models.FleetDriver) FleetDeliveryProof.belongsTo(models.FleetDriver, { foreignKey: 'driverId', as: 'driver' });
  if (models.FleetVehicle) FleetDeliveryProof.belongsTo(models.FleetVehicle, { foreignKey: 'vehicleId', as: 'vehicle' });
  if (models.FleetRouteAssignment) FleetDeliveryProof.belongsTo(models.FleetRouteAssignment, { foreignKey: 'assignmentId', as: 'assignment' });
};

module.exports = FleetDeliveryProof;
