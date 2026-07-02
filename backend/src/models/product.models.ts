import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Category extends Model {}
Category.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  parent_id: { type: DataTypes.INTEGER, allowNull: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  slug: { type: DataTypes.STRING(200), allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  image_url: { type: DataTypes.STRING(500), allowNull: true },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'categories', paranoid: true, underscored: true });

export class Product extends Model {}
Product.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  category_id: { type: DataTypes.INTEGER, allowNull: true },
  sku: { type: DataTypes.STRING(50), allowNull: false },
  barcode: { type: DataTypes.STRING(50), allowNull: true },
  name: { type: DataTypes.STRING(300), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  short_description: { type: DataTypes.STRING(500), allowNull: true },
  type: { type: DataTypes.ENUM('single', 'variant', 'bundle', 'service', 'raw_material'), defaultValue: 'single' },
  unit: { type: DataTypes.STRING(20), defaultValue: 'pcs' },
  base_price: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  selling_price: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  cost_price: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tax_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  tax_inclusive: { type: DataTypes.BOOLEAN, defaultValue: true },
  weight: { type: DataTypes.DECIMAL(10, 3), allowNull: true },
  dimension_l: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  dimension_w: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  dimension_h: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  image_url: { type: DataTypes.STRING(500), allowNull: true },
  images: { type: DataTypes.JSONB, defaultValue: [] },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_pos: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_online: { type: DataTypes.BOOLEAN, defaultValue: false },
  track_stock: { type: DataTypes.BOOLEAN, defaultValue: true },
  min_stock: { type: DataTypes.INTEGER, defaultValue: 0 },
  max_stock: { type: DataTypes.INTEGER, allowNull: true },
  has_variants: { type: DataTypes.BOOLEAN, defaultValue: false },
  has_batch: { type: DataTypes.BOOLEAN, defaultValue: false },
  has_expiry: { type: DataTypes.BOOLEAN, defaultValue: false },
  attributes: { type: DataTypes.JSONB, defaultValue: {} },
}, {
  sequelize, tableName: 'products', paranoid: true, underscored: true,
  indexes: [
    { unique: true, fields: ['tenant_id', 'sku'] },
    { fields: ['tenant_id', 'category_id'] },
    { fields: ['tenant_id', 'barcode'] },
  ],
});

export class ProductVariant extends Model {}
ProductVariant.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  sku: { type: DataTypes.STRING(50), allowNull: false },
  barcode: { type: DataTypes.STRING(50), allowNull: true },
  name: { type: DataTypes.STRING(300), allowNull: false },
  attributes: { type: DataTypes.JSONB, defaultValue: {} },
  price_adjustment: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  cost_adjustment: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  image_url: { type: DataTypes.STRING(500), allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'product_variants', paranoid: true, underscored: true });

export class ProductPrice extends Model {}
ProductPrice.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: true },
  price_type: { type: DataTypes.ENUM('retail', 'wholesale', 'member', 'special'), defaultValue: 'retail' },
  min_qty: { type: DataTypes.INTEGER, defaultValue: 1 },
  price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: true },
  end_date: { type: DataTypes.DATEONLY, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'product_prices', underscored: true });

export class Unit extends Model {}
Unit.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(50), allowNull: false },
  symbol: { type: DataTypes.STRING(10), allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'units', underscored: true });
