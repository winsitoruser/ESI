import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class MfgWorkCenter extends Model {}
MfgWorkCenter.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  code: { type: DataTypes.STRING(20), allowNull: false },
  capacity_per_hour: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  cost_per_hour: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'mfg_work_centers', underscored: true });

export class MfgBom extends Model {}
MfgBom.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  version: { type: DataTypes.INTEGER, defaultValue: 1 },
  output_qty: { type: DataTypes.DECIMAL(10, 3), defaultValue: 1 },
  total_cost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, tableName: 'mfg_boms', underscored: true });

export class MfgBomItem extends Model {}
MfgBomItem.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  bom_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
  unit: { type: DataTypes.STRING(20), allowNull: true },
  cost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  waste_percentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  is_optional: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { sequelize, tableName: 'mfg_bom_items', underscored: true });

export class MfgRouting extends Model {}
MfgRouting.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  version: { type: DataTypes.INTEGER, defaultValue: 1 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'mfg_routings', underscored: true });

export class MfgRoutingOperation extends Model {}
MfgRoutingOperation.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  routing_id: { type: DataTypes.INTEGER, allowNull: false },
  work_center_id: { type: DataTypes.INTEGER, allowNull: true },
  sequence: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  setup_time_min: { type: DataTypes.INTEGER, defaultValue: 0 },
  run_time_min: { type: DataTypes.INTEGER, defaultValue: 0 },
  cost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
}, { sequelize, tableName: 'mfg_routing_operations', underscored: true });

export class MfgWorkOrder extends Model {}
MfgWorkOrder.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: true },
  wo_number: { type: DataTypes.STRING(50), allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  bom_id: { type: DataTypes.INTEGER, allowNull: true },
  routing_id: { type: DataTypes.INTEGER, allowNull: true },
  planned_qty: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
  produced_qty: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
  rejected_qty: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
  status: { type: DataTypes.ENUM('draft', 'confirmed', 'in_progress', 'completed', 'cancelled'), defaultValue: 'draft' },
  priority: { type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'), defaultValue: 'normal' },
  planned_start: { type: DataTypes.DATE, allowNull: true },
  planned_end: { type: DataTypes.DATE, allowNull: true },
  actual_start: { type: DataTypes.DATE, allowNull: true },
  actual_end: { type: DataTypes.DATE, allowNull: true },
  total_cost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  notes: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'mfg_work_orders', paranoid: true, underscored: true });

export class MfgQcTemplate extends Model {}
MfgQcTemplate.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: true },
  checkpoints: { type: DataTypes.JSONB, defaultValue: [] },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'mfg_qc_templates', underscored: true });

export class MfgQcInspection extends Model {}
MfgQcInspection.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  work_order_id: { type: DataTypes.INTEGER, allowNull: false },
  template_id: { type: DataTypes.INTEGER, allowNull: true },
  inspection_no: { type: DataTypes.STRING(50), allowNull: false },
  sample_size: { type: DataTypes.INTEGER, defaultValue: 1 },
  passed_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  failed_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  results: { type: DataTypes.JSONB, defaultValue: [] },
  status: { type: DataTypes.ENUM('pending', 'in_progress', 'passed', 'failed', 'conditional'), defaultValue: 'pending' },
  inspector_id: { type: DataTypes.INTEGER, allowNull: true },
  inspected_at: { type: DataTypes.DATE, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, tableName: 'mfg_qc_inspections', underscored: true });

export class MfgProductionPlan extends Model {}
MfgProductionPlan.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  period_start: { type: DataTypes.DATEONLY, allowNull: false },
  period_end: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('draft', 'approved', 'in_progress', 'completed'), defaultValue: 'draft' },
  items: { type: DataTypes.JSONB, defaultValue: [] },
  notes: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'mfg_production_plans', underscored: true });

export class MfgWasteRecord extends Model {}
MfgWasteRecord.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  work_order_id: { type: DataTypes.INTEGER, allowNull: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
  unit: { type: DataTypes.STRING(20), allowNull: true },
  reason: { type: DataTypes.TEXT, allowNull: true },
  cost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  recorded_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'mfg_waste_records', underscored: true });
