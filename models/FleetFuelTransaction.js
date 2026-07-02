const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const FleetFuelTransaction = sequelize.define('FleetFuelTransaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenantId: { type: DataTypes.STRING(50), allowNull: false, field: 'tenant_id' },
  vehicleId: { type: DataTypes.STRING(50), allowNull: false, field: 'vehicle_id' },
  driverId: { type: DataTypes.STRING(50), allowNull: true, field: 'driver_id' },
  transactionType: { type: DataTypes.STRING(30), defaultValue: 'refill', field: 'transaction_type' },
  transactionDate: { type: DataTypes.DATE, allowNull: true, field: 'transaction_date' },
  fuelStation: { type: DataTypes.STRING(200), allowNull: true, field: 'fuel_station' },
  fuelType: { type: DataTypes.STRING(30), allowNull: true, field: 'fuel_type' },
  quantityLiters: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'quantity_liters' },
  pricePerLiter: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'price_per_liter' },
  totalCost: { type: DataTypes.DECIMAL(15, 2), allowNull: false, field: 'total_cost' },
  odometerReading: { type: DataTypes.INTEGER, allowNull: true, field: 'odometer_reading' },
  paymentMethod: { type: DataTypes.STRING(30), allowNull: true, field: 'payment_method' },
  receiptNumber: { type: DataTypes.STRING(100), allowNull: true, field: 'receipt_number' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'fleet_fuel_transactions',
  timestamps: true,
  underscored: true
});

module.exports = FleetFuelTransaction;
