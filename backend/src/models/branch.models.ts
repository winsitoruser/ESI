import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Branch extends Model {
  declare id: number;
  declare tenant_id: number;
  declare name: string;
  declare code: string;
  declare type: string;
  declare status: string;
}

Branch.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' } },
  name: { type: DataTypes.STRING(200), allowNull: false },
  code: { type: DataTypes.STRING(20), allowNull: false },
  type: { type: DataTypes.ENUM('main', 'branch', 'warehouse', 'factory'), defaultValue: 'branch' },
  status: { type: DataTypes.ENUM('active', 'inactive', 'pending', 'closed'), defaultValue: 'active' },
  address: { type: DataTypes.TEXT, allowNull: true },
  city: { type: DataTypes.STRING(100), allowNull: true },
  province: { type: DataTypes.STRING(100), allowNull: true },
  postal_code: { type: DataTypes.STRING(10), allowNull: true },
  country: { type: DataTypes.STRING(50), defaultValue: 'Indonesia' },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  email: { type: DataTypes.STRING(255), allowNull: true },
  latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  timezone: { type: DataTypes.STRING(50), defaultValue: 'Asia/Jakarta' },
  operating_hours: { type: DataTypes.JSONB, defaultValue: {} },
  settings: { type: DataTypes.JSONB, defaultValue: {} },
  manager_id: { type: DataTypes.INTEGER, allowNull: true },
}, {
  sequelize, tableName: 'branches', paranoid: true, underscored: true,
  indexes: [{ unique: true, fields: ['tenant_id', 'code'] }],
});

export class BranchModule extends Model {}
BranchModule.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  module_id: { type: DataTypes.INTEGER, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  settings: { type: DataTypes.JSONB, defaultValue: {} },
}, {
  sequelize, tableName: 'branch_modules', underscored: true,
  indexes: [{ unique: true, fields: ['branch_id', 'module_id'] }],
});

export class BranchSetup extends Model {}
BranchSetup.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  step: { type: DataTypes.INTEGER, defaultValue: 1 },
  completed_steps: { type: DataTypes.JSONB, defaultValue: [] },
  is_completed: { type: DataTypes.BOOLEAN, defaultValue: false },
  completed_at: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'branch_setups', underscored: true });
