import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Warehouse extends Model {}
Warehouse.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  code: { type: DataTypes.STRING(20), allowNull: false },
  type: { type: DataTypes.ENUM('main', 'transit', 'return', 'production'), defaultValue: 'main' },
  address: { type: DataTypes.TEXT, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'warehouses', paranoid: true, underscored: true });

export class Location extends Model {}
Location.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  code: { type: DataTypes.STRING(20), allowNull: false },
  zone: { type: DataTypes.STRING(50), allowNull: true },
  rack: { type: DataTypes.STRING(50), allowNull: true },
  shelf: { type: DataTypes.STRING(50), allowNull: true },
  bin: { type: DataTypes.STRING(50), allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'locations', underscored: true });

export class Stock extends Model {}
Stock.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  variant_id: { type: DataTypes.INTEGER, allowNull: true },
  warehouse_id: { type: DataTypes.INTEGER, allowNull: true },
  location_id: { type: DataTypes.INTEGER, allowNull: true },
  quantity: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 },
  reserved_qty: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 },
  available_qty: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 },
  batch_no: { type: DataTypes.STRING(50), allowNull: true },
  expiry_date: { type: DataTypes.DATEONLY, allowNull: true },
  cost_price: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
}, {
  sequelize, tableName: 'stocks', underscored: true,
  indexes: [
    { fields: ['tenant_id', 'branch_id', 'product_id'] },
    { fields: ['tenant_id', 'warehouse_id', 'product_id'] },
  ],
});

export class StockMovement extends Model {}
StockMovement.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  variant_id: { type: DataTypes.INTEGER, allowNull: true },
  type: { type: DataTypes.ENUM('in', 'out', 'transfer', 'adjustment', 'production', 'return', 'waste', 'opname'), allowNull: false },
  source_type: { type: DataTypes.STRING(50), allowNull: true },
  source_id: { type: DataTypes.INTEGER, allowNull: true },
  from_warehouse_id: { type: DataTypes.INTEGER, allowNull: true },
  to_warehouse_id: { type: DataTypes.INTEGER, allowNull: true },
  quantity: { type: DataTypes.DECIMAL(15, 3), allowNull: false },
  before_qty: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 },
  after_qty: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 },
  cost_price: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  reference_no: { type: DataTypes.STRING(50), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
}, { sequelize, tableName: 'stock_movements', underscored: true });

export class StockAdjustment extends Model {}
StockAdjustment.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  adjustment_no: { type: DataTypes.STRING(50), allowNull: false },
  type: { type: DataTypes.ENUM('addition', 'deduction', 'damage', 'expired', 'correction'), allowNull: false },
  status: { type: DataTypes.ENUM('draft', 'approved', 'rejected', 'completed'), defaultValue: 'draft' },
  reason: { type: DataTypes.TEXT, allowNull: true },
  approved_by: { type: DataTypes.INTEGER, allowNull: true },
  approved_at: { type: DataTypes.DATE, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'stock_adjustments', paranoid: true, underscored: true });

export class StockAdjustmentItem extends Model {}
StockAdjustmentItem.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  adjustment_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  variant_id: { type: DataTypes.INTEGER, allowNull: true },
  current_qty: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 },
  adjusted_qty: { type: DataTypes.DECIMAL(15, 3), allowNull: false },
  difference: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 },
  cost_price: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  reason: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, tableName: 'stock_adjustment_items', underscored: true });

export class StockOpname extends Model {}
StockOpname.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  opname_no: { type: DataTypes.STRING(50), allowNull: false },
  warehouse_id: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.ENUM('draft', 'counting', 'review', 'approved', 'completed'), defaultValue: 'draft' },
  category_id: { type: DataTypes.INTEGER, allowNull: true },
  started_at: { type: DataTypes.DATE, allowNull: true },
  completed_at: { type: DataTypes.DATE, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
  approved_by: { type: DataTypes.INTEGER, allowNull: true },
}, { sequelize, tableName: 'stock_opnames', paranoid: true, underscored: true });

export class StockOpnameItem extends Model {}
StockOpnameItem.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  opname_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  variant_id: { type: DataTypes.INTEGER, allowNull: true },
  system_qty: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 },
  actual_qty: { type: DataTypes.DECIMAL(15, 3), allowNull: true },
  difference: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 },
  cost_price: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  loss_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  notes: { type: DataTypes.TEXT, allowNull: true },
  counted_by: { type: DataTypes.INTEGER, allowNull: true },
  counted_at: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'stock_opname_items', underscored: true });
