import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Supplier extends Model {}
Supplier.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  code: { type: DataTypes.STRING(20), allowNull: true },
  contact_person: { type: DataTypes.STRING(100), allowNull: true },
  email: { type: DataTypes.STRING(255), allowNull: true },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  city: { type: DataTypes.STRING(100), allowNull: true },
  npwp: { type: DataTypes.STRING(30), allowNull: true },
  bank_name: { type: DataTypes.STRING(100), allowNull: true },
  bank_account: { type: DataTypes.STRING(50), allowNull: true },
  payment_terms: { type: DataTypes.INTEGER, defaultValue: 30 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'suppliers', paranoid: true, underscored: true });

export class PurchaseOrder extends Model {}
PurchaseOrder.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  supplier_id: { type: DataTypes.INTEGER, allowNull: false },
  po_number: { type: DataTypes.STRING(50), allowNull: false },
  status: { type: DataTypes.ENUM('draft', 'submitted', 'approved', 'partial', 'received', 'cancelled'), defaultValue: 'draft' },
  order_date: { type: DataTypes.DATEONLY, allowNull: false },
  expected_date: { type: DataTypes.DATEONLY, allowNull: true },
  subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discount_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  shipping_cost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  grand_total: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  notes: { type: DataTypes.TEXT, allowNull: true },
  approved_by: { type: DataTypes.INTEGER, allowNull: true },
  approved_at: { type: DataTypes.DATE, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'purchase_orders', paranoid: true, underscored: true });

export class PurchaseOrderItem extends Model {}
PurchaseOrderItem.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  purchase_order_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  variant_id: { type: DataTypes.INTEGER, allowNull: true },
  quantity: { type: DataTypes.DECIMAL(15, 3), allowNull: false },
  received_qty: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 },
  unit_price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  discount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tax_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  subtotal: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
}, { sequelize, tableName: 'purchase_order_items', underscored: true });

export class GoodsReceipt extends Model {}
GoodsReceipt.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  purchase_order_id: { type: DataTypes.INTEGER, allowNull: true },
  receipt_no: { type: DataTypes.STRING(50), allowNull: false },
  supplier_id: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('draft', 'checked', 'completed'), defaultValue: 'draft' },
  received_date: { type: DataTypes.DATEONLY, allowNull: false },
  warehouse_id: { type: DataTypes.INTEGER, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'goods_receipts', paranoid: true, underscored: true });

export class GoodsReceiptItem extends Model {}
GoodsReceiptItem.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  goods_receipt_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  variant_id: { type: DataTypes.INTEGER, allowNull: true },
  ordered_qty: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 },
  received_qty: { type: DataTypes.DECIMAL(15, 3), allowNull: false },
  rejected_qty: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 },
  unit_price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  batch_no: { type: DataTypes.STRING(50), allowNull: true },
  expiry_date: { type: DataTypes.DATEONLY, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, tableName: 'goods_receipt_items', underscored: true });
