const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const FleetDriver = sequelize.define('FleetDriver', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenantId: { type: DataTypes.STRING(50), allowNull: false, field: 'tenant_id' },
  driverNumber: { type: DataTypes.STRING(50), allowNull: true, field: 'driver_number' },
  fullName: { type: DataTypes.STRING(200), allowNull: false, field: 'full_name' },
  phone: { type: DataTypes.STRING(30), allowNull: true },
  email: { type: DataTypes.STRING(100), allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  dateOfBirth: { type: DataTypes.DATEONLY, allowNull: true, field: 'date_of_birth' },
  licenseNumber: { type: DataTypes.STRING(50), allowNull: true, field: 'license_number' },
  licenseType: { type: DataTypes.STRING(20), allowNull: true, field: 'license_type' },
  licenseIssueDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'license_issue_date' },
  licenseExpiryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'license_expiry_date' },
  employmentType: { type: DataTypes.STRING(30), allowNull: true, field: 'employment_type' },
  hireDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'hire_date' },
  assignedBranchId: { type: DataTypes.STRING(50), allowNull: true, field: 'assigned_branch_id' },
  totalDeliveries: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_deliveries' },
  onTimeDeliveries: { type: DataTypes.INTEGER, defaultValue: 0, field: 'on_time_deliveries' },
  totalDistanceKm: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, field: 'total_distance_km' },
  safetyScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 100, field: 'safety_score' },
  customerRating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0, field: 'customer_rating' },
  status: { type: DataTypes.STRING(20), defaultValue: 'active' },
  availabilityStatus: { type: DataTypes.STRING(20), defaultValue: 'available', field: 'availability_status' },
  photoUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'photo_url' },
  licensePhotoUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'license_photo_url' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'fleet_drivers',
  timestamps: true,
  underscored: true
});

module.exports = FleetDriver;
