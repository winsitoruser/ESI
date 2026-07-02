const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const FleetVehicle = sequelize.define('FleetVehicle', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenantId: { type: DataTypes.STRING(50), allowNull: false, field: 'tenant_id' },
  vehicleNumber: { type: DataTypes.STRING(50), allowNull: true, field: 'vehicle_number' },
  licensePlate: { type: DataTypes.STRING(20), allowNull: false, field: 'license_plate' },
  vehicleType: { type: DataTypes.STRING(50), allowNull: true, field: 'vehicle_type' },
  brand: { type: DataTypes.STRING(100), allowNull: true },
  model: { type: DataTypes.STRING(100), allowNull: true },
  year: { type: DataTypes.INTEGER, allowNull: true },
  color: { type: DataTypes.STRING(30), allowNull: true },
  ownershipType: { type: DataTypes.STRING(30), allowNull: true, field: 'ownership_type' },
  purchaseDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'purchase_date' },
  purchasePrice: { type: DataTypes.DECIMAL(15, 2), allowNull: true, field: 'purchase_price' },
  maxWeightKg: { type: DataTypes.DECIMAL(10, 2), allowNull: true, field: 'max_weight_kg' },
  maxVolumeM3: { type: DataTypes.DECIMAL(10, 2), allowNull: true, field: 'max_volume_m3' },
  fuelTankCapacity: { type: DataTypes.DECIMAL(10, 2), allowNull: true, field: 'fuel_tank_capacity' },
  registrationNumber: { type: DataTypes.STRING(100), allowNull: true, field: 'registration_number' },
  registrationExpiry: { type: DataTypes.DATEONLY, allowNull: true, field: 'registration_expiry' },
  insurancePolicyNumber: { type: DataTypes.STRING(100), allowNull: true, field: 'insurance_policy_number' },
  insuranceProvider: { type: DataTypes.STRING(100), allowNull: true, field: 'insurance_provider' },
  insuranceExpiry: { type: DataTypes.DATEONLY, allowNull: true, field: 'insurance_expiry' },
  status: { type: DataTypes.STRING(20), defaultValue: 'active' },
  currentLocation: { type: DataTypes.STRING(200), allowNull: true, field: 'current_location' },
  currentOdometerKm: { type: DataTypes.INTEGER, defaultValue: 0, field: 'current_odometer_km' },
  lastServiceDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'last_service_date' },
  nextServiceDueKm: { type: DataTypes.INTEGER, allowNull: true, field: 'next_service_due_km' },
  assignedBranchId: { type: DataTypes.STRING(50), allowNull: true, field: 'assigned_branch_id' },
  assignedDriverId: { type: DataTypes.STRING(50), allowNull: true, field: 'assigned_driver_id' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'fleet_vehicles',
  timestamps: true,
  underscored: true
});

module.exports = FleetVehicle;
