import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class PosTransaction extends Model {}
PosTransaction.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  transaction_no: { type: DataTypes.STRING(50), allowNull: false },
  shift_id: { type: DataTypes.INTEGER, allowNull: true },
  cashier_id: { type: DataTypes.INTEGER, allowNull: false },
  customer_id: { type: DataTypes.INTEGER, allowNull: true },
  table_id: { type: DataTypes.INTEGER, allowNull: true },
  type: { type: DataTypes.ENUM('sale', 'return', 'void', 'exchange'), defaultValue: 'sale' },
  status: { type: DataTypes.ENUM('draft', 'completed', 'voided', 'held', 'partial'), defaultValue: 'draft' },
  subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discount_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discount_type: { type: DataTypes.ENUM('percentage', 'fixed'), allowNull: true },
  discount_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  service_charge: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  rounding: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  grand_total: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  paid_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  change_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  payment_method: { type: DataTypes.ENUM('cash', 'card', 'qris', 'transfer', 'ewallet', 'multi'), defaultValue: 'cash' },
  payment_details: { type: DataTypes.JSONB, defaultValue: {} },
  notes: { type: DataTypes.TEXT, allowNull: true },
  promo_id: { type: DataTypes.INTEGER, allowNull: true },
  voucher_code: { type: DataTypes.STRING(50), allowNull: true },
  loyalty_points_used: { type: DataTypes.INTEGER, defaultValue: 0 },
  loyalty_points_earned: { type: DataTypes.INTEGER, defaultValue: 0 },
  completed_at: { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize, tableName: 'pos_transactions', paranoid: true, underscored: true,
  indexes: [
    { unique: true, fields: ['tenant_id', 'transaction_no'] },
    { fields: ['tenant_id', 'branch_id', 'created_at'] },
    { fields: ['tenant_id', 'cashier_id'] },
    { fields: ['tenant_id', 'customer_id'] },
  ],
});

export class PosTransactionItem extends Model {}
PosTransactionItem.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  transaction_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  variant_id: { type: DataTypes.INTEGER, allowNull: true },
  sku: { type: DataTypes.STRING(50), allowNull: true },
  name: { type: DataTypes.STRING(300), allowNull: false },
  quantity: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
  unit_price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  cost_price: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discount_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  subtotal: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  notes: { type: DataTypes.TEXT, allowNull: true },
  modifiers: { type: DataTypes.JSONB, defaultValue: [] },
}, { sequelize, tableName: 'pos_transaction_items', underscored: true });

export class Shift extends Model {}
Shift.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  cashier_id: { type: DataTypes.INTEGER, allowNull: false },
  shift_no: { type: DataTypes.STRING(50), allowNull: false },
  status: { type: DataTypes.ENUM('open', 'closed', 'suspended'), defaultValue: 'open' },
  opening_cash: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  closing_cash: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  expected_cash: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  difference: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  total_sales: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total_transactions: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_refunds: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  cash_in: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  cash_out: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  payment_summary: { type: DataTypes.JSONB, defaultValue: {} },
  opened_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  closed_at: { type: DataTypes.DATE, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, tableName: 'shifts', underscored: true });

export class HeldTransaction extends Model {}
HeldTransaction.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  cashier_id: { type: DataTypes.INTEGER, allowNull: false },
  hold_no: { type: DataTypes.STRING(50), allowNull: false },
  customer_id: { type: DataTypes.INTEGER, allowNull: true },
  table_id: { type: DataTypes.INTEGER, allowNull: true },
  items: { type: DataTypes.JSONB, defaultValue: [] },
  subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  notes: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('held', 'resumed', 'cancelled'), defaultValue: 'held' },
}, { sequelize, tableName: 'held_transactions', underscored: true });

export class PrinterConfig extends Model {}
PrinterConfig.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  type: { type: DataTypes.ENUM('receipt', 'kitchen', 'label'), defaultValue: 'receipt' },
  connection_type: { type: DataTypes.ENUM('usb', 'network', 'bluetooth'), defaultValue: 'network' },
  address: { type: DataTypes.STRING(255), allowNull: true },
  settings: { type: DataTypes.JSONB, defaultValue: {} },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'printer_configs', underscored: true });
