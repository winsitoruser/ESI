import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Asset extends Model {}
Asset.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: true },
  asset_no: { type: DataTypes.STRING(50), allowNull: false },
  name: { type: DataTypes.STRING(300), allowNull: false },
  category_id: { type: DataTypes.INTEGER, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  serial_number: { type: DataTypes.STRING(100), allowNull: true },
  acquisition_date: { type: DataTypes.DATEONLY, allowNull: true },
  acquisition_cost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  useful_life_months: { type: DataTypes.INTEGER, allowNull: true },
  salvage_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  depreciation_method: { type: DataTypes.ENUM('straight_line', 'declining_balance', 'sum_of_years'), defaultValue: 'straight_line' },
  current_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  accumulated_depreciation: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('active', 'maintenance', 'disposed', 'transferred', 'lost'), defaultValue: 'active' },
  location: { type: DataTypes.STRING(200), allowNull: true },
  assigned_to: { type: DataTypes.INTEGER, allowNull: true },
  warranty_expiry: { type: DataTypes.DATEONLY, allowNull: true },
  photo_url: { type: DataTypes.STRING(500), allowNull: true },
  documents: { type: DataTypes.JSONB, defaultValue: [] },
  custom_fields: { type: DataTypes.JSONB, defaultValue: {} },
}, { sequelize, tableName: 'assets', paranoid: true, underscored: true });

export class AssetCategory extends Model {}
AssetCategory.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  parent_id: { type: DataTypes.INTEGER, allowNull: true },
  depreciation_method: { type: DataTypes.STRING(30), allowNull: true },
  useful_life_months: { type: DataTypes.INTEGER, allowNull: true },
  account_id: { type: DataTypes.INTEGER, allowNull: true },
}, { sequelize, tableName: 'asset_categories', underscored: true });

export class AssetMovement extends Model {}
AssetMovement.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  asset_id: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.ENUM('transfer', 'assign', 'return', 'dispose', 'maintenance'), allowNull: false },
  from_branch_id: { type: DataTypes.INTEGER, allowNull: true },
  to_branch_id: { type: DataTypes.INTEGER, allowNull: true },
  from_employee_id: { type: DataTypes.INTEGER, allowNull: true },
  to_employee_id: { type: DataTypes.INTEGER, allowNull: true },
  reason: { type: DataTypes.TEXT, allowNull: true },
  effective_date: { type: DataTypes.DATEONLY, allowNull: false },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'asset_movements', underscored: true });

export class AssetMaintenanceSchedule extends Model {}
AssetMaintenanceSchedule.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  asset_id: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.ENUM('preventive', 'corrective', 'inspection'), defaultValue: 'preventive' },
  description: { type: DataTypes.TEXT, allowNull: true },
  frequency: { type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'once'), defaultValue: 'monthly' },
  scheduled_date: { type: DataTypes.DATEONLY, allowNull: false },
  completed_date: { type: DataTypes.DATEONLY, allowNull: true },
  cost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  vendor: { type: DataTypes.STRING(200), allowNull: true },
  status: { type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'overdue', 'cancelled'), defaultValue: 'scheduled' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, tableName: 'asset_maintenance_schedules', underscored: true });
