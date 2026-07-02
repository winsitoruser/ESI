import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class EximShipment extends Model {}
EximShipment.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  shipment_no: { type: DataTypes.STRING(50), allowNull: false },
  type: { type: DataTypes.ENUM('export', 'import'), allowNull: false },
  partner_id: { type: DataTypes.INTEGER, allowNull: true },
  origin_country: { type: DataTypes.STRING(100), allowNull: true },
  destination_country: { type: DataTypes.STRING(100), allowNull: true },
  origin_port: { type: DataTypes.STRING(100), allowNull: true },
  destination_port: { type: DataTypes.STRING(100), allowNull: true },
  incoterm: { type: DataTypes.STRING(10), allowNull: true },
  transport_mode: { type: DataTypes.ENUM('sea', 'air', 'land', 'multimodal'), defaultValue: 'sea' },
  total_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  currency: { type: DataTypes.STRING(3), defaultValue: 'USD' },
  status: { type: DataTypes.ENUM('draft', 'booking', 'shipped', 'in_transit', 'customs', 'cleared', 'delivered', 'cancelled'), defaultValue: 'draft' },
  etd: { type: DataTypes.DATE, allowNull: true },
  eta: { type: DataTypes.DATE, allowNull: true },
  actual_departure: { type: DataTypes.DATE, allowNull: true },
  actual_arrival: { type: DataTypes.DATE, allowNull: true },
  bl_number: { type: DataTypes.STRING(50), allowNull: true },
  invoice_no: { type: DataTypes.STRING(50), allowNull: true },
  packing_list: { type: DataTypes.JSONB, defaultValue: [] },
  notes: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'exim_shipments', paranoid: true, underscored: true });

export class EximContainer extends Model {}
EximContainer.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shipment_id: { type: DataTypes.INTEGER, allowNull: false },
  container_no: { type: DataTypes.STRING(20), allowNull: false },
  type: { type: DataTypes.STRING(10), allowNull: true },
  seal_no: { type: DataTypes.STRING(30), allowNull: true },
  weight_kg: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  volume_cbm: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
  status: { type: DataTypes.STRING(30), defaultValue: 'loaded' },
}, { sequelize, tableName: 'exim_containers', underscored: true });

export class EximCustoms extends Model {}
EximCustoms.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shipment_id: { type: DataTypes.INTEGER, allowNull: false },
  declaration_no: { type: DataTypes.STRING(50), allowNull: true },
  declaration_type: { type: DataTypes.STRING(30), allowNull: true },
  hs_codes: { type: DataTypes.JSONB, defaultValue: [] },
  duty_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('pending', 'submitted', 'inspected', 'cleared', 'held'), defaultValue: 'pending' },
  submitted_at: { type: DataTypes.DATE, allowNull: true },
  cleared_at: { type: DataTypes.DATE, allowNull: true },
  documents: { type: DataTypes.JSONB, defaultValue: [] },
}, { sequelize, tableName: 'exim_customs', underscored: true });

export class EximLC extends Model {}
EximLC.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  shipment_id: { type: DataTypes.INTEGER, allowNull: true },
  lc_number: { type: DataTypes.STRING(50), allowNull: false },
  type: { type: DataTypes.ENUM('irrevocable', 'revocable', 'confirmed', 'standby'), defaultValue: 'irrevocable' },
  issuing_bank: { type: DataTypes.STRING(200), allowNull: true },
  advising_bank: { type: DataTypes.STRING(200), allowNull: true },
  beneficiary: { type: DataTypes.STRING(200), allowNull: true },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  currency: { type: DataTypes.STRING(3), defaultValue: 'USD' },
  issue_date: { type: DataTypes.DATEONLY, allowNull: true },
  expiry_date: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.ENUM('draft', 'issued', 'amended', 'utilized', 'expired', 'cancelled'), defaultValue: 'draft' },
}, { sequelize, tableName: 'exim_lcs', underscored: true });

export class EximPartner extends Model {}
EximPartner.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  type: { type: DataTypes.ENUM('buyer', 'seller', 'freight_forwarder', 'customs_broker', 'bank'), defaultValue: 'buyer' },
  country: { type: DataTypes.STRING(100), allowNull: true },
  contact_person: { type: DataTypes.STRING(200), allowNull: true },
  email: { type: DataTypes.STRING(255), allowNull: true },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'exim_partners', underscored: true });

export class EximDocument extends Model {}
EximDocument.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shipment_id: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.STRING(50), allowNull: false },
  name: { type: DataTypes.STRING(300), allowNull: false },
  file_url: { type: DataTypes.STRING(500), allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'uploaded', 'verified', 'rejected'), defaultValue: 'pending' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  uploaded_by: { type: DataTypes.INTEGER, allowNull: true },
}, { sequelize, tableName: 'exim_documents', underscored: true });
