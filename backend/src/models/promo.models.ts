import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Promo extends Model {}
Promo.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  code: { type: DataTypes.STRING(50), allowNull: true },
  type: { type: DataTypes.ENUM('discount', 'bogo', 'bundle', 'free_item', 'cashback', 'min_purchase'), defaultValue: 'discount' },
  discount_type: { type: DataTypes.ENUM('percentage', 'fixed'), defaultValue: 'percentage' },
  discount_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  max_discount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  min_purchase: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  min_qty: { type: DataTypes.INTEGER, defaultValue: 1 },
  max_usage: { type: DataTypes.INTEGER, allowNull: true },
  usage_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  max_usage_per_customer: { type: DataTypes.INTEGER, allowNull: true },
  start_date: { type: DataTypes.DATE, allowNull: false },
  end_date: { type: DataTypes.DATE, allowNull: false },
  applicable_branches: { type: DataTypes.JSONB, defaultValue: [] },
  applicable_days: { type: DataTypes.JSONB, defaultValue: [] },
  applicable_hours: { type: DataTypes.JSONB, defaultValue: {} },
  conditions: { type: DataTypes.JSONB, defaultValue: {} },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_combinable: { type: DataTypes.BOOLEAN, defaultValue: false },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
}, { sequelize, tableName: 'promos', paranoid: true, underscored: true });

export class PromoProduct extends Model {}
PromoProduct.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  promo_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  variant_id: { type: DataTypes.INTEGER, allowNull: true },
  special_price: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  free_qty: { type: DataTypes.INTEGER, allowNull: true },
}, { sequelize, tableName: 'promo_products', underscored: true });

export class PromoCategory extends Model {}
PromoCategory.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  promo_id: { type: DataTypes.INTEGER, allowNull: false },
  category_id: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'promo_categories', underscored: true });

export class Voucher extends Model {}
Voucher.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  code: { type: DataTypes.STRING(50), allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  type: { type: DataTypes.ENUM('percentage', 'fixed', 'free_shipping'), defaultValue: 'percentage' },
  value: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  max_discount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  min_purchase: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  max_usage: { type: DataTypes.INTEGER, allowNull: true },
  usage_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  start_date: { type: DataTypes.DATE, allowNull: false },
  end_date: { type: DataTypes.DATE, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
}, { sequelize, tableName: 'vouchers', paranoid: true, underscored: true });
