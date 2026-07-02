import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class EprVendor extends Model {}
EprVendor.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  code: { type: DataTypes.STRING(20), allowNull: true },
  type: { type: DataTypes.ENUM('supplier', 'contractor', 'service_provider'), defaultValue: 'supplier' },
  contact_person: { type: DataTypes.STRING(200), allowNull: true },
  email: { type: DataTypes.STRING(255), allowNull: true },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  npwp: { type: DataTypes.STRING(30), allowNull: true },
  bank_name: { type: DataTypes.STRING(100), allowNull: true },
  bank_account: { type: DataTypes.STRING(50), allowNull: true },
  rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0 },
  payment_terms: { type: DataTypes.INTEGER, defaultValue: 30 },
  categories: { type: DataTypes.JSONB, defaultValue: [] },
  documents: { type: DataTypes.JSONB, defaultValue: [] },
  status: { type: DataTypes.ENUM('active', 'inactive', 'blacklisted', 'pending_approval'), defaultValue: 'active' },
}, { sequelize, tableName: 'epr_vendors', paranoid: true, underscored: true });

export class EprProcurementRequest extends Model {}
EprProcurementRequest.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: true },
  request_no: { type: DataTypes.STRING(50), allowNull: false },
  requester_id: { type: DataTypes.INTEGER, allowNull: false },
  department: { type: DataTypes.STRING(100), allowNull: true },
  items: { type: DataTypes.JSONB, defaultValue: [] },
  total_estimated: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'), defaultValue: 'medium' },
  required_date: { type: DataTypes.DATEONLY, allowNull: true },
  justification: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('draft', 'submitted', 'approved', 'rejected', 'processing', 'completed'), defaultValue: 'draft' },
  approved_by: { type: DataTypes.INTEGER, allowNull: true },
  approved_at: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'epr_procurement_requests', paranoid: true, underscored: true });

export class EprRfq extends Model {}
EprRfq.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  rfq_no: { type: DataTypes.STRING(50), allowNull: false },
  procurement_request_id: { type: DataTypes.INTEGER, allowNull: true },
  title: { type: DataTypes.STRING(300), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  items: { type: DataTypes.JSONB, defaultValue: [] },
  vendors: { type: DataTypes.JSONB, defaultValue: [] },
  deadline: { type: DataTypes.DATE, allowNull: true },
  status: { type: DataTypes.ENUM('draft', 'sent', 'evaluating', 'awarded', 'cancelled'), defaultValue: 'draft' },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'epr_rfqs', paranoid: true, underscored: true });

export class EprRfqResponse extends Model {}
EprRfqResponse.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  rfq_id: { type: DataTypes.INTEGER, allowNull: false },
  vendor_id: { type: DataTypes.INTEGER, allowNull: false },
  items: { type: DataTypes.JSONB, defaultValue: [] },
  total_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  delivery_days: { type: DataTypes.INTEGER, allowNull: true },
  payment_terms: { type: DataTypes.STRING(100), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('submitted', 'shortlisted', 'awarded', 'rejected'), defaultValue: 'submitted' },
  submitted_at: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'epr_rfq_responses', underscored: true });

export class EprContract extends Model {}
EprContract.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  contract_no: { type: DataTypes.STRING(50), allowNull: false },
  vendor_id: { type: DataTypes.INTEGER, allowNull: false },
  rfq_id: { type: DataTypes.INTEGER, allowNull: true },
  title: { type: DataTypes.STRING(300), allowNull: false },
  type: { type: DataTypes.ENUM('fixed', 'time_material', 'blanket', 'framework'), defaultValue: 'fixed' },
  value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: false },
  terms: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('draft', 'active', 'expired', 'terminated', 'renewed'), defaultValue: 'draft' },
  document_url: { type: DataTypes.STRING(500), allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'epr_contracts', paranoid: true, underscored: true });
