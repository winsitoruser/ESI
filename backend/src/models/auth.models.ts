import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

// ===================== TENANT =====================
export class Tenant extends Model {
  declare id: number;
  declare name: string;
  declare slug: string;
  declare business_type_id: number;
  declare status: string;
  declare subscription_plan: string;
  declare max_branches: number;
  declare max_users: number;
  declare settings: object;
  declare logo_url: string;
  declare domain: string;
  declare onboarding_completed: boolean;
}

Tenant.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  slug: { type: DataTypes.STRING(200), allowNull: false, unique: true },
  business_type_id: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.ENUM('active', 'suspended', 'trial', 'cancelled'), defaultValue: 'trial' },
  subscription_plan: { type: DataTypes.STRING(50), defaultValue: 'free' },
  max_branches: { type: DataTypes.INTEGER, defaultValue: 1 },
  max_users: { type: DataTypes.INTEGER, defaultValue: 5 },
  settings: { type: DataTypes.JSONB, defaultValue: {} },
  logo_url: { type: DataTypes.STRING(500), allowNull: true },
  domain: { type: DataTypes.STRING(255), allowNull: true },
  onboarding_completed: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { sequelize, tableName: 'tenants', paranoid: true, underscored: true });

// ===================== USER =====================
export class User extends Model {
  declare id: number;
  declare tenant_id: number;
  declare branch_id: number;
  declare email: string;
  declare password_hash: string;
  declare name: string;
  declare phone: string;
  declare role: string;
  declare avatar_url: string;
  declare is_active: boolean;
  declare last_login: Date;
  declare refresh_token: string;
}

User.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' } },
  branch_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'branches', key: 'id' } },
  email: { type: DataTypes.STRING(255), allowNull: false },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  role: { type: DataTypes.ENUM('super_admin', 'admin', 'manager', 'cashier', 'staff', 'driver', 'warehouse', 'finance'), defaultValue: 'staff' },
  avatar_url: { type: DataTypes.STRING(500), allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  last_login: { type: DataTypes.DATE, allowNull: true },
  refresh_token: { type: DataTypes.TEXT, allowNull: true },
}, {
  sequelize, tableName: 'users', paranoid: true, underscored: true,
  indexes: [
    { unique: true, fields: ['tenant_id', 'email'] },
  ],
});

// ===================== ROLE =====================
export class Role extends Model {
  declare id: number;
  declare tenant_id: number;
  declare name: string;
  declare permissions: object;
  declare is_system: boolean;
}

Role.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  permissions: { type: DataTypes.JSONB, defaultValue: {} },
  is_system: { type: DataTypes.BOOLEAN, defaultValue: false },
  description: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, tableName: 'roles', paranoid: true, underscored: true });

// ===================== BUSINESS TYPE =====================
export class BusinessType extends Model {
  declare id: number;
  declare name: string;
  declare slug: string;
  declare description: string;
  declare default_modules: object;
  declare icon: string;
}

BusinessType.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  default_modules: { type: DataTypes.JSONB, defaultValue: [] },
  icon: { type: DataTypes.STRING(50), allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'business_types', underscored: true });

// ===================== MODULE =====================
export class Module extends Model {
  declare id: number;
  declare code: string;
  declare name: string;
  declare category: string;
}

Module.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  category: { type: DataTypes.STRING(50), allowNull: true },
  is_core: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  dependencies: { type: DataTypes.JSONB, defaultValue: [] },
  settings_schema: { type: DataTypes.JSONB, defaultValue: {} },
}, { sequelize, tableName: 'modules', underscored: true });

// ===================== TENANT MODULE =====================
export class TenantModule extends Model {}
TenantModule.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  module_id: { type: DataTypes.INTEGER, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  activated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  settings: { type: DataTypes.JSONB, defaultValue: {} },
}, {
  sequelize, tableName: 'tenant_modules', underscored: true,
  indexes: [{ unique: true, fields: ['tenant_id', 'module_id'] }],
});
