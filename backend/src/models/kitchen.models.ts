import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class KitchenOrder extends Model {}
KitchenOrder.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  transaction_id: { type: DataTypes.INTEGER, allowNull: true },
  order_no: { type: DataTypes.STRING(50), allowNull: false },
  table_id: { type: DataTypes.INTEGER, allowNull: true },
  station: { type: DataTypes.STRING(50), allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'preparing', 'ready', 'served', 'cancelled'), defaultValue: 'pending' },
  priority: { type: DataTypes.ENUM('normal', 'rush', 'vip'), defaultValue: 'normal' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  estimated_time: { type: DataTypes.INTEGER, allowNull: true },
  started_at: { type: DataTypes.DATE, allowNull: true },
  completed_at: { type: DataTypes.DATE, allowNull: true },
  served_at: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'kitchen_orders', underscored: true });

export class KitchenOrderItem extends Model {}
KitchenOrderItem.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  kitchen_order_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  variant_id: { type: DataTypes.INTEGER, allowNull: true },
  name: { type: DataTypes.STRING(300), allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'preparing', 'ready', 'cancelled'), defaultValue: 'pending' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  modifiers: { type: DataTypes.JSONB, defaultValue: [] },
}, { sequelize, tableName: 'kitchen_order_items', underscored: true });

export class KitchenRecipe extends Model {}
KitchenRecipe.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(300), allowNull: false },
  instructions: { type: DataTypes.TEXT, allowNull: true },
  prep_time: { type: DataTypes.INTEGER, allowNull: true },
  cook_time: { type: DataTypes.INTEGER, allowNull: true },
  serving_size: { type: DataTypes.INTEGER, defaultValue: 1 },
  cost_per_serving: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'kitchen_recipes', paranoid: true, underscored: true });

export class KitchenRecipeIngredient extends Model {}
KitchenRecipeIngredient.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  recipe_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
  unit: { type: DataTypes.STRING(20), allowNull: true },
  cost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  is_optional: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { sequelize, tableName: 'kitchen_recipe_ingredients', underscored: true });

export class KitchenInventoryItem extends Model {}
KitchenInventoryItem.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  current_stock: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 },
  min_stock: { type: DataTypes.DECIMAL(15, 3), defaultValue: 0 },
  max_stock: { type: DataTypes.DECIMAL(15, 3), allowNull: true },
  unit: { type: DataTypes.STRING(20), allowNull: true },
  last_restocked_at: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'kitchen_inventory_items', underscored: true });

export class KitchenSettings extends Model {}
KitchenSettings.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  stations: { type: DataTypes.JSONB, defaultValue: [] },
  display_settings: { type: DataTypes.JSONB, defaultValue: {} },
  notification_settings: { type: DataTypes.JSONB, defaultValue: {} },
  auto_accept: { type: DataTypes.BOOLEAN, defaultValue: false },
  alert_threshold_minutes: { type: DataTypes.INTEGER, defaultValue: 15 },
}, { sequelize, tableName: 'kitchen_settings', underscored: true });
