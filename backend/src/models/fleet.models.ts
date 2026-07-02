import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class FleetVehicle extends Model {}
FleetVehicle.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: true },
  plate_number: { type: DataTypes.STRING(20), allowNull: false },
  vin: { type: DataTypes.STRING(50), allowNull: true },
  brand: { type: DataTypes.STRING(100), allowNull: true },
  model: { type: DataTypes.STRING(100), allowNull: true },
  year: { type: DataTypes.INTEGER, allowNull: true },
  color: { type: DataTypes.STRING(30), allowNull: true },
  type: { type: DataTypes.ENUM('car', 'truck', 'motorcycle', 'van', 'bus'), defaultValue: 'car' },
  fuel_type: { type: DataTypes.ENUM('gasoline', 'diesel', 'electric', 'hybrid', 'lpg'), defaultValue: 'gasoline' },
  capacity_kg: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  capacity_volume: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  odometer: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.ENUM('active', 'maintenance', 'inactive', 'disposed'), defaultValue: 'active' },
  insurance_expiry: { type: DataTypes.DATEONLY, allowNull: true },
  registration_expiry: { type: DataTypes.DATEONLY, allowNull: true },
  last_service_date: { type: DataTypes.DATEONLY, allowNull: true },
  next_service_date: { type: DataTypes.DATEONLY, allowNull: true },
  photo_url: { type: DataTypes.STRING(500), allowNull: true },
  documents: { type: DataTypes.JSONB, defaultValue: [] },
}, { sequelize, tableName: 'fleet_vehicles', paranoid: true, underscored: true });

export class FleetDriver extends Model {}
FleetDriver.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  license_number: { type: DataTypes.STRING(50), allowNull: true },
  license_type: { type: DataTypes.STRING(10), allowNull: true },
  license_expiry: { type: DataTypes.DATEONLY, allowNull: true },
  assigned_vehicle_id: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.ENUM('available', 'on_duty', 'off_duty', 'leave', 'inactive'), defaultValue: 'available' },
  rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 5.0 },
  total_trips: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_distance_km: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
}, { sequelize, tableName: 'fleet_drivers', paranoid: true, underscored: true });

export class FleetGpsLocation extends Model {}
FleetGpsLocation.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  vehicle_id: { type: DataTypes.INTEGER, allowNull: false },
  latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: false },
  longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: false },
  speed: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0 },
  heading: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  altitude: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
  recorded_at: { type: DataTypes.DATE, allowNull: false },
}, { sequelize, tableName: 'fleet_gps_locations', underscored: true, timestamps: false });

export class FleetMaintenanceSchedule extends Model {}
FleetMaintenanceSchedule.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  vehicle_id: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.ENUM('routine', 'repair', 'inspection', 'emergency'), defaultValue: 'routine' },
  description: { type: DataTypes.TEXT, allowNull: true },
  scheduled_date: { type: DataTypes.DATEONLY, allowNull: false },
  completed_date: { type: DataTypes.DATEONLY, allowNull: true },
  cost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  vendor: { type: DataTypes.STRING(200), allowNull: true },
  status: { type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'), defaultValue: 'scheduled' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, tableName: 'fleet_maintenance_schedules', underscored: true });

export class FleetFuelTransaction extends Model {}
FleetFuelTransaction.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  vehicle_id: { type: DataTypes.INTEGER, allowNull: false },
  driver_id: { type: DataTypes.INTEGER, allowNull: true },
  fuel_type: { type: DataTypes.STRING(30), allowNull: true },
  liters: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  price_per_liter: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  total_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  odometer_reading: { type: DataTypes.INTEGER, allowNull: true },
  station: { type: DataTypes.STRING(200), allowNull: true },
  receipt_url: { type: DataTypes.STRING(500), allowNull: true },
  fueled_at: { type: DataTypes.DATE, allowNull: false },
}, { sequelize, tableName: 'fleet_fuel_transactions', underscored: true });

export class GeofenceLocation extends Model {}
GeofenceLocation.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  type: { type: DataTypes.ENUM('circle', 'polygon'), defaultValue: 'circle' },
  center_lat: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  center_lng: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  radius_meters: { type: DataTypes.INTEGER, allowNull: true },
  polygon: { type: DataTypes.JSONB, allowNull: true },
  alert_on_enter: { type: DataTypes.BOOLEAN, defaultValue: true },
  alert_on_exit: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'geofence_locations', underscored: true });
