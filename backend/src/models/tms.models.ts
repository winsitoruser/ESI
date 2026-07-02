import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class TmsShipment extends Model {}
TmsShipment.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  shipment_no: { type: DataTypes.STRING(50), allowNull: false },
  type: { type: DataTypes.ENUM('inbound', 'outbound', 'transfer', 'return'), defaultValue: 'outbound' },
  origin_branch_id: { type: DataTypes.INTEGER, allowNull: true },
  destination_branch_id: { type: DataTypes.INTEGER, allowNull: true },
  origin_address: { type: DataTypes.TEXT, allowNull: true },
  destination_address: { type: DataTypes.TEXT, allowNull: true },
  customer_id: { type: DataTypes.INTEGER, allowNull: true },
  carrier_id: { type: DataTypes.INTEGER, allowNull: true },
  vehicle_id: { type: DataTypes.INTEGER, allowNull: true },
  driver_id: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.ENUM('draft', 'scheduled', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'returned'), defaultValue: 'draft' },
  weight_kg: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  volume_cbm: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
  total_packages: { type: DataTypes.INTEGER, defaultValue: 0 },
  estimated_delivery: { type: DataTypes.DATE, allowNull: true },
  actual_delivery: { type: DataTypes.DATE, allowNull: true },
  shipping_cost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  insurance_cost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total_cost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tracking_url: { type: DataTypes.STRING(500), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  proof_of_delivery: { type: DataTypes.STRING(500), allowNull: true },
  pod_signed_by: { type: DataTypes.STRING(200), allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'tms_shipments', paranoid: true, underscored: true });

export class TmsCarrier extends Model {}
TmsCarrier.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  code: { type: DataTypes.STRING(20), allowNull: true },
  type: { type: DataTypes.ENUM('internal', 'external', '3pl'), defaultValue: 'external' },
  contact_person: { type: DataTypes.STRING(200), allowNull: true },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  email: { type: DataTypes.STRING(255), allowNull: true },
  rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 5.0 },
  sla_days: { type: DataTypes.INTEGER, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'tms_carriers', underscored: true });

export class TmsRateCard extends Model {}
TmsRateCard.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  carrier_id: { type: DataTypes.INTEGER, allowNull: true },
  origin_zone: { type: DataTypes.STRING(100), allowNull: true },
  destination_zone: { type: DataTypes.STRING(100), allowNull: true },
  service_type: { type: DataTypes.STRING(50), allowNull: true },
  weight_min: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  weight_max: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  rate_per_kg: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  flat_rate: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  min_charge: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  valid_from: { type: DataTypes.DATEONLY, allowNull: true },
  valid_to: { type: DataTypes.DATEONLY, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'tms_rate_cards', underscored: true });

export class TmsTrackingEvent extends Model {}
TmsTrackingEvent.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shipment_id: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING(50), allowNull: false },
  location: { type: DataTypes.STRING(300), allowNull: true },
  latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  recorded_at: { type: DataTypes.DATE, allowNull: false },
  recorded_by: { type: DataTypes.INTEGER, allowNull: true },
}, { sequelize, tableName: 'tms_tracking_events', underscored: true });
