const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const FleetDriverExpense = sequelize.define('FleetDriverExpense', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: true, field: 'tenant_id' },
  assignmentId: { type: DataTypes.UUID, allowNull: true, field: 'assignment_id' },
  driverId: { type: DataTypes.UUID, allowNull: true, field: 'driver_id' },
  vehicleId: { type: DataTypes.UUID, allowNull: true, field: 'vehicle_id' },
  expenseDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW, field: 'expense_date' },
  category: { type: DataTypes.STRING(30), allowNull: false },
  description: { type: DataTypes.STRING(255), allowNull: true },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'IDR' },
  receiptNumber: { type: DataTypes.STRING(80), allowNull: true, field: 'receipt_number' },
  receiptPhotoUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'receipt_photo_url' },
  paymentMethod: { type: DataTypes.STRING(30), allowNull: true, field: 'payment_method' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'submitted' },
  approvedBy: { type: DataTypes.UUID, allowNull: true, field: 'approved_by' },
  approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
  rejectionReason: { type: DataTypes.STRING(255), allowNull: true, field: 'rejection_reason' },
  latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'fleet_driver_expenses',
  timestamps: true,
  underscored: true,
});

FleetDriverExpense.associate = function (models) {
  if (models.FleetDriver) FleetDriverExpense.belongsTo(models.FleetDriver, { foreignKey: 'driverId', as: 'driver' });
  if (models.FleetVehicle) FleetDriverExpense.belongsTo(models.FleetVehicle, { foreignKey: 'vehicleId', as: 'vehicle' });
  if (models.FleetRouteAssignment) FleetDriverExpense.belongsTo(models.FleetRouteAssignment, { foreignKey: 'assignmentId', as: 'assignment' });
};

module.exports = FleetDriverExpense;
